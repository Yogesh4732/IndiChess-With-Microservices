import Header from "../components/Header";
import SideNav from "../components/SideNav";
import GameContainer from "../components/game-page-components/GameContainer";
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";

const Game = () => {
  const navigate = useNavigate();
  const { matchId } = useParams();
  const location = useLocation();
  const [stompClient, setStompClient] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [gameData, setGameData] = useState(null);
  const [playerColor, setPlayerColor] = useState(location.state?.playerColor || null);
  const [username, setUsername] = useState('');
  const [userEmail, setUserEmail] = useState('');

  // Auth guard: ensure user is logged in before trying to load game
  useEffect(() => {
    const checkAuthAndLoad = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) {
        navigate("/", { replace: true });
        return;
      }

      try {
        const authResponse = await fetch("http://localhost:8080/api/users/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!authResponse.ok) {
          navigate("/", { replace: true });
          return;
        }

        const user = await authResponse.json();
        setUsername(user.name || user.email || "User");
        setUserEmail(user.email || "");

        // Load initial game details via REST so even finished games can be viewed
        try {
          const matchResponse = await fetch(`http://localhost:8080/api/matches/${matchId}`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (matchResponse.ok) {
            const match = await matchResponse.json();

            // Default to showing emails; we'll try to replace with names below
            let player1Label = match.createdByEmail;
            let player2Label = match.opponentEmail;

            // Try to resolve nice display names from user-service
            try {
              const usersResp = await fetch("http://localhost:8080/api/users/all", {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });

              if (usersResp.ok) {
                const users = await usersResp.json();
                const byEmail = new Map(
                  (Array.isArray(users) ? users : [])
                    .filter((u) => u && u.email)
                    .map((u) => [u.email, u])
                );

                const p1User = match.createdByEmail
                  ? byEmail.get(match.createdByEmail)
                  : null;
                const p2User = match.opponentEmail
                  ? byEmail.get(match.opponentEmail)
                  : null;

                if (p1User && p1User.name) {
                  player1Label = p1User.name;
                }
                if (p2User && p2User.name) {
                  player2Label = p2User.name;
                }
              }
            } catch (nameErr) {
              console.error("Failed to resolve player names, falling back to emails:", nameErr);
            }

            // Seed gameData with basic match info; live updates can still come via WebSocket
            setGameData((prev) => ({
              ...prev,
              gameType: match.gameType,
              status: match.status,
              player1: match.createdByEmail
                ? { username: player1Label }
                : undefined,
              player2: match.opponentEmail
                ? { username: player2Label }
                : undefined,
            }));

            // If playerColor wasn't passed via navigation, derive it from match + current user
            if (!location.state?.playerColor && user.email) {
              let derivedColor = "white";
              if (match.createdByEmail === user.email) {
                derivedColor = "white";
              } else if (match.opponentEmail === user.email) {
                derivedColor = "black";
              }
              setPlayerColor(derivedColor);
            }
          } else {
            console.error("Failed to load match details", matchResponse.status);
          }
        } catch (matchErr) {
          console.error("Error loading match details:", matchErr);
        }
      } catch (err) {
        console.error('Error checking auth / loading game details:', err);
        setError("Failed to load game details");
      }
    };

    if (matchId) {
      checkAuthAndLoad();
    }
  }, [matchId, navigate, location]);

  useEffect(() => {
    if (!matchId) {
      setError("No match ID provided");
      return;
    }

    // WebSocket connection to match-service (bypasses gateway)
    const socket = new SockJS('http://localhost:8082/ws');
    const client = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: (str) => console.log('STOMP: ' + str),
      
      onConnect: (frame) => {
        console.log("Connected to WebSocket:", frame);
        setIsConnected(true);
        setError(null);
        
        // Subscribe to game updates
        client.subscribe(`/topic/game/${matchId}`, (message) => {
          console.log("Game update received:", message.body);
          const update = JSON.parse(message.body);
          setGameData(prev => ({ ...prev, ...update }));
        });
        
        // Subscribe to move updates
        client.subscribe(`/topic/moves/${matchId}`, (message) => {
          console.log("Move received:", message.body);
          // Handled in GameContainer via its own subscription
        });
        
        // Notify server that player has joined
        client.publish({
          destination: `/app/game/${matchId}/join`,
          body: JSON.stringify({ 
            type: 'PLAYER_JOINED',
            // Use known color if available; default to white if viewing history
            playerColor: playerColor || 'white',
            timestamp: new Date().toISOString()
          })
        });
      },
      
      onStompError: (frame) => {
        console.error("STOMP error:", frame);
        setError(`Connection error: ${frame.headers?.message || 'Unknown error'}`);
        setIsConnected(false);
      },
      
      onWebSocketError: (error) => {
        console.error("WebSocket error:", error);
        setError("Failed to connect to game server");
        setIsConnected(false);
      },
      
      onDisconnect: () => {
        console.log("Disconnected from WebSocket");
        setIsConnected(false);
      }
    });
    
    client.activate();
    setStompClient(client);

    return () => {
      if (client) {
        client.deactivate();
      }
    };
  }, [matchId, playerColor]);

  if (error) {
    return (
      <div className="app-container">
        <SideNav />
        <div className="main-container">
          <Header username={username} />
          <div className="error-container">
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={() => window.location.href = '/'}>Return to Home</button>
          </div>
        </div>
      </div>
    );
  }

  if (!gameData || !isConnected) {
    return (
      <div className="app-container">
        <SideNav />
        <div className="main-container">
          <Header username={username} />
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading game...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <SideNav />
      <div className="main-container">
        <Header username={username} />
        <GameContainer 
          matchId={matchId}
          stompClient={stompClient}
          isConnected={isConnected}
          playerColor={playerColor}
          initialGameData={gameData}
          username={username}
          userEmail={userEmail}
          initialTab={location.state?.tab}
        />
      </div>
    </div>
  );
};

export default Game;