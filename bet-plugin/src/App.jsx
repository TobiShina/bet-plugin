import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { FirebaseProvider } from "./context/FirebaseContext";
import { AuthProvider, useAuth } from "./components/Auth/AuthProvider";
import HomePage from "./screens/HomePage/HomePage";
import LoginPage from "./components/Auth/LoginPage/LoginPage"; // This is now Admin Login
// Removed SignupPage import - no public signup in plugin

import AdminMatchInputPage from "./screens/AdminMatchInputPage/AdminMatchInputPage";
import styles from "./App.module.css";

// A simple PrivateRoute component to protect routes
const PrivateRoute = ({ children, adminOnly = false }) => {
  const { currentUser, loading } = useAuth(); // currentUser from Firebase Auth

  if (loading) {
    return (
      <div className={styles.loadingOverlay}>Loading authentication...</div>
    );
  }

  // If a public user lands on a protected route, they should be redirected to the host's login
  // or simply denied access. For this plugin, we assume public users are authenticated
  // by the host, and we only manage admin auth internally.
  // If currentUser is null, and it's not the admin login route:
  if (!currentUser) {
    // If it's an admin-only route and no admin is logged in, redirect to admin login
    if (adminOnly) {
      return <Navigate to="/login" replace />;
    }
    // For other routes (like Home, Profile, Deposit for general users),
    // we assume the host site provides user context or they aren't accessible without host login.
    // For now, we'll redirect them to admin login if they hit a protected route unauthenticated.
    // In a real plugin, this would be a redirect to the host's login or a message.
    console.warn(
      "Attempted access to protected route without authentication. Redirecting to admin login for demo."
    );
    return <Navigate to="/login" replace />; // Redirect to admin login for demonstration
  }

  // Admin role check: IMPORTANT to implement robustly
  // This is a basic example. In a real app, fetch user's custom claims or a role from Firestore.
  const ADMIN_EMAILS = ["adesinaanu@gmail.com", "olumadej@gmail.com"]; // Must match LoginPage
  const isAdmin = currentUser && ADMIN_EMAILS.includes(currentUser.email);

  if (adminOnly && !isAdmin) {
    console.warn(
      `User ${currentUser.email} attempted to access admin route without admin privileges.`
    );
    return <Navigate to="/" replace />; // Redirect non-admins away from admin section
  }

  return children;
};

const App = () => {
  return (
    <FirebaseProvider>
      <AuthProvider>
        <Router>
          <div className={styles.pluginContainer}>
            <header className={styles.header}>
              <h1 className={styles.title}>Bet Plugin</h1>
              <nav className={styles.nav}>
                <Link to="/" className={styles.navLink}>
                  Home
                </Link>
                <AuthStatusAndLinks />
              </nav>
            </header>

            <main className={styles.content}>
              <Routes>
                {/* Admin-specific Login Page */}
                <Route path="/login" element={<LoginPage />} />
                {/* No public signup route here */}
                {/* Public-facing routes (assuming user context from host or minimal functionality if not logged in) */}
                <Route path="/" element={<HomePage />} />{" "}
                {/* Home page might show matches to everyone */}
                {/* User-specific protected routes (if your plugin handles user profiles/deposits independently) */}
                {/* If the host company handles all user profiles, deposits, withdrawals, these might be removed or adapted */}
                {/* Admin-only protected route */}
                <Route
                  path="/admin"
                  element={
                    <PrivateRoute adminOnly={true}>
                      <AdminMatchInputPage />
                    </PrivateRoute>
                  }
                />
                {/* Fallback for unknown routes */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>

            <footer className={styles.footer}>
              <p>&copy; 2025 eGamesBet Plugin</p>
            </footer>
          </div>
        </Router>
      </AuthProvider>
    </FirebaseProvider>
  );
};

const AuthStatusAndLinks = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true }); // Redirect to admin login after logout
  };

  const ADMIN_EMAILS = ["adesinaanu@gmail.com", "olumadej@gmail.com"];
  const isAdmin = currentUser && ADMIN_EMAILS.includes(currentUser.email);

  return (
    <div className={styles.authStatus}>
      {currentUser ? (
        <>
          <span className={styles.loggedInAs}>
            Logged in as: {currentUser.email}
            {isAdmin && " (Admin)"} {/* Indicate admin status */}
          </span>
          {/* Public user profile/deposit links would go here, IF your plugin manages them.
              Otherwise, these would be removed to avoid duplication with host site.
              For now, keeping them as placeholders if the plugin offers independent profile mgmt.
          */}

          {isAdmin && (
            <Link to="/admin" className={styles.navLink}>
              Admin Panel
            </Link>
          )}
          <button onClick={handleLogout} className={styles.logoutButton}>
            Logout
          </button>
        </>
      ) : (
        <>
          {/* Only link to admin login, not public signup/login */}
          <Link to="/login" className={styles.navLink}>
            Admin Login
          </Link>
        </>
      )}
    </div>
  );
};

export default App;
