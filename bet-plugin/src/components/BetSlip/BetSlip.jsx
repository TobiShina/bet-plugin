// src/components/BetSlip/BetSlip.js
import React, { useState } from "react";
import { functions } from "../../firebase/config";
import { httpsCallable } from "firebase/functions";
import { useAuth } from "../Auth/AuthProvider"; // Assuming you have an AuthProvider
import styles from "./BetSlip.module.css";

const placeBetCloudFunction = httpsCallable(functions, "placeBet");

const BetSlip = ({ betSlip, removeBet }) => {
  const [stake, setStake] = useState("");
  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuth(); // Get current user from context

  const calculateTotalOdds = () => {
    if (betSlip.length === 0) return 0;
    return betSlip.reduce((total, bet) => total * bet.odd, 1).toFixed(2);
  };

  const totalOdds = calculateTotalOdds();
  const potentialPayout = (
    parseFloat(totalOdds) * parseFloat(stake || 0)
  ).toFixed(2);

  const handlePlaceBet = async () => {
    if (!currentUser) {
      alert("You must be logged in to place a bet.");
      return;
    }
    if (betSlip.length === 0) {
      alert("Please add selections to your bet slip.");
      return;
    }
    const parsedStake = parseFloat(stake);
    if (isNaN(parsedStake) || parsedStake < 500 || parsedStake > 10000) {
      alert("Stake must be between 500 and 10,000 NGN.");
      return;
    }

    setLoading(true);
    try {
      const selectionsForBackend = betSlip.map(
        ({ matchId, market, selection, odd }) => ({
          matchId,
          market,
          selection,
          odd: parseFloat(odd), // Ensure odds are numbers
        })
      );

      const result = await placeBetCloudFunction({
        selections: selectionsForBackend,
        stake: parsedStake,
      });

      if (result.data.success) {
        alert(
          `Bet placed successfully! Ticket Code: ${result.data.ticketCode}. Potential Payout: ${potentialPayout} NGN`
        );
        setBetSlip([]); // Clear bet slip
        setStake(""); // Clear stake
      } else {
        alert(`Failed to place bet: ${result.data.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error placing bet:", error.message);
      alert(`Error placing bet: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.betSlipContainer}>
      <h3 className={styles.betSlipTitle}>Bet Slip ({betSlip.length})</h3>
      {betSlip.length === 0 ? (
        <p className={styles.emptySlip}>Your bet slip is empty.</p>
      ) : (
        <>
          <ul className={styles.selectionList}>
            {betSlip.map((bet, index) => (
              <li
                key={`${bet.matchId}-${bet.market}`}
                className={styles.betSelectionItem}
              >
                <span>
                  {bet.homeTeam} vs {bet.awayTeam}
                </span>
                <span>
                  {bet.market} - {bet.selection} @ {bet.odd}
                </span>
                <button
                  className={styles.removeButton}
                  onClick={() => removeBet(bet.matchId)}
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>
          <div className={styles.betSummary}>
            <p>
              Total Odds:{" "}
              <span className={styles.summaryValue}>{totalOdds}</span>
            </p>
            <div className={styles.stakeInputGroup}>
              <label htmlFor="stake" className={styles.stakeLabel}>
                Stake (NGN):
              </label>
              <input
                type="number"
                id="stake"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                className={styles.stakeInput}
                min="500"
                max="10000"
                step="100"
              />
            </div>
            <p>
              Potential Payout:{" "}
              <span className={styles.summaryValue}>{potentialPayout} NGN</span>
            </p>
          </div>
          <button
            className={styles.placeBetButton}
            onClick={handlePlaceBet}
            disabled={
              loading ||
              betSlip.length === 0 ||
              !stake ||
              parseFloat(stake) < 500
            }
          >
            {loading ? "Placing Bet..." : "Place Bet"}
          </button>
        </>
      )}
    </div>
  );
};

export default BetSlip;
