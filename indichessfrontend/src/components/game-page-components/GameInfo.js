import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaFire, FaRegHandshake, FaRobot, FaChessPawn, FaTimes } from "react-icons/fa";
import "../component-styles/GameInfo.css";

const GameInfo = ({ streak, userEmail }) => {
  const navigate = useNavigate();

  // STANDARD matchmaking state
  const [isSearchingStandard, setIsSearchingStandard] = useState(false);
  const [searchTimeStandard, setSearchTimeStandard] = useState(0);
  const pollingStandardRef = useRef(null);
  const searchStandardTimerRef = useRef(null);
  const pendingStandardMatchIdRef = useRef(null);

  // RAPID (10 min) matchmaking state
  const [isSearchingRapid, setIsSearchingRapid] = useState(false);
  const [searchTimeRapid, setSearchTimeRapid] = useState(0);
  const pollingRapidRef = useRef(null);
  const searchRapidTimerRef = useRef(null);
  const pendingRapidMatchIdRef = useRef(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (pollingStandardRef.current) clearInterval(pollingStandardRef.current);
      if (searchStandardTimerRef.current) clearTimeout(searchStandardTimerRef.current);
      if (pollingRapidRef.current) clearInterval(pollingRapidRef.current);
      if (searchRapidTimerRef.current) clearTimeout(searchRapidTimerRef.current);
    };
  }, []);

  const cancelStandardSearch = async () => {
    if (pollingStandardRef.current) {
      clearInterval(pollingStandardRef.current);
      pollingStandardRef.current = null;
    }
    if (searchStandardTimerRef.current) {
      clearTimeout(searchStandardTimerRef.current);
      searchStandardTimerRef.current = null;
    }

    const matchId = pendingStandardMatchIdRef.current;
    pendingStandardMatchIdRef.current = null;

    // Best-effort cancel on the backend so the open match is not left dangling.
    if (matchId) {
      try {
        const token = localStorage.getItem("authToken");
        await fetch(`http://localhost:8080/api/matches/${matchId}/cancel`, {
          method: "POST",
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {},
        });
      } catch (e) {
        console.error("Error cancelling STANDARD search on server:", e);
      }
    }

    setIsSearchingStandard(false);
    setSearchTimeStandard(0);
  };

  const cancelRapidSearch = async () => {
    if (pollingRapidRef.current) {
      clearInterval(pollingRapidRef.current);
      pollingRapidRef.current = null;
    }
    if (searchRapidTimerRef.current) {
      clearTimeout(searchRapidTimerRef.current);
      searchRapidTimerRef.current = null;
    }

    const matchId = pendingRapidMatchIdRef.current;
    pendingRapidMatchIdRef.current = null;

    if (matchId) {
      try {
        const token = localStorage.getItem("authToken");
        await fetch(`http://localhost:8080/api/matches/${matchId}/cancel`, {
          method: "POST",
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {},
        });
      } catch (e) {
        console.error("Error cancelling RAPID search on server:", e);
      }
    }

    setIsSearchingRapid(false);
    setSearchTimeRapid(0);
  };

  const pollStandardMatch = (matchId, me) => {
    let attempts = 0;
    const maxAttempts = 90; // 90 seconds

    pollingStandardRef.current = setInterval(async () => {
      attempts++;
      setSearchTimeStandard(attempts);

      if (attempts >= maxAttempts) {
        await cancelStandardSearch();
        alert("Could not find an opponent within 90 seconds. Please try again.");
        return;
      }

      try {
        const token = localStorage.getItem("authToken");
        const response = await fetch(`http://localhost:8080/api/matches/${matchId}`, {
          method: "GET",
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {},
        });

        if (response.ok) {
          const result = await response.json();
          // Once an opponent joins and the match is in progress, navigate to the game.
          if (result.opponentEmail && result.status === "IN_PROGRESS") {
            clearInterval(pollingStandardRef.current);
            pollingStandardRef.current = null;
            if (searchStandardTimerRef.current) {
              clearTimeout(searchStandardTimerRef.current);
              searchStandardTimerRef.current = null;
            }

            pendingStandardMatchIdRef.current = null;
            setIsSearchingStandard(false);
            setSearchTimeStandard(0);

            let playerColor = "white";
            if (result.createdByEmail && me && result.createdByEmail !== me) {
              playerColor = "black";
            }

            navigate(`/game/${result.id}`, { state: { playerColor, gameType: "STANDARD" } });
          }
        }
      } catch (error) {
        console.error("Error polling STANDARD match:", error);
      }
    }, 1000);
  };

  const pollRapidMatch = (matchId, me) => {
    let attempts = 0;
    const maxAttempts = 90; // 90 seconds

    pollingRapidRef.current = setInterval(async () => {
      attempts++;
      setSearchTimeRapid(attempts);

      if (attempts >= maxAttempts) {
        await cancelRapidSearch();
        alert("Could not find a RAPID opponent within 90 seconds. Please try again.");
        return;
      }

      try {
        const token = localStorage.getItem("authToken");
        const response = await fetch(`http://localhost:8080/api/matches/${matchId}`, {
          method: "GET",
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {},
        });

        if (response.ok) {
          const result = await response.json();
          if (result.opponentEmail && result.status === "IN_PROGRESS") {
            if (searchRapidTimerRef.current) {
              clearTimeout(searchRapidTimerRef.current);
              searchRapidTimerRef.current = null;
            }
            if (pollingRapidRef.current) {
              clearInterval(pollingRapidRef.current);
              pollingRapidRef.current = null;
            }

            pendingRapidMatchIdRef.current = null;
            setIsSearchingRapid(false);
            setSearchTimeRapid(0);

            let playerColor = "white";
            if (result.createdByEmail && me && result.createdByEmail !== me) {
              playerColor = "black";
            }

            navigate(`/game/${result.id}`, { state: { playerColor, gameType: "RAPID" } });
          }
        }
      } catch (error) {
        console.error("Error polling RAPID match:", error);
      }
    }, 1000);
  };

  const createStandardGame = async () => {
    // If already searching, this click acts as "Cancel".
    if (isSearchingStandard) {
      await cancelStandardSearch();
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        alert("You must be logged in to start a new game.");
        return;
      }

      const response = await fetch("http://localhost:8080/api/matches/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const contentType = response.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
          const text = await response.text();
          console.error("Unexpected response when creating STANDARD game:", text);
          setIsSearchingStandard(false);
          alert("Unexpected server response. Make sure you are logged in, then try again.");
          return;
        }

        const result = await response.json();
        console.log("Create STANDARD match response:", result);

        if (result.id) {
          const me = userEmail || "";

          // If we are the creator and there is no opponent yet, enter the 90s searching state.
          if (result.createdByEmail === me && !result.opponentEmail && result.status === "CREATED") {
            pendingStandardMatchIdRef.current = result.id;
            setIsSearchingStandard(true);
            setSearchTimeStandard(0);

            pollStandardMatch(result.id, me);

            searchStandardTimerRef.current = setTimeout(async () => {
              if (isSearchingStandard) {
                await cancelStandardSearch();
                alert("Could not find an opponent within 90 seconds. Please try again.");
              }
            }, 90000);
          } else {
            // Either we joined an existing match or the match is already in progress; go straight to game.
            let playerColor = "white";
            if (result.createdByEmail && me && result.createdByEmail !== me) {
              playerColor = "black";
            }

            setIsSearchingStandard(false);
            navigate(`/game/${result.id}`, { state: { playerColor, gameType: "STANDARD" } });
          }
        } else {
          setIsSearchingStandard(false);
          alert("Failed to create match. Please try again.");
        }
      } else {
        const text = await response.text().catch(() => "");
        console.error("Failed to create STANDARD match. Status:", response.status, "Body:", text);
        setIsSearchingStandard(false);
        if (response.status === 401) {
          alert("You must be logged in to start a new game.");
        } else {
          alert("Failed to create match. Please try again.");
        }
      }
    } catch (error) {
      console.error("Error creating STANDARD game:", error);
      setIsSearchingStandard(false);
    }
  };

  const createRapidGame = async () => {
    // If already searching, treat this click as a cancel action.
    if (isSearchingRapid) {
      await cancelRapidSearch();
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        alert("You must be logged in to start a new game.");
        return;
      }

      // RAPID uses a separate matchmaking endpoint so it can be treated differently on the backend.
      const response = await fetch("http://localhost:8080/api/matches/create-rapid", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const contentType = response.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
          const text = await response.text();
          console.error("Unexpected response when creating RAPID game:", text);
          setIsSearchingRapid(false);
          alert("Unexpected server response. Make sure you are logged in, then try again.");
          return;
        }

        const result = await response.json();
        console.log("Create RAPID match response:", result);

        if (result.id) {
          const me = userEmail || "";

          if (result.createdByEmail === me && !result.opponentEmail && result.status === "CREATED") {
            pendingRapidMatchIdRef.current = result.id;
            setIsSearchingRapid(true);
            setSearchTimeRapid(0);

            pollRapidMatch(result.id, me);

            searchRapidTimerRef.current = setTimeout(async () => {
              if (isSearchingRapid) {
                await cancelRapidSearch();
                alert("Could not find a RAPID opponent within 90 seconds. Please try again.");
              }
            }, 90000);
          } else {
            let playerColor = "white";
            if (result.createdByEmail && me && result.createdByEmail !== me) {
              playerColor = "black";
            }

            setIsSearchingRapid(false);
            navigate(`/game/${result.id}`, { state: { playerColor, gameType: "RAPID" } });
          }
        } else {
          setIsSearchingRapid(false);
          alert("Failed to create RAPID match. Please try again.");
        }
      } else {
        const text = await response.text().catch(() => "");
        console.error("Failed to create RAPID match. Status:", response.status, "Body:", text);
        setIsSearchingRapid(false);
        if (response.status === 401) {
          alert("You must be logged in to start a new game.");
        } else {
          alert("Failed to create RAPID match. Please try again.");
        }
      }
    } catch (error) {
      console.error("Error creating RAPID game:", error);
      setIsSearchingRapid(false);
    }
  };

  return (
    <div className="game-info">
      {/* Streak Section */}
      <div className="streak">
        <FaFire size={30} />
        <div>
          <p>Streak</p>
          <h3>{streak} Days</h3>
        </div>
      </div>

      {/* Buttons Section */}
      <div className="buttons">
        <button 
          className={`button ${isSearchingStandard ? 'searching' : ''}`}
          onClick={createStandardGame}
        >
          {isSearchingStandard ? (
            <>
              <FaTimes size={20} />
              Cancel Standard ({searchTimeStandard}s)
            </>
          ) : (
            <>
              <FaChessPawn size={20} />
              Standard Game
            </>
          )}
        </button>
        <button 
          className={`button ${isSearchingRapid ? 'searching' : ''}`}
          onClick={createRapidGame}
        >
          {isSearchingRapid ? (
            <>
              <FaTimes size={20} />
              Cancel Rapid ({searchTimeRapid}s)
            </>
          ) : (
            <>
              <FaChessPawn size={20} />
              Rapid (10 min)
            </>
          )}
        </button>
        <button className="button">
          <FaRobot size={20} />
          Play Bots
        </button>
        <button className="button">
          <FaRegHandshake size={20} />
          Play a Friend
        </button>
      </div>
      
      {/* Searching indicators */}
      {isSearchingStandard && (
        <div className="searching-indicator">
          <div className="spinner"></div>
          <p>Searching for STANDARD opponent... {searchTimeStandard}s</p>
          <p className="searching-hint">(Wait for another player to click "Standard Game")</p>
        </div>
      )}
      {isSearchingRapid && (
        <div className="searching-indicator">
          <div className="spinner"></div>
          <p>Searching for RAPID (10 min) opponent... {searchTimeRapid}s</p>
          <p className="searching-hint">(Wait for another player to click "Rapid (10 min)")</p>
        </div>
      )}
    </div>
  );
};

export default GameInfo;