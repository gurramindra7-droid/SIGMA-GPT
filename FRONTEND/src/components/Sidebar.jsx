// src/components/Sidebar.jsx
import { useState, useEffect, useMemo } from "react";
import { FiSearch, FiStar, FiTrash2 } from "react-icons/fi";

const STORAGE_PINNED_KEY = "sigma_pinned_chats";

function getPinnedIds() {
  try { return JSON.parse(localStorage.getItem(STORAGE_PINNED_KEY) || "[]"); }
  catch { return []; }
}

function savePinnedIds(ids) {
  localStorage.setItem(STORAGE_PINNED_KEY, JSON.stringify(ids));
}

export default function Sidebar({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  username,
  userEmail,
  onLogout,
  mobileOpen,
  onMobileClose,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [pinnedIds, setPinnedIds] = useState(getPinnedIds);

  useEffect(() => { savePinnedIds(pinnedIds); }, [pinnedIds]);

  const togglePin = (id, e) => {
    e.stopPropagation();
    setPinnedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;
    const q = searchQuery.toLowerCase();
    return chats.filter((c) =>
      (c.title && c.title.toLowerCase().includes(q)) ||
      (c.lastMessage && c.lastMessage.toLowerCase().includes(q))
    );
  }, [chats, searchQuery]);

  const sortedChats = useMemo(() => {
    const pinned = filteredChats.filter((c) => pinnedIds.includes(c.id));
    const unpinned = filteredChats.filter((c) => !pinnedIds.includes(c.id));
    return [...pinned, ...unpinned];
  }, [filteredChats, pinnedIds]);

  const handleSelect = (id) => {
    onSelectChat(id);
    if (onMobileClose) onMobileClose();
  };

  const initials = username
    ? username.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "G";

  return (
    <aside className={"sidebar" + (mobileOpen ? " mobile-open" : "")}>
      {/* Logo */}
      <div className="sidebar-header">
        <h2 className="sidebar-logo">⚡ SIGMA-GPT</h2>
        <p className="sidebar-subtitle">Llama 3.3 70B · Groq</p>
      </div>

      {/* New Chat */}
      <div className="sidebar-new-chat-wrapper">
        <button className="sidebar-new-chat-btn" onClick={onNewChat}>
          <span className="sidebar-new-chat-icon">+</span> New Chat
        </button>
      </div>

      {/* Search */}
      <div className="sidebar-search">
        <FiSearch className="sidebar-search-icon" size={13} />
        <input type="text" className="sidebar-search-input" placeholder="Search chats..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} aria-label="Search chats" />
      </div>

      {/* Section Label */}
      <p className="sidebar-section-label">Chats</p>

      {/* Chat List */}
      <div className="sidebar-chat-list">
        {sortedChats.length === 0 ? (
          <p className="sidebar-empty-text">
            {searchQuery ? "No chats found" : "No chats yet"}
          </p>
        ) : (
          sortedChats.map((chat) => (
            <div key={chat.id}
              className={"sidebar-chat-item" + (activeChatId === chat.id ? " active" : "")}
              onClick={() => handleSelect(chat.id)}
              role="button" tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleSelect(chat.id)}
              aria-label={`Chat: ${chat.title}`}
            >
              <span className="sidebar-chat-item-title" title={chat.title}>
                {chat.title || "New Chat"}
              </span>
              <div className="sidebar-chat-item-actions">
                <button className="sidebar-chat-action-btn" onClick={(e) => togglePin(chat.id, e)} title={pinnedIds.includes(chat.id) ? "Unpin" : "Pin"} style={{ color: pinnedIds.includes(chat.id) ? "#06B6D4" : undefined }}>
                  <FiStar size={11} />
                </button>
                <button className="sidebar-chat-action-btn danger" onClick={(e) => { e.stopPropagation(); onDeleteChat(chat.id); }} title="Delete chat">
                  <FiTrash2 size={11} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom user area */}
      <div className="sidebar-footer">
        <div className="sidebar-user-row">
          <div className="sidebar-user-avatar">{initials}</div>
          <span className="sidebar-user-name">{username || "Guest"}</span>
          <button className="sidebar-logout-btn" onClick={onLogout} title="Logout" aria-label="Logout">⇥</button>
        </div>
      </div>
    </aside>
  );
}
