import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const GamesPlayed = ({ currentMatchId }) => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const loadGames = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) {
          setError("You must be logged in to see your game history.");
          setLoading(false);
          return;
        }

        const response = await fetch("http://localhost:8080/api/matches/my", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          console.error("Failed to load matches:", response.status, text);
          setError("Failed to load game history.");
          setLoading(false);
          return;
        }

        const data = await response.json();
        setGames(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Error loading matches:", e);
        setError("Failed to load game history.");
      } finally {
        setLoading(false);
      }
    };

    loadGames();
  }, []);

  const formatDateTime = (value) => {
    if (!value) return "";
    try {
      const d = new Date(value);
      return d.toLocaleString();
    } catch {
      return String(value);
    }
  };

  const handleOpenGame = (id) => {
    if (!id) return;
    // Open past games in a new tab so the current live game is not lost
    window.open(`/game/${id}`, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return <div>Loading game history...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div className="games-played-wrapper">
      <h2>Game History</h2>
      {currentMatchId && (
        <button
          style={{ marginBottom: "10px" }}
          onClick={() =>
            navigate(`/game/${currentMatchId}`, {
              state: { tab: "Analysis" },
            })
          }
        >
          Back to current game (#{currentMatchId})
        </button>
      )}

      {!games.length ? (
        <div>No games found yet. Play a game to see it here!</div>
      ) : (
        <div className="games-played-list">
          <ul>
            {games.map((g) => (
              <li
                key={g.id}
                onClick={() => handleOpenGame(g.id)}
              >
                <strong>Match #{g.id}</strong> – {g.status}
                {g.createdAt && (
                  <>
                    {" "}| Started: {formatDateTime(g.createdAt)}
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default GamesPlayed;
