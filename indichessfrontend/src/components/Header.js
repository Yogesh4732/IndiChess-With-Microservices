import React from "react";
import { useNavigate } from "react-router-dom";
import { FaUser, FaRegEnvelope, FaCog } from "react-icons/fa";  // Import icons
import "./component-styles/Header.css";

const Header = ({ username }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const token = localStorage.getItem("authToken");

    try {
      await fetch("http://localhost:8080/api/auth/logout", {
        method: "POST",
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {},
      });
    } catch (e) {
      // Ignore errors; we'll still clear local state
      // console.error("Logout error", e);
    }

    localStorage.removeItem("authToken");
    navigate("/", { replace: true });
  };

  return (
    <div className="header">
      {/* Left side: Hello User */}
      <div className="left">
        <p>Hello, User {username}</p>
      </div>

      {/* Right side: Icons */}
      <div className="right">
        <FaUser size={20} />
        <FaRegEnvelope size={20} />
        <FaCog size={20} />
        <button className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
};

export default Header;
