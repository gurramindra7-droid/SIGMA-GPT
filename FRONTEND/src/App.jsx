// src/App.jsx
import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Intro from "./components/Intro";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Chat from "./pages/Chat";
import "./styles/intro.css";

export default function App() {
  const [showIntro, setShowIntro] = useState(true);

  if (showIntro) {
    return <Intro onComplete={() => setShowIntro(false)} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/chat" element={<ChatRoute />} />
      </Routes>
    </BrowserRouter>
  );
}

function ChatRoute() {
  const navigate = useNavigate();
  const username = localStorage.getItem("sigma_username");

  if (!username) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    localStorage.removeItem("sigma_username");
    navigate("/login");
  };

  return <Chat username={username} onLogout={handleLogout} />;
}
