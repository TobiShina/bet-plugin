// src/screens/AdminMatchInputPage/AdminMatchInputPage.js
import React, { useState } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import styles from "./AdminMatchInputPage.module.css";

const AdminMatchInputPage = () => {
  // State for adding new match
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [league, setLeague] = useState("");
  const [matchDate, setMatchDate] = useState(""); // Store as string for input
  const [matchTime, setMatchTime] = useState(""); // Store as string for input

  const [homeWinOdd, setHomeWinOdd] = useState("");
  const [drawOdd, setDrawOdd] = useState("");
  const [awayWinOdd, setAwayWinOdd] = useState("");
  const [homeOver5_5, setHomeOver5_5] = useState("");
  const [homeOver6_5, setHomeOver6_5] = useState("");
  const [homeOver7_5, setHomeOver7_5] = useState("");
  const [awayOver5_5, setAwayOver5_5] = useState("");
  const [awayOver6_5, setAwayOver6_5] = useState("");
  const [awayOver7_5, setAwayOver7_5] = useState("");
  const [totalOver10_5, setTotalOver10_5] = useState("");
  const [totalOver11_5, setTotalOver11_5] = useState("");
  const [totalOver12_5, setTotalOver12_5] = useState("");
  const [totalUnder10_5, setTotalUnder10_5] = useState("");
  const [totalUnder11_5, setTotalUnder11_5] = useState("");
  const [totalUnder12_5, setTotalUnder12_5] = useState("");

  // State for updating match result
  const [matchIdForResults, setMatchIdForResults] = useState("");
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");

  const clearAddMatchForm = () => {
    setHomeTeam("");
    setAwayTeam("");
    setLeague("");
    setMatchDate("");
    setMatchTime("");
    setHomeWinOdd("");
    setDrawOdd("");
    setAwayWinOdd("");
    setHomeOver5_5("");
    setHomeOver6_5("");
    setHomeOver7_5("");
    setAwayOver5_5("");
    setAwayOver6_5("");
    setAwayOver7_5("");
    setTotalOver10_5("");
    setTotalOver11_5("");
    setTotalOver12_5("");
    setTotalUnder10_5("");
    setTotalUnder11_5("");
    setTotalUnder12_5("");
  };

  const handleAddMatch = async (e) => {
    e.preventDefault();
    try {
      const fullMatchDateTime = new Date(`${matchDate}T${matchTime}:00`);
      if (isNaN(fullMatchDateTime.getTime())) {
        alert("Invalid date or time format.");
        return;
      }

      await addDoc(collection(db, "matches"), {
        homeTeam,
        awayTeam,
        league,
        matchDate: Timestamp.fromDate(fullMatchDateTime),
        startTime: Timestamp.fromDate(fullMatchDateTime), // Using same for simplicity
        status: "upcoming",
        homeScore: null,
        awayScore: null,
        odds: {
          straightWin: {
            homeWin: parseFloat(homeWinOdd),
            draw: parseFloat(drawOdd),
            awayWin: parseFloat(awayWinOdd),
          },
          homeGoals: {
            over5_5: parseFloat(homeOver5_5),
            over6_5: parseFloat(homeOver6_5),
            over7_5: parseFloat(homeOver7_5),
          },
          awayGoals: {
            over5_5: parseFloat(awayOver5_5),
            over6_5: parseFloat(awayOver6_5),
            over7_5: parseFloat(awayOver7_5),
          },
          totalGoals: {
            over10_5: parseFloat(totalOver10_5),
            over11_5: parseFloat(totalOver11_5),
            over12_5: parseFloat(totalOver12_5),
            under10_5: parseFloat(totalUnder10_5),
            under11_5: parseFloat(totalUnder11_5),
            under12_5: parseFloat(totalUnder12_5),
          },
        },
      });
      alert("Match added successfully!");
      clearAddMatchForm();
    } catch (error) {
      console.error("Error adding match:", error);
      alert("Error: " + error.message);
    }
  };

  const handleUpdateMatchResult = async (e) => {
    e.preventDefault();
    if (!matchIdForResults) {
      alert("Please enter a Match ID to update results.");
      return;
    }
    try {
      const matchDocRef = doc(db, "matches", matchIdForResults);
      await updateDoc(matchDocRef, {
        homeScore: parseInt(homeScore),
        awayScore: parseInt(awayScore),
        status: "finished",
      });
      alert("Match results updated! Bets will be settled by Cloud Function.");
      setMatchIdForResults("");
      setHomeScore("");
      setAwayScore("");
    } catch (error) {
      console.error("Error updating match result:", error);
      alert("Error: " + error.message);
    }
  };

  return (
    <div className={styles.adminContainer}>
      <h2 className={styles.adminTitle}>Admin - Match Management</h2>

      <div className={styles.sectionCard}>
        <h3 className={styles.sectionTitle}>Add New Match</h3>
        <form onSubmit={handleAddMatch}>
          <input
            className={styles.inputField}
            type="text"
            placeholder="Home Team"
            value={homeTeam}
            onChange={(e) => setHomeTeam(e.target.value)}
            required
          />
          <input
            className={styles.inputField}
            type="text"
            placeholder="Away Team"
            value={awayTeam}
            onChange={(e) => setAwayTeam(e.target.value)}
            required
          />
          <input
            className={styles.inputField}
            type="text"
            placeholder="League"
            value={league}
            onChange={(e) => setLeague(e.target.value)}
            required
          />
          <input
            className={styles.inputField}
            type="date"
            value={matchDate}
            onChange={(e) => setMatchDate(e.target.value)}
            required
          />
          <input
            className={styles.inputField}
            type="time"
            value={matchTime}
            onChange={(e) => setMatchTime(e.target.value)}
            required
          />

          <h4 className={styles.subSectionTitle}>Odds Input</h4>
          <input
            className={styles.inputField}
            type="number"
            step="0.01"
            placeholder="Home Win Odd"
            value={homeWinOdd}
            onChange={(e) => setHomeWinOdd(e.target.value)}
            required
          />
          <input
            className={styles.inputField}
            type="number"
            step="0.01"
            placeholder="Draw Odd"
            value={drawOdd}
            onChange={(e) => setDrawOdd(e.target.value)}
            required
          />
          <input
            className={styles.inputField}
            type="number"
            step="0.01"
            placeholder="Away Win Odd"
            value={awayWinOdd}
            onChange={(e) => setAwayWinOdd(e.target.value)}
            required
          />

          <h4 className={styles.subSectionTitle}>Home Goals Odds (Over)</h4>
          <input
            className={styles.inputField}
            type="number"
            step="0.01"
            placeholder="O 5.5 Home Goals"
            value={homeOver5_5}
            onChange={(e) => setHomeOver5_5(e.target.value)}
            required
          />
          <input
            className={styles.inputField}
            type="number"
            step="0.01"
            placeholder="O 6.5 Home Goals"
            value={homeOver6_5}
            onChange={(e) => setHomeOver6_5(e.target.value)}
            required
          />
          <input
            className={styles.inputField}
            type="number"
            step="0.01"
            placeholder="O 7.5 Home Goals"
            value={homeOver7_5}
            onChange={(e) => setHomeOver7_5(e.target.value)}
            required
          />

          <h4 className={styles.subSectionTitle}>Away Goals Odds (Over)</h4>
          <input
            className={styles.inputField}
            type="number"
            step="0.01"
            placeholder="O 5.5 Away Goals"
            value={awayOver5_5}
            onChange={(e) => setAwayOver5_5(e.target.value)}
            required
          />
          <input
            className={styles.inputField}
            type="number"
            step="0.01"
            placeholder="O 6.5 Away Goals"
            value={awayOver6_5}
            onChange={(e) => setAwayOver6_5(e.target.value)}
            required
          />
          <input
            className={styles.inputField}
            type="number"
            step="0.01"
            placeholder="O 7.5 Away Goals"
            value={awayOver7_5}
            onChange={(e) => setAwayOver7_5(e.target.value)}
            required
          />

          <h4 className={styles.subSectionTitle}>Total Goals Odds (Over)</h4>
          <input
            className={styles.inputField}
            type="number"
            step="0.01"
            placeholder="O 10.5 Total Goals"
            value={totalOver10_5}
            onChange={(e) => setTotalOver10_5(e.target.value)}
            required
          />
          <input
            className={styles.inputField}
            type="number"
            step="0.01"
            placeholder="O 11.5 Total Goals"
            value={totalOver11_5}
            onChange={(e) => setTotalOver11_5(e.target.value)}
            required
          />
          <input
            className={styles.inputField}
            type="number"
            step="0.01"
            placeholder="O 12.5 Total Goals"
            value={totalOver12_5}
            onChange={(e) => setTotalOver12_5(e.target.value)}
            required
          />

          <h4 className={styles.subSectionTitle}>Total Goals Odds (Under)</h4>
          <input
            className={styles.inputField}
            type="number"
            step="0.01"
            placeholder="U 10.5 Total Goals"
            value={totalUnder10_5}
            onChange={(e) => setTotalUnder10_5(e.target.value)}
            required
          />
          <input
            className={styles.inputField}
            type="number"
            step="0.01"
            placeholder="U 11.5 Total Goals"
            value={totalUnder11_5}
            onChange={(e) => setTotalUnder11_5(e.target.value)}
            required
          />
          <input
            className={styles.inputField}
            type="number"
            step="0.01"
            placeholder="U 12.5 Total Goals"
            value={totalUnder12_5}
            onChange={(e) => setTotalUnder12_5(e.target.value)}
            required
          />

          <button type="submit" className={styles.submitButton}>
            Add Match
          </button>
        </form>
      </div>

      <div className={styles.sectionCard}>
        <h3 className={styles.sectionTitle}>Update Match Result</h3>
        <form onSubmit={handleUpdateMatchResult}>
          <input
            className={styles.inputField}
            type="text"
            placeholder="Match ID (from Firestore)"
            value={matchIdForResults}
            onChange={(e) => setMatchIdForResults(e.target.value)}
            required
          />
          <input
            className={styles.inputField}
            type="number"
            placeholder="Home Score"
            value={homeScore}
            onChange={(e) => setHomeScore(e.target.value)}
            required
          />
          <input
            className={styles.inputField}
            type="number"
            placeholder="Away Score"
            value={awayScore}
            onChange={(e) => setAwayScore(e.target.value)}
            required
          />
          <button type="submit" className={styles.submitButton}>
            Update Result & Settle Bets
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminMatchInputPage;
