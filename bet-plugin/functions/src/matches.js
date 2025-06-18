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
