// src/components/Sidebar.jsx
import { useState, useEffect, useMemo } from "react";
import { FiPlus, FiTrash2, FiLogOut, FiMessageSquare, FiSearch, FiStar } from "react-icons/fi";

const STORAGE_PINNED_KEY = "sigma_pinned_chats";

function getPinnedIds() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_PINNED_KEY) || "[]");
  } catch {
    return [];
  }
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

  useEffect(() => {
    savePinnedIds(pinnedIds);
  }, [pinnedIds]);

  const togglePin = (id, e) => {
    e.stopPropagation();
    setPinnedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;
    const q = searchQuery.toLowerCase();
    return chats.filter(
      (c) =>
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
    : "U";

  return (
    <aside className={`sidebar${mobileOpen ? " mobile-open" : ""}`}>
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">SIGMA GPT</div>
        <div className="sidebar-subtitle">Groq · Llama 3.3 70B</div>
      </div>

      {/* New Chat Button */}
      <button className="sidebar-new-chat-btn" onClick={onNewChat}>
        <FiPlus size={16} />
        New Chat
      </button>

      {/* Search */}
      <div className="sidebar-search">
        <FiSearch className="sidebar-search-icon" size={13} />
        <input
          type="text"
          className="sidebar-search-input"
          placeholder="Search chats..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search chats"
        />
      </div>

      {/* Section Label */}
      <div className="sidebar-section-label">Recent</div>

      {/* Chat List */}
      <div className="sidebar-chat-list">
        {sortedChats.length === 0 ? (
          <p className="text-xs text-center py-8" style={{ color: "var(--text-muted)" }}>
            {searchQuery ? "No chats found" : "No chats yet"}
          </p>
        ) : (
          sortedChats.map((chat) => (
            <div
              key={chat.id}
              className={`sidebar-chat-item${activeChatId === chat.id ? " active" : ""}`}
              onClick={() => handleSelect(chat.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleSelect(chat.id)}
              aria-label={`Chat: ${chat.title}`}
            >
              <FiMessageSquare className="sidebar-chat-item-icon" size={14} />
              <span className="sidebar-chat-item-title" title={chat.title}>
                {chat.title || "New Chat"}
              </span>
              <div className="sidebar-chat-item-actions">
                <button
                  className="sidebar-chat-action-btn"
                  onClick={(e) => togglePin(chat.id, e)}
                  title={pinnedIds.includes(chat.id) ? "Unpin" : "Pin"}
                  style={{ color: pinnedIds.includes(chat.id) ? "var(--accent-cyan)" : undefined }}
                >
                  <FiStar size={11} />
                </button>
                <button
                  className="sidebar-chat-action-btn danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteChat(chat.id);
                  }}
                  title="Delete chat"
                >
                  <FiTrash2 size={11} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer / User Profile */}
      <div className="sidebar-footer">
        <div className="sidebar-user-avatar">{initials}</div>
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">{username || "User"}</div>
          <div className="sidebar-user-status">Online</div>
        </div>
        <button className="sidebar-logout-btn" onClick={onLogout} title="Logout" aria-label="Logout">
          <FiLogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
