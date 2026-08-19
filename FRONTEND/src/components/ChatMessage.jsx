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

/* Code block with language indicator + copy */
function CodeBlock({ language, children }) {
  const [copied, setCopied] = useState(false);
  const codeString = String(children);

  const copy = () => {
    navigator.clipboard.writeText(codeString).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="code-block">
      <div className="code-block-header">
        <span className="code-block-lang">{language || "code"}</span>
        <button type="button" className={"code-block-copy" + (copied ? " copied" : "")} onClick={copy}>
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter
        style={oneDark}
        language={language}
        PreTag="div"
        customStyle={{ margin: 0, background: "transparent", fontSize: 12.5 }}
      >
        {codeString}
      </SyntaxHighlighter>
    </div>
  );
}

export default function ChatMessage({ msg, username, index, onRetry, isStreaming }) {
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(null);

  const isUser = msg.role === "user";
  const isAssistant = msg.role === "assistant";
  const isEmpty = isAssistant && (!msg.content || msg.content === "");
  const isError = isAssistant && msg.content === "__SIGMA_ERROR__";
  const showActions = isAssistant && msg.content && msg.content.length > 0 && !isError && !isStreaming;

  const userInitial = username ? username[0].toUpperCase() : "U";

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fullImageUrl = msg.fileUrl
    ? msg.fileUrl.startsWith("http")
      ? msg.fileUrl
      : API_BASE_URL + msg.fileUrl
    : null;

  const markdownComponents = useMemo(() => ({
    code({ inline, className, children, ...props }) {
      const match = className ? className.match(/language-(\w+)/) : null;
      if (!inline && match) {
        return <CodeBlock language={match[1]}>{children}</CodeBlock>;
      }
      return <code {...props}>{children}</code>;
    },
    a({ href, children }) {
      return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
    },
  }), []);

  return (
    <>
      {isUser ? (
        /* ── User message: right-aligned with label ── */
        <div className="message-wrapper user">
          <div className="message-avatar user" aria-hidden="true">{userInitial}</div>
          <div style={{ maxWidth: "68%", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div className="message-label user-label">
              <span>YOU</span>
            </div>
            <div className="message-bubble user">
              {msg.type === "image" && fullImageUrl && (
                <div className="message-image-card" onClick={() => setLightboxSrc(fullImageUrl)}>
                  <img src={fullImageUrl} alt={msg.fileName || "Uploaded image"} loading="lazy" />
                  {msg.fileName && <div className="message-image-label"><FiFile size={12} /><span>{msg.fileName}</span></div>}
                </div>
              )}
              {msg.type === "pdf" && msg.fileName && (
                <div className="message-pdf-card">
                  <div className="message-pdf-icon"><FiFile size={18} /></div>
                  <div className="message-pdf-info">
                    <div className="message-pdf-name">{msg.fileName}</div>
                    <div className="message-pdf-meta">PDF document</div>
                  </div>
                </div>
              )}
              {msg.type === "voice" && <div className="message-voice-badge"><FiMic size={11} /><span>Voice input</span></div>}
              <p className="message-user-text">{msg.content}</p>
            </div>
          </div>
        </div>
      ) : (
        /* ── Assistant message: editorial layout ── */
        <div className="message-wrapper assistant">
          <div className="message-label assistant-label">
            <div className="message-label-dot" />
            <span>SIGMA</span>
          </div>
          <div className={"message-bubble assistant" + (isStreaming ? " streaming" : "")}>
            {isError ? (
              <div className="error-message">
                <span className="error-message-title">Something went wrong</span>
                <span className="error-message-text">
                  SIGMA-GPT couldn&apos;t complete that request. Please try again.
                </span>
                {onRetry && (
                  <button type="button" className="error-message-retry" onClick={() => onRetry(index)}>
                    Try again
                  </button>
                )}
              </div>
            ) : isEmpty ? (
              <ThinkingDots />
            ) : (
              <div className="sigma-markdown">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {msg.content}
                </ReactMarkdown>
              </div>
            )}

            {showActions && (
              <div className="message-actions visible">
                <button onClick={handleCopy} className={"message-action-btn" + (copied ? " copied" : "")} title={copied ? "Copied!" : "Copy"}><FiCopy size={13} /></button>
                {onRetry && <button onClick={() => onRetry(index)} className="message-action-btn" title="Regenerate"><FiRefreshCw size={13} /></button>}
                <button onClick={() => setLiked(liked === "like" ? null : "like")} className={"message-action-btn" + (liked === "like" ? " liked" : "")} title="Like"><FiThumbsUp size={13} /></button>
                <button onClick={() => setLiked(liked === "dislike" ? null : "dislike")} className={"message-action-btn" + (liked === "dislike" ? " disliked" : "")} title="Dislike"><FiThumbsDown size={13} /></button>
              </div>
            )}
          </div>
        </div>
      )}
      {lightboxSrc && <ImageLightbox src={lightboxSrc} alt={msg.fileName || "Image"} onClose={() => setLightboxSrc(null)} />}
    </>
  );
}
