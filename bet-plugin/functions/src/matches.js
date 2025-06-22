// functions/src/matches.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const db = admin.firestore(); // Get the Firestore database reference

// Admin emails for validation - keep these consistent across your functions
const ADMIN_EMAILS = ["adesinaanu@gmail.com", "olumadej@gmail.com"];

// --- updateMatchScoreAndStatus Cloud Function (Callable) ---
exports.updateMatchScoreAndStatus = functions.https.onCall(
  async (data, context) => {
    // Admin authentication check
    if (
      !context.auth ||
      !context.auth.token.email ||
      !ADMIN_EMAILS.includes(context.auth.token.email)
    ) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only administrators can update match details."
      );
    }

    const { matchId, homeScore, awayScore, status } = data; // status: 'finished', 'cancelled', etc.

    if (
      !matchId ||
      typeof homeScore === "undefined" ||
      typeof awayScore === "undefined" ||
      !status
    ) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Match ID, scores, and status are required."
      );
    }

    try {
      const matchRef = db.collection("matches").doc(matchId);
      await matchRef.update({
        homeScore: homeScore,
        awayScore: awayScore,
        status: status,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      });

      functions.logger.log(
        `Match ${matchId} updated: scores ${homeScore}-${awayScore}, status ${status}`
      );
      return {
        success: true,
        message: "Match score and status updated successfully!",
      };
    } catch (error) {
      functions.logger.error(
        "Error updating match details:",
        error.code,
        error.message
      );
      throw new functions.https.HttpsError(
        "internal",
        "Failed to update match: " + error.message
      );
    }
  }
);

// --- getMatches Cloud Function (Callable) ---
// Allows the host UI to fetch match data with optional filters
exports.getMatches = functions.https.onCall(async (data, context) => {
  // Optional: You might want to add authentication here if only logged-in users can view matches.
  // if (!context.auth) {
  //   throw new functions.https.HttpsError(
  //     "unauthenticated",
  //     "You must be logged in to view matches."
  //   );
  // }

  const { status, sport, limit = 100 } = data || {}; // Default limit to 100

  let matchesRef = db.collection("matches");

  if (status) {
    matchesRef = matchesRef.where("status", "==", status);
  }
  if (sport) {
    matchesRef = matchesRef.where("sport", "==", sport);
  }

  // Add ordering, e.g., by match date/time for upcoming matches
  matchesRef = matchesRef.orderBy("matchDateTime", "asc"); // Assuming you have this field

  // Limit the number of results
  matchesRef = matchesRef.limit(limit);

  try {
    const snapshot = await matchesRef.get();
    const matches = [];
    snapshot.forEach((doc) => {
      matches.push({ id: doc.id, ...doc.data() });
    });

    functions.logger.log("Fetched matches:", {
      query: data,
      count: matches.length,
    });
    return { success: true, matches: matches };
  } catch (error) {
    functions.logger.error("Error fetching matches:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to retrieve match data."
    );
  }
});
