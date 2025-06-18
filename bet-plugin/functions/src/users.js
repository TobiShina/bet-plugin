// functions/src/users.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const db = admin.firestore(); // Get the Firestore database reference

// --- createUserProfile Cloud Function (Firestore Trigger) ---
// This function triggers when a new document is created in the 'users' collection.
exports.createUserProfile = functions.firestore
  .document("users/{userId}") // This specifies the collection and wildcard for the document ID
  .onCreate(async (snap, context) => {
    const newUser = snap.data(); // Data of the newly created user document
    const userId = snap.id; // The document ID of the new user

    functions.logger.log(
      "New user document created in Firestore:",
      userId,
      newUser
    );

    // Initialize a 'balance' here if it's not already set
    if (newUser.balance === undefined || newUser.balance === null) {
      await snap.ref.set({ balance: 0 }, { merge: true }); // Use merge: true to avoid overwriting existing fields
      functions.logger.log(`Initialized balance for user ${userId}`);
    }

    // You might also want to add a 'createdAt' timestamp
    if (!newUser.createdAt) {
      await snap.ref.set(
        { createdAt: admin.firestore.FieldValue.serverTimestamp() },
        { merge: true }
      );
    }

    return null; // Important: Background functions should return a Promise or null/undefined
  });
