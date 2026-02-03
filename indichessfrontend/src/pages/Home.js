import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SideNav from "../components/SideNav";
import Header from "../components/Header";
import GameInfo from "../components/game-page-components/GameInfo";

function HomePage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) {
        navigate("/", { replace: true });
        return;
      }

      try {
        const response = await fetch("http://localhost:8080/api/users/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          navigate("/", { replace: true });
          if (response.status === 401 || response.status === 403) {
            localStorage.removeItem("authToken");
          }
          return;
        }

        const data = await response.json();
        setUsername(data.name || data.email || "User");
        setUserEmail(data.email || "");
      } catch (error) {
        console.error("Error checking authentication on /home:", error);
        navigate("/", { replace: true });
      }
    };

    checkAuth();
  }, [navigate]);

  return (
    <div className="app-container">
      <SideNav /> {/* Render the SideNav */}
      <div className="main-container">
        <Header username={username} />
        <div className="game-info-container">
          <GameInfo userEmail={userEmail} />
        </div>
      </div>
    </div>
  );
}

export default HomePage;
