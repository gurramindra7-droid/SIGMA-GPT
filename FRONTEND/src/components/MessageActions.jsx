// src/components/MessageActions.jsx
import { useState } from "react";
import { FiCopy, FiRefreshCw, FiThumbsUp, FiThumbsDown } from "react-icons/fi";

export default function MessageActions({ content, visible, onRegenerate }) {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={"message-actions" + (visible ? " visible" : "")}>
      <button
        onClick={handleCopy}
        className={"message-action-btn" + (copied ? " copied" : "")}
        title={copied ? "Copied!" : "Copy response"}
      >
        <FiCopy size={14} />
      </button>
      {onRegenerate && (
        <button onClick={onRegenerate} className="message-action-btn" title="Regenerate">
          <FiRefreshCw size={14} />
        </button>
      )}
      <button
        onClick={() => setLiked(liked === "like" ? null : "like")}
        className={"message-action-btn" + (liked === "like" ? " liked" : "")}
        title="Like"
      >
        <FiThumbsUp size={14} />
      </button>
      <button
        onClick={() => setLiked(liked === "dislike" ? null : "dislike")}
        className={"message-action-btn" + (liked === "dislike" ? " disliked" : "")}
        title="Dislike"
      >
        <FiThumbsDown size={14} />
      </button>
    </div>
  );
}
