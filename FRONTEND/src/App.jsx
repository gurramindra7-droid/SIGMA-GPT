// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Chat from "./pages/Chat";

export default function App() {
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
