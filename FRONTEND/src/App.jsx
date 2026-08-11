// src/App.jsx
import { useState, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Intro from "./components/Intro";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Chat from "./pages/Chat";
import "./styles/intro.css";

const INTRO_SEEN_KEY = "sigma_intro_seen";

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

function AppRoutes() {
  // Cinematic intro plays once per session (per tab) — never annoys returning users.
  // `?intro=1` forces a replay (handy for previews/demos).
  const [showIntro, setShowIntro] = useState(() => {
    const forceReplay = new URLSearchParams(window.location.search).get("intro") === "1";
    return forceReplay || !sessionStorage.getItem(INTRO_SEEN_KEY);
  });

  const handleIntroComplete = useCallback(() => {
    sessionStorage.setItem(INTRO_SEEN_KEY, "1");
    setShowIntro(false);
  }, []);

  if (showIntro) {
    return <Intro onComplete={handleIntroComplete} />;
  }

  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/chat" element={<ChatRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// After the intro, send returning users to the chat experience directly.
function HomeRedirect() {
  const token = localStorage.getItem("sigma_token");
  const username = localStorage.getItem("sigma_username");
  if (username === "Guest" || (username && token)) {
    return <Navigate to="/chat" replace />;
  }
  return <Navigate to="/login" replace />;
}

function ChatRoute() {
  const navigate = useNavigate();
  const token = localStorage.getItem("sigma_token");
  const username = localStorage.getItem("sigma_username");

  const isGuest = username === "Guest";

  // Guests may enter chat with just a username. Authenticated users need a token.
  if (!username || (!token && !isGuest)) {
    if (username && !token && !isGuest) {
      // Stale state — username without token
      localStorage.removeItem("sigma_token");
      localStorage.removeItem("sigma_username");
    }
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    localStorage.removeItem("sigma_token");
    localStorage.removeItem("sigma_username");
    localStorage.removeItem("sigma_email");
    navigate("/login");
  };

  return <Chat username={username} onLogout={handleLogout} />;
}
