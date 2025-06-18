// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK ONLY ONCE in the main index.js
admin.initializeApp();

// Export each function from its respective module
exports.placeBet = require("./src/bets").placeBet;
exports.settleBet = require("./src/bets").settleBet;
exports.updateMatchScoreAndStatus =
  require("./src/matches").updateMatchScoreAndStatus;
exports.createUserProfile = require("./src/users").createUserProfile;

// You can also export groups of functions if you prefer a namespace:
// exports.bets = require('./src/bets'); // Then callable would be functions.bets.placeBet
// However, direct export as above makes the callable names cleaner.
