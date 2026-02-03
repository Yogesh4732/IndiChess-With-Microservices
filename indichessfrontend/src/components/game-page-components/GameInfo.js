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

  // RAPID (10 min) matchmaking state
  const [isSearchingRapid, setIsSearchingRapid] = useState(false);
  const [searchTimeRapid, setSearchTimeRapid] = useState(0);
  const pollingRapidRef = useRef(null);
  const searchRapidTimerRef = useRef(null);

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

    setIsSearchingRapid(false);
    setSearchTimeRapid(0);
  };

  const pollStandardMatch = () => {
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
        const response = await fetch("http://localhost:8080/api/games/check-match", {
          method: "GET",
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {},
        });

        if (response.ok) {
          const result = await response.json();
          console.log("Check STANDARD match response:", result);

          if (result.matchId && result.matchId > 0) {
            clearInterval(pollingStandardRef.current);
            pollingStandardRef.current = null;
            if (searchStandardTimerRef.current) {
              clearTimeout(searchStandardTimerRef.current);
              searchStandardTimerRef.current = null;
            }

            setIsSearchingStandard(false);
            setSearchTimeStandard(0);
            navigate(`/game/${result.matchId}`);
          } else if (result.matchId === -2) {
            await cancelStandardSearch();
            alert("Error checking for match. Please try again.");
          }
        }
      } catch (error) {
        console.error("Error checking STANDARD match:", error);
      }
    }, 1000);
  };

  const pollRapidMatch = () => {
    pollingRapidRef.current = setInterval(async () => {
      try {
        const token = localStorage.getItem("authToken");
        const response = await fetch("http://localhost:8080/api/games/check-rapid-match", {
          method: "GET",
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {},
        });

        if (response.ok) {
          const result = await response.json();
          console.log("Check RAPID match response:", result);

          if (result.matchId && result.matchId > 0) {
            setIsSearchingRapid(false);
            if (searchRapidTimerRef.current) {
              clearTimeout(searchRapidTimerRef.current);
              searchRapidTimerRef.current = null;
            }
            if (pollingRapidRef.current) {
              clearInterval(pollingRapidRef.current);
              pollingRapidRef.current = null;
            }
            navigate(`/game/${result.matchId}`);
          }
        }
      } catch (error) {
        console.error("Error checking RAPID match:", error);
      }
    }, 3000); // poll every 3 seconds
  };

  const createStandardGame = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        alert("You must be logged in to start a new game.");
        return;
      }

      setIsSearchingStandard(true);
      setSearchTimeStandard(0);

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
          // Determine player color based on who created the match.
          // If the current user is the creator, they play white; otherwise black.
          const me = userEmail || "";
          let playerColor = "white";
          if (result.createdByEmail && me && result.createdByEmail !== me) {
            playerColor = "black";
          }

          setIsSearchingStandard(false);
          navigate(`/game/${result.id}`, { state: { playerColor } });
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
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        alert("You must be logged in to start a new game.");
        return;
      }

      setIsSearchingRapid(true);
      setSearchTimeRapid(0);

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
          // Same color logic for rapid games.
          const me = userEmail || "";
          let playerColor = "white";
          if (result.createdByEmail && me && result.createdByEmail !== me) {
            playerColor = "black";
          }

          setIsSearchingRapid(false);
          navigate(`/game/${result.id}`, { state: { playerColor } });
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