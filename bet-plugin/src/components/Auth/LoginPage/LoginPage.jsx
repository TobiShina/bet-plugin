import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // Removed Link to Signup
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore"; // Import Firestore for role check
import { auth, db } from "../../../firebase/config";
import { useAuth } from "../AuthProvider"; // To get current user state
import styles from "./LoginPage.module.css";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth(); // We need logout if an unauthorized user attempts to login

  // If *any* user is already logged in (even a general one from the host if they tried),
  // and they land on /login, we should log them out first or redirect.
  // For admin-specific login, it's safer to ensure it's truly an admin session.
  // We'll rely on the PrivateRoute to ensure general users don't access /admin.
  // This page is explicitly for an admin to login.

  const ADMIN_EMAILS = ["admin@yourdomain.com", "provider@yourdomain.com"]; // Replace with your actual admin emails

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // --- Admin Role Check (CRITICAL) ---
      // Method 1: Check against hardcoded emails (simplest for this example, but less flexible)
      if (!ADMIN_EMAILS.includes(user.email)) {
        await logout(); // Log out the unauthorized user immediately
        setError("Access Denied: Only administrators can log in here.");
        setLoading(false);
        return;
      }

      // Method 2 (More robust): Check role from Firestore user document
      // You'd need a 'users' collection where each user doc has a 'role' field.
      /*
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists() || userDocSnap.data().role !== 'admin') {
        await logout();
        setError('Access Denied: Only administrators can log in here.');
        setLoading(false);
        return;
      }
      */
      // --- END Admin Role Check ---

      alert("Admin login successful!");
      navigate("/admin", { replace: true }); // Navigate directly to the admin section
    } catch (err) {
      console.error("Login error:", err.code, err.message);
      switch (err.code) {
        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential":
          setError("Invalid admin email or password.");
          break;
        case "auth/invalid-email":
          setError("Please enter a valid email address.");
          break;
        case "auth/too-many-requests":
          setError("Too many failed login attempts. Please try again later.");
          break;
        default:
          setError("Failed to log in. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <h2 className={styles.title}>Admin Login</h2>
      <form onSubmit={handleSubmit} className={styles.loginForm}>
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.inputGroup}>
          <label htmlFor="email" className={styles.label}>
            Admin Email:
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.inputField}
            placeholder="Enter admin email"
            required
            autoComplete="email"
          />
        </div>
        <div className={styles.inputGroup}>
          <label htmlFor="password" className={styles.label}>
            Password:
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.inputField}
            placeholder="Enter admin password"
            required
            autoComplete="current-password"
          />
        </div>
        <button
          type="submit"
          className={styles.submitButton}
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
      {/* Removed "Don't have an account?" link */}
    </div>
  );
};

export default LoginPage;
