// src/components/ProfileModal.jsx
import { FiLogOut } from "react-icons/fi";
import Modal from "./Modal";

function initialsOf(name) {
  return name
    ? name
        .split(/\s+/)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "G";
}

export default function ProfileModal({ open, onClose, username, onLogout }) {
  const isGuest = username === "Guest";
  const email = localStorage.getItem("sigma_email") || "";

  return (
    <Modal open={open} onClose={onClose} title="Profile">
      <div className="profile-head">
        <div className="profile-avatar">{initialsOf(username)}</div>
        <h2 className="profile-name">{username || "Guest"}</h2>
        <p className="profile-role">{isGuest ? "Guest Session" : "SIGMA-GPT Member"}</p>
      </div>

      <p className="profile-section-title">Account</p>
      <div className="profile-fields">
        <div className="profile-field">
          <span className="profile-field-label">Username</span>
          <span className="profile-field-value">{username || "Guest"}</span>
        </div>
        <div className="profile-field">
          <span className="profile-field-label">Email</span>
          <span className="profile-field-value">{email || "—"}</span>
        </div>
      </div>

      {isGuest && (
        <div className="profile-guest-note">
          <span>
            Guest Mode — text-only messaging. Sign up for image &amp; PDF attachments, voice input and saved history.
          </span>
        </div>
      )}

      <button type="button" className="profile-logout-btn" onClick={onLogout}>
        <FiLogOut size={15} /> Logout
      </button>
    </Modal>
  );
}
