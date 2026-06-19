// src/components/ChatMessage.jsx
import { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { FiCopy, FiRefreshCw, FiThumbsUp, FiThumbsDown, FiFile, FiMic } from "react-icons/fi";
import ThinkingDots from "./ThinkingDots";
import ImageLightbox from "./ImageLightbox";
import API_BASE_URL from "../config/api";

export default function ChatMessage({ msg, username, onRegenerate, isStreaming }) {
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(null);

  const isUser = msg.role === "user";
  const isAssistant = msg.role === "assistant";
  const isEmpty = isAssistant && (!msg.content || msg.content === "");
  const showActions = isAssistant && msg.content && msg.content.length > 0 && !isStreaming;

  const userInitial = username ? username[0].toUpperCase() : "U";

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fullImageUrl = msg.fileUrl
    ? msg.fileUrl.startsWith("http")
      ? msg.fileUrl
      : API_BASE_URL + msg.fileUrl
    : null;

  const markdownComponents = useMemo(() => ({
    code({ node, inline, className, children, ...props }) {
      const match = className ? className.match(/language-(\w+)/) : null;
      const codeString = String(children);
      if (!inline && match) {
        return (
          <div className="relative my-2">
            <div className="flex items-center justify-between" style={{ background: "#1a1a2e", padding: "4px 12px", borderRadius: "8px 8px 0 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{match[1]}</span>
              <button onClick={() => { navigator.clipboard.writeText(codeString); }} style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", background: "none", border: "none", cursor: "pointer" }}>Copy</button>
            </div>
            <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div" customStyle={{ margin: 0, borderRadius: "0 0 8px 8px", fontSize: "13px" }} {...props}>{codeString}</SyntaxHighlighter>
          </div>
        );
      }
      return <code style={{ background: "rgba(255,255,255,0.08)", color: "#93c5fd", padding: "2px 6px", borderRadius: "4px", fontSize: "13px", fontFamily: "monospace" }} {...props}>{children}</code>;
    },
    table({ children }) { return <div style={{ overflowX: "auto", margin: "8px 0" }}><table style={{ borderCollapse: "collapse", width: "100%", fontSize: "13px" }}>{children}</table></div>; },
    th({ children }) { return <th style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>{children}</th>; },
    td({ children }) { return <td style={{ border: "1px solid rgba(255,255,255,0.1)", padding: "8px 12px" }}>{children}</td>; },
    a({ href, children }) { return <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "#60a5fa", textDecoration: "underline" }}>{children}</a>; },
  }), []);

  return (
    <>
      <div className={"message-wrapper " + (isUser ? "user" : "assistant")}>
        {isAssistant && <div className="message-avatar assistant" aria-hidden="true">AI</div>}
        <div className={"message-bubble " + (isUser ? "user" : "assistant") + (isStreaming ? " streaming" : "")}>
          {msg.type === "image" && fullImageUrl && (
            <div className="message-image-card" onClick={() => setLightboxSrc(fullImageUrl)}>
              <img src={fullImageUrl} alt={msg.fileName || "Uploaded image"} loading="lazy" />
              {msg.fileName && <div className="message-image-label"><span>🖼️</span><span>{msg.fileName}</span></div>}
            </div>
          )}
          {msg.type === "pdf" && msg.fileName && (
            <div className="message-pdf-card">
              <div className="message-pdf-icon"><FiFile size={20} /></div>
              <div className="message-pdf-info">
                <div className="message-pdf-name">{msg.fileName}</div>
                <div className="message-pdf-meta">PDF document</div>
              </div>
            </div>
          )}
          {msg.type === "voice" && <div className="message-voice-badge"><FiMic size={12} /><span>Voice input</span></div>}
          {isUser ? (
            <p style={{ whiteSpace: "pre-wrap", fontSize: "14px", lineHeight: "1.6" }}>{msg.content}</p>
          ) : isEmpty ? (
            <ThinkingDots />
          ) : (
            <>
              {isAssistant && !isStreaming && (
                <div className="message-header">
                  <span className="message-header-name">SigmaGPT</span>
                  <span className="message-header-model">Llama 3.3 70B</span>
                </div>
              )}
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{msg.content}</ReactMarkdown>
              </div>
            </>
          )}
          {showActions && (
            <div className={"message-actions visible"}>
              <button onClick={handleCopy} className={"message-action-btn" + (copied ? " copied" : "")} title={copied ? "Copied!" : "Copy"}><FiCopy size={14} /></button>
              {onRegenerate && <button onClick={onRegenerate} className="message-action-btn" title="Regenerate"><FiRefreshCw size={14} /></button>}
              <button onClick={() => setLiked(liked === "like" ? null : "like")} className={"message-action-btn" + (liked === "like" ? " liked" : "")} title="Like"><FiThumbsUp size={14} /></button>
              <button onClick={() => setLiked(liked === "dislike" ? null : "dislike")} className={"message-action-btn" + (liked === "dislike" ? " disliked" : "")} title="Dislike"><FiThumbsDown size={14} /></button>
            </div>
          )}
        </div>
        {isUser && <div className="message-avatar user" aria-hidden="true">{userInitial}</div>}
      </div>
      {lightboxSrc && <ImageLightbox src={lightboxSrc} alt={msg.fileName || "Image"} onClose={() => setLightboxSrc(null)} />}
    </>
  );
}
