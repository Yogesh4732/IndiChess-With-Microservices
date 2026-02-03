import React, { useEffect, useState } from "react";

// Show only players who have played with the current user.
// We do this by loading the current user's matches and all users,
// then keeping only users whose email appears as an opponent.
const Players = ({ currentUserEmail }) => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadPlayers = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) {
          setError("You must be logged in to see players.");
          setLoading(false);
          return;
        }

        // 1) Load all matches involving the current user
        const matchesResp = await fetch("http://localhost:8080/api/matches/my", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!matchesResp.ok) {
          const text = await matchesResp.text().catch(() => "");
          console.error("Failed to load matches for players list:", matchesResp.status, text);
          setError("Failed to load players from server.");
          setLoading(false);
          return;
        }

        const matches = await matchesResp.json();
        const me = currentUserEmail || "";

        // Build a set of opponent emails from the matches
        const opponentEmailsSet = new Set();
        (Array.isArray(matches) ? matches : []).forEach((m) => {
          if (!m) return;
          const created = m.createdByEmail || "";
          const opp = m.opponentEmail || "";

          if (me && created === me && opp) {
            opponentEmailsSet.add(opp);
          } else if (me && opp === me && created) {
            opponentEmailsSet.add(created);
          }
        });

        if (opponentEmailsSet.size === 0) {
          setPlayers([]);
          setLoading(false);
          return;
        }

        // 2) Load all users and keep only those whose email is in opponentEmailsSet
        const usersResp = await fetch("http://localhost:8080/api/users/all", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!usersResp.ok) {
          const text = await usersResp.text().catch(() => "");
          console.error("Failed to load users for players list:", usersResp.status, text);
          setError("Failed to load players from server.");
          setLoading(false);
          return;
        }

        const allUsers = await usersResp.json();
        const filtered = (Array.isArray(allUsers) ? allUsers : []).filter(
          (u) => u && u.email && opponentEmailsSet.has(u.email)
        );

        setPlayers(filtered);
      } catch (e) {
        console.error("Error loading players:", e);
        setError("Failed to load players from server.");
      } finally {
        setLoading(false);
      }
    };

    loadPlayers();
  }, [currentUserEmail]);

  if (loading) {
    return <div>Loading players...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!players.length) {
    return <div>No opponents found yet. Play some games to see them here!</div>;
  }

  return (
    <div>
      <h2>Players</h2>
      <ul>
        {players.map((p) => (
          <li key={p.id}>
            {p.name || p.email} ({p.email})
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Players;
