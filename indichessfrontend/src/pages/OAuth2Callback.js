import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function OAuth2Callback() {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash || ""; // e.g. #token=...
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const token = params.get("token");

    if (token) {
      localStorage.setItem("authToken", token);
      navigate("/home", { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  return null;
}

export default OAuth2Callback;
