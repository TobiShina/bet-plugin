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

  if (!selections || !Array.isArray(selections) || selections.length === 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Bet selections are required."
    );
  }
  if (typeof stake !== "number" || stake <= 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "A valid stake amount is required."
    );
  }

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

    // 3. Deduct stake from user's balance
    batch.update(userRef, {
      balance: admin.firestore.FieldValue.increment(-stake),
    });

    // 4. Calculate total odds and potential payout
    let totalOdds = 1;
    let betDetails = []; // To store full details of selections
    let matchIds = []; // To easily query related matches later if needed

    for (const selection of selections) {
      if (typeof selection.odd !== "number" || selection.odd <= 0) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Invalid odd found in selections."
        );
      }
      totalOdds *= selection.odd;
      betDetails.push(selection); // Store the full selection object
      matchIds.push(selection.matchId);
    }

    const potentialPayout = stake * totalOdds;

    // 5. Record the bet in the 'bets' collection
    const newBetRef = db.collection("bets").doc(); // Firestore auto-generates ID
    batch.set(newBetRef, {
      userId: userId,
      selections: betDetails, // Store array of selection objects
      stake: stake,
      totalOdds: totalOdds,
      potentialPayout: potentialPayout,
      timestamp: admin.firestore.FieldValue.serverTimestamp(), // Use server timestamp
      status: "pending", // Initial status
      matchIds: matchIds, // Store relevant match IDs for easier querying/settlement
    });

    // 6. Commit all batched operations
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
    if (error.code) {
      throw error; // Re-throw HttpsError
    }
    throw new functions.https.HttpsError(
      "internal",
      "An unexpected error occurred: " + error.message
    );
  }
});

// --- settleBet Cloud Function (Callable) ---
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
          // Check if this specific selection for this match was correct
          let selectionIsCorrect = false;
          if (selection.market === "1X2") {
            if (selection.selection === matchResult) {
              selectionIsCorrect = true;
            }
          }
          // Add more market logic here (e.g., Over/Under, Both Teams to Score etc.)
          // if (selection.market.startsWith('O/U')) {
          //    const totalGoals = finalHomeScore + finalAwayScore;
          //    const threshold = parseFloat(selection.market.split(' ')[1]);
          //    if (selection.selection === 'Over' && totalGoals > threshold) selectionIsCorrect = true;
          //    if (selection.selection === 'Under' && totalGoals < threshold) selectionIsCorrect = true;
          // }

          if (!selectionIsCorrect) {
            isWinningBet = false; // If any selection for this match is wrong, the entire bet loses (for accumulators)
            break; // No need to check other selections for this match if one is wrong
          }
        }
      }

      // If all selections in the bet were correct for this match, it's a winning bet
      if (isWinningBet) {
        betStatus = "won";
        winnings = betData.potentialPayout;
      }

      // Update bet status and winnings
      updates[betDoc.id] = { status: betStatus, winnings: winnings };

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
