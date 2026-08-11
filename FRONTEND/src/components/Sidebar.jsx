// src/components/Sidebar.jsx
import { useState, useEffect, useMemo } from "react";
import { FiSearch, FiStar, FiTrash2, FiUser, FiInfo, FiLogOut, FiPlus } from "react-icons/fi";
import SigmaMark from "./SigmaMark";

const STORAGE_PINNED_KEY = "sigma_pinned_chats";

function getPinnedIds() {
  try { return JSON.parse(localStorage.getItem(STORAGE_PINNED_KEY) || "[]"); }
  catch { return []; }
}

function savePinnedIds(ids) {
  localStorage.setItem(STORAGE_PINNED_KEY, JSON.stringify(ids));
}

function groupLabel(ts) {
  if (!ts) return "Recent";
  const d = new Date(ts);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayDiff = Math.floor((startToday - startDay) / 86400000);
  if (dayDiff <= 0) return "Today";
  if (dayDiff === 1) return "Yesterday";
  if (dayDiff < 7) return "Previous 7 Days";
  return "Older";
}

export default function Sidebar({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  username,
  onLogout,
  mobileOpen,
  onMobileClose,
  onOpenProfile,
  onOpenAbout,
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

  const groupedChats = useMemo(() => {
    const order = ["Today", "Yesterday", "Previous 7 Days", "Older", "Recent"];
    const map = {};
    sortedChats.forEach((c) => {
      const label = groupLabel(c.createdAt);
      (map[label] = map[label] || []).push(c);
    });
    return order.filter((l) => map[l]).map((l) => ({ label: l, items: map[l] }));
  }, [sortedChats]);

  const handleSelect = (id) => {
    onSelectChat(id);
    if (onMobileClose) onMobileClose();
  };

  const initials = username
    ? username.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "G";

  const isGuest = username === "Guest";

  return (
    <aside className={"sidebar" + (mobileOpen ? " mobile-open" : "")}>
      {/* Branding */}
      <div className="sidebar-header">
        <SigmaMark size={30} />
        <div>
          <h2 className="sidebar-logo">
            <span className="sigma-accent">SIGMA</span>-GPT
          </h2>
          <p className="sidebar-tagline">Intelligent AI Workspace</p>
        </div>
      </div>

      {/* New Chat */}
      <div className="sidebar-new-chat-wrapper">
        <button className="sidebar-new-chat-btn" onClick={onNewChat}>
          <span className="sidebar-new-chat-icon"><FiPlus size={13} /></span>
          New Chat
        </button>
      </div>

      {/* Search */}
      <div className="sidebar-search">
        <FiSearch className="sidebar-search-icon" size={13} />
        <input type="text" name="sidebar-search" className="sidebar-search-input" placeholder="Search conversations..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} aria-label="Search conversations" />
      </div>

      {/* Recent */}
      <p className="sidebar-section-label">Recent</p>

      {/* Conversation history */}
      <div className="sidebar-chat-list">
        {groupedChats.length === 0 ? (
          <p className="sidebar-empty-text">
            {searchQuery ? "No conversations found" : "No conversations yet"}
          </p>
        ) : (
          groupedChats.map((group) => (
            <div key={group.label}>
              <p className="sidebar-group-label">{group.label}</p>
              {group.items.map((chat) => (
                <div key={chat.id}
                  className={"sidebar-chat-item" + (activeChatId === chat.id ? " active" : "")}
                  onClick={() => handleSelect(chat.id)}
                  role="button" tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && handleSelect(chat.id)}
                  aria-label={`Conversation: ${chat.title}`}
                >
                  <span className="sidebar-chat-item-title" title={chat.title}>
                    {chat.title || "New Chat"}
                  </span>
                  <div className="sidebar-chat-item-actions">
                    <button className={"sidebar-chat-action-btn" + (pinnedIds.includes(chat.id) ? " pinned" : "")} onClick={(e) => togglePin(chat.id, e)} title={pinnedIds.includes(chat.id) ? "Unpin" : "Pin"}>
                      <FiStar size={11} />
                    </button>
                    <button className="sidebar-chat-action-btn danger" onClick={(e) => { e.stopPropagation(); onDeleteChat(chat.id); }} title="Delete conversation">
                      <FiTrash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Footer: Profile / About / user */}
      <div className="sidebar-footer">
        <button type="button" className="sidebar-menu-btn" onClick={onOpenProfile}>
          <FiUser size={15} /> Profile
        </button>
        <button type="button" className="sidebar-menu-btn" onClick={onOpenAbout}>
          <FiInfo size={15} /> About SIGMA-GPT
        </button>
        <div
          className="sidebar-user-row"
          onClick={onOpenProfile}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && onOpenProfile()}
          aria-label="Open profile"
        >
          <div className="sidebar-user-avatar">{initials}</div>
          <span className="sidebar-user-name">{username || "Guest"}</span>
          {isGuest && <span className="sidebar-guest-badge" title="Guest accounts have text-only access">GUEST</span>}
          <button className="sidebar-logout-btn" onClick={(e) => { e.stopPropagation(); onLogout(); }} title="Logout" aria-label="Logout">
            <FiLogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
