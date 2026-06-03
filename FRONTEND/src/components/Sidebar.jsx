// src/components/Sidebar.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import { FiPlus, FiTrash2, FiLogOut, FiMessageSquare } from "react-icons/fi";

export default function Sidebar({ activeChatId, onSelectChat, onNewChat, refreshTrigger }) {
  const { user, logout } = useAuth();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchChats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const chats = await api.getChats(token);
      setChats(chats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChats();
  }, [refreshTrigger]);

  const deleteChat = async (e, chatId) => {
    e.stopPropagation();
    const token = localStorage.getItem("token");
    await api.deleteChat(chatId, token);
    setChats((prev) => prev.filter((c) => c._id !== chatId));
    if (activeChatId === chatId) onNewChat();
  };

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-xl font-bold text-white">⚡ SigmaGPT</h1>
        <p className="text-xs text-gray-500 mt-0.5">Powered by Groq + Llama 3.3</p>
      </div>

      {/* New Chat */}
      <div className="p-3">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition"
        >
          <FiPlus size={16} />
          New Chat
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        {loading ? (
          <p className="text-gray-500 text-xs text-center py-4">Loading...</p>
        ) : chats.length === 0 ? (
          <p className="text-gray-600 text-xs text-center py-4">No chats yet</p>
        ) : (
          chats.map((chat) => (
            <div
              key={chat._id}
              onClick={() => onSelectChat(chat._id)}
              className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer mb-1 transition ${
                activeChatId === chat._id
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <FiMessageSquare size={14} className="flex-shrink-0" />
              <span className="text-sm truncate flex-1">{chat.title || "Untitled"}</span>
              <button
                onClick={(e) => deleteChat(e, chat._id)}
                className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition flex-shrink-0"
              >
                <FiTrash2 size={13} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* User Footer */}
      <div className="p-3 border-t border-gray-800 flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-sm text-white font-medium truncate">{user?.username}</p>
          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
        </div>
        <button
          onClick={logout}
          className="text-gray-500 hover:text-red-400 transition flex-shrink-0 ml-2"
          title="Logout"
        >
          <FiLogOut size={16} />
        </button>
      </div>
    </aside>
  );
}