// src/context/FirebaseContext.js
import React, { createContext, useContext } from "react";
import { app, auth, db, functions } from "../firebase/config"; // Import the initialized services

// Create the context
const FirebaseContext = createContext();

// Custom hook to easily consume the context
export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error("useFirebase must be used within a FirebaseProvider");
  }
  return context;
};

// Provider component to wrap your application or parts of it
export const FirebaseProvider = ({ children }) => {
  // The value provided by the context will be an object containing all Firebase instances
  const value = {
    app, // The main Firebase app instance
    auth, // Firebase Authentication instance
    db, // Firestore database instance
    functions, // Firebase Cloud Functions instance
  };

  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  );
};
