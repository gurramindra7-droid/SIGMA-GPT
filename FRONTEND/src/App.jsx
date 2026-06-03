// src/App.jsx
import { useState } from "react";
import Chat from "./pages/Chat";

export default function App() {
  const [username, setUsername] = useState(
    () => localStorage.getItem("sigma_username") || ""
  );

  const handleStart = (name) => {
    localStorage.setItem("sigma_username", name);
    setUsername(name);
  };

  if (!username) return <Welcome onStart={handleStart} />;
  return <Chat username={username} onLogout={() => { localStorage.removeItem("sigma_username"); setUsername(""); }} />;
}

function Welcome({ onStart }) {
  const [name, setName] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (name.trim()) onStart(name.trim());
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="bg-gray-900 p-8 rounded-2xl w-full max-w-md shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">⚡ SigmaGPT</h1>
          <p className="text-gray-400">Powered by Groq · Llama 3.3 70B</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-gray-300 text-sm mb-1 block">Your name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              placeholder="Enter your name..."
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition text-lg"
          >
            Start Chatting →
          </button>
        </form>
      </div>
    </div>
  );
}