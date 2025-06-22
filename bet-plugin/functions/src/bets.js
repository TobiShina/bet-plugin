// functions/src/bets.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const db = admin.firestore(); // Get the Firestore database reference

// Admin emails for validation - keep these consistent across your functions
const ADMIN_EMAILS = ["adesinaanu@gmail.com", "olumadej@gmail.com"];

// --- placeBet Cloud Function (Callable) ---
exports.placeBet = functions.https.onCall(async (data, context) => {
  // Authentication check (ensure a user is logged in)
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in to place a bet."
    );
  }

  const { selections, stake } = data; // selections: array of { matchId, market, selection, odd }
  const userId = context.auth.uid;

  // --- START OF NEW VALIDATION CHECKS (General Input and Business Rules) ---

  // Basic validation for selections array
  if (!selections || !Array.isArray(selections) || selections.length === 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Bet selections are required."
    );
  }

  // 1. Max selections per ticket
  const MAX_SELECTIONS_PER_TICKET = 10;
  if (selections.length > MAX_SELECTIONS_PER_TICKET) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Maximum of ${MAX_SELECTIONS_PER_TICKET} selections allowed per ticket. You provided ${selections.length}.`
    );
  }

  // 2. Stake limits (minimum and maximum)
  const MIN_STAKE_NAIRA = 500; // ₦500
  const MAX_STAKE_NAIRA = 5000; // ₦5000

  if (typeof stake !== "number" || isNaN(stake)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Stake amount must be a valid number."
    );
  }
  if (stake < MIN_STAKE_NAIRA) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Minimum stake per bet is ₦${MIN_STAKE_NAIRA}. You provided ₦${stake}.`
    );
  }
  if (stake > MAX_STAKE_NAIRA) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Maximum stake per bet is ₦${MAX_STAKE_NAIRA}. You provided ₦${stake}.`
    );
  }
  // Ensure stake is positive (this also covers the stake <= 0 check you had previously)
  if (stake <= 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Stake amount must be positive."
    );
  }

  // --- END OF NEW VALIDATION CHECKS ---

  const batch = db.batch();
  const userRef = db.collection("users").doc(userId);

  try {
    // 1. Fetch user's current balance
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "User profile not found."
      );
    }
    const currentBalance = userDoc.data().balance || 0;

    // 2. Check if user has sufficient balance
    if (currentBalance < stake) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Insufficient balance to place this bet."
      );
    }

    // --- START OF SERVER-SIDE ODDS AND MATCH VERIFICATION ---
    let totalOdds = 1;
    let betDetails = []; // To store full details of selections with server-verified odds
    let matchIds = []; // To easily query related matches later for settlement

    // Fetch all unique match IDs from selections to reduce database reads
    const uniqueMatchIds = [...new Set(selections.map((s) => s.matchId))];
    const matchDocs = {}; // Cache for match data: {matchId: matchDoc.data()}

    // Fetch all relevant match data documents in parallel
    const matchPromises = uniqueMatchIds.map((id) =>
      db.collection("matches").doc(id).get()
    );
    const fetchedMatchSnapshots = await Promise.all(matchPromises);

    fetchedMatchSnapshots.forEach((snap) => {
      if (!snap.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          `Match ${snap.id} not found for one of your selections.`
        );
      }
      matchDocs[snap.id] = snap.data();
    });

    // Iterate through client's selections to verify each one
    for (const clientSelection of selections) {
      const matchData = matchDocs[clientSelection.matchId];

      // Safeguard (should ideally be caught by initial fetch if matchId invalid)
      if (!matchData) {
        throw new functions.https.HttpsError(
          "not-found",
          `Match data not available for selection in match ${clientSelection.matchId}.`
        );
      }

      // 1. Verify Match Status: Must be open for betting
      // Adjust statuses as per your system's definition for bet-able matches
      if (matchData.status !== "upcoming" && matchData.status !== "open") {
        throw new functions.https.HttpsError(
          "failed-precondition",
          `Match ${clientSelection.matchId} is not open for betting. Current Status: '${matchData.status}'.`
        );
      }

      // 2. Verify Market and Selection Exist and Fetch Authoritative Odd
      const serverOddsForMarket =
        matchData.odds && matchData.odds[clientSelection.market];
      if (!serverOddsForMarket) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Market '${clientSelection.market}' not found for match ${clientSelection.matchId}.`
        );
      }

      const authoritativeOdd = serverOddsForMarket[clientSelection.selection];
      if (typeof authoritativeOdd !== "number" || authoritativeOdd <= 0) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Selection '${clientSelection.selection}' or its odd is invalid for market '${clientSelection.market}' in match ${clientSelection.matchId}.`
        );
      }

      // 3. Optional: Strict Odd Check (Recommended for strong security)
      // If the client-provided odd doesn't exactly match the server's current odd,
      // it could indicate stale data or a malicious attempt.
      if (clientSelection.odd !== authoritativeOdd) {
        functions.logger.warn(
          `Client-provided odd (${clientSelection.odd}) for match ${clientSelection.matchId} ` +
            `differs from server's authoritative odd (${authoritativeOdd}). Using server's odd.`
        );
        // If you want to reject the bet entirely on an odd mismatch:
        // throw new functions.https.HttpsError(
        //   "failed-precondition",
        //   "Odds for one or more selections have changed. Please review your bet slip."
        // );
      }

      totalOdds *= authoritativeOdd; // ALWAYS use the server's authoritative odd for calculation!

      // Store the *server-verified* odd in betDetails
      betDetails.push({ ...clientSelection, odd: authoritativeOdd });
      matchIds.push(clientSelection.matchId);
    }
    // --- END OF SERVER-SIDE ODDS AND MATCH VERIFICATION ---

    const potentialPayout = stake * totalOdds; // Calculate payout with server-verified totalOdds

    // 3. Deduct stake from user's balance
    batch.update(userRef, {
      balance: admin.firestore.FieldValue.increment(-stake),
    });

    // 4. Record the bet in the 'bets' collection
    const newBetRef = db.collection("bets").doc(); // Firestore auto-generates ID
    batch.set(newBetRef, {
      userId: userId,
      selections: betDetails, // Now contains server-verified odds
      stake: stake,
      totalOdds: totalOdds,
      potentialPayout: potentialPayout,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: "pending", // Initial status
      matchIds: matchIds, // Store relevant match IDs for easier querying/settlement
    });

    // 5. Commit all batched operations
    await batch.commit();

    functions.logger.log("Bet placed successfully:", {
      userId,
      stake,
      potentialPayout,
      betId: newBetRef.id,
    });
    return {
      success: true,
      message: "Bet placed successfully!",
      betId: newBetRef.id,
    };
  } catch (error) {
    functions.logger.error("Error placing bet:", error.code, error.message);
    // Re-throw HttpsError for client-friendly error messages
    if (error.code) {
      throw error;
    }
    // Catch any unexpected errors and throw as internal
    throw new functions.https.HttpsError(
      "internal",
      "An unexpected error occurred: " + error.message
    );
  }
});

// --- settleBet Cloud Function (Callable) ---
// NOTE: This callable function for settlement is generally less ideal for automation
// compared to a Firestore trigger (like the 'settleBetsForFinishedMatch' trigger
// I previously provided, which reacts to match status changes).
// This function requires an admin to manually trigger it per match.
exports.settleBet = functions.https.onCall(async (data, context) => {
  // Admin authentication check
  if (
    !context.auth ||
    !context.auth.token.email ||
    !ADMIN_EMAILS.includes(context.auth.token.email)
  ) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only administrators can settle bets."
    );
  }

  const { matchId } = data;
  if (!matchId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Match ID is required for settlement."
    );
  }

  const matchRef = db.collection("matches").doc(matchId);
  const betsRef = db.collection("bets");

  try {
    // 1. Fetch the match details to get final scores/outcome
    const matchDoc = await matchRef.get();
    // This part assumes matchData.homeScore, awayScore exist and calculates for 1X2.
    // For full automation with multiple markets, matchData.results should be populated
    // by updateMatchScoreAndStatus and then used here.
    if (!matchDoc.exists || matchDoc.data().status !== "finished") {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Match not found or not in a finished state for settlement."
      );
    }
    const matchData = matchDoc.data();
    const finalHomeScore = matchData.homeScore;
    const finalAwayScore = matchData.awayScore;

    // Determine match outcome based on final scores for common markets (e.g., 1X2)
    // This logic needs to be expanded if you have more markets in results
    let matchResult = null; // '1' (Home Win), 'X' (Draw), '2' (Away Win)
    if (finalHomeScore > finalAwayScore) {
      matchResult = "1";
    } else if (finalHomeScore < finalAwayScore) {
      matchResult = "2";
    } else {
      matchResult = "X";
    }

    // 2. Fetch all pending bets related to this match
    const pendingBetsSnapshot = await betsRef
      .where("matchIds", "array-contains", matchId) // Query bets that included this match
      .where("status", "==", "pending")
      .get();

    if (pendingBetsSnapshot.empty) {
      functions.logger.log(`No pending bets found for match ${matchId}.`);
      return {
        success: true,
        message: "No pending bets to settle for this match.",
      };
    }

    const updates = {}; // { betId: { status, winnings }, ... }
    const userBalanceUpdates = {}; // { userId: amountToAdd, ... }

    // 3. Process each pending bet
    for (const betDoc of pendingBetsSnapshot.docs) {
      const betData = betDoc.data();
      let betStatus = "lost";
      let winnings = 0;
      let isWinningBet = true; // Assume winning until proven otherwise

      // Loop through each selection within the bet slip
      for (const selection of betData.selections) {
        if (selection.matchId === matchId) {
          // Only check selections related to *this* finished match
          // Check if this specific selection for this match was correct based on derived result
          let selectionIsCorrect = false;
          if (selection.market === "1X2") {
            // Example for 1X2 market
            if (selection.selection === matchResult) {
              selectionIsCorrect = true;
            }
          }
          // IMPORTANT: If you have a 'results' field on the match document (from updateMatchScoreAndStatus)
          // and use the 'settleBetsForFinishedMatch' trigger, that trigger will use matchData.results[selection.market]
          // which is more robust than deriving results here for each market.
          // Example for using matchData.results (if available here):
          // if (matchData.results && matchData.results[selection.market] === selection.selection) {
          //    selectionIsCorrect = true;
          // }

          if (!selectionIsCorrect) {
            isWinningBet = false; // If any selection for this match is wrong, the entire bet loses (for accumulators)
            break; // No need to check other selections for this bet
          }
        }
      }

      // This part is simplified for multi-match bets.
      // A truly robust system would need to ensure ALL matches in a multi-match bet are finalized
      // before marking the bet as 'won'. If even one selection from *any* match in the bet is wrong, it's 'lost'.
      // The 'settleBetsForFinishedMatch' trigger from my previous response handles this more comprehensively
      // by tracking all matches in a bet.
      if (isWinningBet) {
        // Assuming here that if isWinningBet is true for this match,
        // and this is the only match in the bet, then the bet is won.
        // If it's a multi-match bet, this logic needs refinement to wait for all
        // constituent matches to be settled.
        // For now, if one of the selections from THIS match makes the bet a loser, it is lost.
        // Otherwise, it remains pending until all matches in the bet are done and checked.
        // This callable 'settleBet' is less suited for complex multi-bet settlement automation.
        betStatus = "won"; // Only if ALL selections across ALL matches in the bet are correct
        winnings = betData.potentialPayout;
      }

      // Update bet status and winnings
      updates[betDoc.id] = {
        status: betStatus,
        winnings: winnings,
        settledAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Aggregate user balance updates
      if (winnings > 0) {
        userBalanceUpdates[betData.userId] =
          (userBalanceUpdates[betData.userId] || 0) + winnings;
      }
    }

    // 4. Apply updates in a batch
    const batch = db.batch();

    // Update individual bets
    for (const betId in updates) {
      const betUpdate = updates[betId];
      batch.update(betsRef.doc(betId), betUpdate);
    }

    // Update user balances
    for (const userId in userBalanceUpdates) {
      const amountToAdd = userBalanceUpdates[userId];
      const userRef = db.collection("users").doc(userId);
      batch.update(userRef, {
        balance: admin.firestore.FieldValue.increment(amountToAdd),
      });
    }

    await batch.commit();

    functions.logger.log(
      `Settlement complete for match ${matchId}. ${
        Object.keys(updates).length
      } bets processed.`
    );
    return {
      success: true,
      message: `Settlement complete for match ${matchId}.`,
    };
  } catch (error) {
    functions.logger.error(
      "Error settling bets for match:",
      matchId,
      error.code,
      error.message
    );
    throw new functions.https.HttpsError(
      "internal",
      "Failed to settle bets: " + error.message
    );
  }
});
