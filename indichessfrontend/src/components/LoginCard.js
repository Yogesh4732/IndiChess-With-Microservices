import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function LoginCard({ handleToggleSignup }) {
  const navigate = useNavigate();

  // Treat this as the email the user logs in with
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await axios.post("http://localhost:8080/api/auth/login", {
        email,
        password,
      });

      // Expecting { token: "..." }
      const token = response?.data?.token;
      if (token) {
        localStorage.setItem("authToken", token);
        navigate("/home");
      } else {
        setError("Login failed. Please try again.");
      }
    } catch (err) {
      console.error("Login error", err);
      setError("Invalid email or password");
    }
  };

  return (
    <div className="login-card">
      <h2>Login</h2>

      <form onSubmit={handleLogin}>
        <div className="input-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
          />
        </div>

        <div className="input-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />
        </div>

        {error && <p className="error-message">{error}</p>}

        <button type="submit" className="simple-auth-btn">Login</button>
      </form>

      <a
        href="http://localhost:8083/oauth2/authorization/google"
        className="simple-auth-btn"
        style={{textAlign: "center",backgroundColor:"darkred" }}
      >Login with Google</a>

      <div className="signup-link">
        Not an existing user? 
        <button className="simple-auth-btn" onClick={handleToggleSignup}>Sign up here</button>
      </div>
    </div>
  );
}

export default LoginCard;
