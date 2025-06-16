// src/components/MatchCard/MatchCard.js
import React, { useState } from "react";
import styles from "./MatchCard.module.css"; // Import as a JS object

const MatchCard = ({ match, onSelectBet, isSelected }) => {
  const [showMarkets, setShowMarkets] = useState(false);

  // Helper to apply selected class
  const getOddClassName = (market, selection) =>
    isSelected(match.id, market, selection)
      ? styles.oddSelected
      : styles.oddButton;

  return (
    <div className={styles.matchCard}>
      <div
        className={styles.matchHeader}
        onClick={() => setShowMarkets(!showMarkets)}
      >
        <h3 className={styles.matchTitle}>
          {match.homeTeam} vs {match.awayTeam}
        </h3>
        <p className={styles.matchInfo}>
          {new Date(match.matchDate.toDate()).toLocaleString()}
        </p>
        <span className={styles.toggleIcon}>{showMarkets ? "▲" : "▼"}</span>
      </div>

      {showMarkets && (
        <div className={styles.marketsContainer}>
          {/* Straight Win Market */}
          <h4 className={styles.marketTitle}>Straight Win</h4>
          <div className={styles.oddsGrid}>
            <button
              className={getOddClassName("straightWin", "homeWin")}
              onClick={() =>
                onSelectBet(
                  match.id,
                  "straightWin",
                  "homeWin",
                  match.odds.straightWin.homeWin
                )
              }
            >
              Home Win: {match.odds.straightWin.homeWin}
            </button>
            <button
              className={getOddClassName("straightWin", "draw")}
              onClick={() =>
                onSelectBet(
                  match.id,
                  "straightWin",
                  "draw",
                  match.odds.straightWin.draw
                )
              }
            >
              Draw: {match.odds.straightWin.draw}
            </button>
            <button
              className={getOddClassName("straightWin", "awayWin")}
              onClick={() =>
                onSelectBet(
                  match.id,
                  "straightWin",
                  "awayWin",
                  match.odds.straightWin.awayWin
                )
              }
            >
              Away Win: {match.odds.straightWin.awayWin}
            </button>
          </div>

          {/* Home Goals Market */}
          <h4 className={styles.marketTitle}>Home Goals (Over)</h4>
          <div className={styles.oddsGrid}>
            <button
              className={getOddClassName("homeGoals", "over5_5")}
              onClick={() =>
                onSelectBet(
                  match.id,
                  "homeGoals",
                  "over5_5",
                  match.odds.homeGoals.over5_5
                )
              }
            >
              O 5.5: {match.odds.homeGoals.over5_5}
            </button>
            <button
              className={getOddClassName("homeGoals", "over6_5")}
              onClick={() =>
                onSelectBet(
                  match.id,
                  "homeGoals",
                  "over6_5",
                  match.odds.homeGoals.over6_5
                )
              }
            >
              O 6.5: {match.odds.homeGoals.over6_5}
            </button>
            <button
              className={getOddClassName("homeGoals", "over7_5")}
              onClick={() =>
                onSelectBet(
                  match.id,
                  "homeGoals",
                  "over7_5",
                  match.odds.homeGoals.over7_5
                )
              }
            >
              O 7.5: {match.odds.homeGoals.over7_5}
            </button>
          </div>

          {/* Away Goals Market (similar structure) */}
          <h4 className={styles.marketTitle}>Away Goals (Over)</h4>
          <div className={styles.oddsGrid}>
            <button
              className={getOddClassName("awayGoals", "over5_5")}
              onClick={() =>
                onSelectBet(
                  match.id,
                  "awayGoals",
                  "over5_5",
                  match.odds.awayGoals.over5_5
                )
              }
            >
              O 5.5: {match.odds.awayGoals.over5_5}
            </button>
            <button
              className={getOddClassName("awayGoals", "over6_5")}
              onClick={() =>
                onSelectBet(
                  match.id,
                  "awayGoals",
                  "over6_5",
                  match.odds.awayGoals.over6_5
                )
              }
            >
              O 6.5: {match.odds.awayGoals.over6_5}
            </button>
            <button
              className={getOddClassName("awayGoals", "over7_5")}
              onClick={() =>
                onSelectBet(
                  match.id,
                  "awayGoals",
                  "over7_5",
                  match.odds.awayGoals.over7_5
                )
              }
            >
              O 7.5: {match.odds.awayGoals.over7_5}
            </button>
          </div>

          {/* Total Goals Market (Over & Under) */}
          <h4 className={styles.marketTitle}>Total Goals (Over)</h4>
          <div className={styles.oddsGrid}>
            <button
              className={getOddClassName("totalGoals", "over10_5")}
              onClick={() =>
                onSelectBet(
                  match.id,
                  "totalGoals",
                  "over10_5",
                  match.odds.totalGoals.over10_5
                )
              }
            >
              O 10.5: {match.odds.totalGoals.over10_5}
            </button>
            <button
              className={getOddClassName("totalGoals", "over11_5")}
              onClick={() =>
                onSelectBet(
                  match.id,
                  "totalGoals",
                  "over11_5",
                  match.odds.totalGoals.over11_5
                )
              }
            >
              O 11.5: {match.odds.totalGoals.over11_5}
            </button>
            <button
              className={getOddClassName("totalGoals", "over12_5")}
              onClick={() =>
                onSelectBet(
                  match.id,
                  "totalGoals",
                  "over12_5",
                  match.odds.totalGoals.over12_5
                )
              }
            >
              O 12.5: {match.odds.totalGoals.over12_5}
            </button>
          </div>

          <h4 className={styles.marketTitle}>Total Goals (Under)</h4>
          <div className={styles.oddsGrid}>
            <button
              className={getOddClassName("totalGoals", "under10_5")}
              onClick={() =>
                onSelectBet(
                  match.id,
                  "totalGoals",
                  "under10_5",
                  match.odds.totalGoals.under10_5
                )
              }
            >
              U 10.5: {match.odds.totalGoals.under10_5}
            </button>
            <button
              className={getOddClassName("totalGoals", "under11_5")}
              onClick={() =>
                onSelectBet(
                  match.id,
                  "totalGoals",
                  "under11_5",
                  match.odds.totalGoals.under11_5
                )
              }
            >
              U 11.5: {match.odds.totalGoals.under11_5}
            </button>
            <button
              className={getOddClassName("totalGoals", "under12_5")}
              onClick={() =>
                onSelectBet(
                  match.id,
                  "totalGoals",
                  "under12_5",
                  match.odds.totalGoals.under12_5
                )
              }
            >
              U 12.5: {match.odds.totalGoals.under12_5}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchCard;
