// src/screens/HomePage/HomePage.js
import React, { useState, useEffect } from "react";
// Corrected imports for Firestore queries:
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import MatchCard from "../../components/MatchCard/MatchCard";
import BetSlip from "../../components/BetSlip/BetSlip";
import styles from "./HomePage.module.css";

const HomePage = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [betSlip, setBetSlip] = useState([]); // Array of { matchId, market, selection, odd, homeTeam, awayTeam }

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        setLoading(true);
        const matchesRef = collection(db, "matches");
        const now = Timestamp.fromDate(new Date()); // Get current server time

        // Corrected query:
        // 1. Filter by 'status' == 'upcoming'
        // 2. Order by 'matchDate'
        // 3. Limit to 40 games
        // 4. Optionally: Filter for matches that haven't started yet (matchDate > now)
        const q = query(
          matchesRef,
          where("status", "==", "upcoming"),
          where("matchDate", ">", now), // Only show matches that are in the future
          orderBy("matchDate"),
          limit(40)
        );
        const querySnapshot = await getDocs(q);
        const fetchedMatches = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMatches(fetchedMatches);
      } catch (error) {
        console.error("Error fetching matches: ", error);
        alert("Error: Failed to load matches. Check console for details.");
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
    // No dependencies means this runs once on mount. If you want to refresh,
    // add `db` or specific states/props that would trigger a re-fetch.
  }, []); // Empty dependency array means it runs once on component mount

  const handleBetSelection = (matchId, market, selection, odd) => {
    const match = matches.find((m) => m.id === matchId);
    if (!match) return; // Should not happen, but good safeguard

    const newSelection = {
      matchId,
      market,
      selection,
      odd,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
    };

    setBetSlip((prevBetSlip) => {
      const existingBetIndex = prevBetSlip.findIndex(
        (bet) => bet.matchId === matchId
      );

      if (existingBetIndex !== -1) {
        // If selection for this match already exists, replace it
        const updatedBetSlip = [...prevBetSlip];
        updatedBetSlip[existingBetIndex] = newSelection;
        return updatedBetSlip;
      } else {
        // Add new selection
        return [...prevBetSlip, newSelection];
      }
    });
  };

  const removeBetFromSlip = (matchId) => {
    setBetSlip((prevBetSlip) =>
      prevBetSlip.filter((bet) => bet.matchId !== matchId)
    );
  };

  const isSelected = (matchId, market, selection) => {
    const bet = betSlip.find((b) => b.matchId === matchId);
    return bet && bet.market === market && bet.selection === selection;
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading Matches...</p>
      </div>
    );
  }

  return (
    <div className={styles.homePageContainer}>
      <h2 className={styles.sectionTitle}>Upcoming Matches</h2>
      <div className={styles.matchesList}>
        {matches.length > 0 ? (
          matches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              onSelectBet={handleBetSelection}
              isSelected={isSelected}
            />
          ))
        ) : (
          <p className={styles.noMatches}>
            No upcoming matches found. Please check back later.
          </p>
        )}
      </div>
      <BetSlip betSlip={betSlip} removeBet={removeBetFromSlip} />
    </div>
  );
};

export default HomePage;
