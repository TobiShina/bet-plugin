// src/components/Auth/AuthProvider.js
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../../firebase/config";
import { onAuthStateChanged, signOut } from "firebase/auth"; // Modular SDK functions

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe; // Cleanup subscription on unmount
  }, []);

  const logout = () => {
    return signOut(auth);
  };

  const value = {
    currentUser,
    loading,
    logout,
    // You can add other auth methods here like login, signup if not handled directly in pages
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}{" "}
      {/* Only render children once auth state is determined */}
    </AuthContext.Provider>
  );
};
