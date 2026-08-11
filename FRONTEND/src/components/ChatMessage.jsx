// src/components/ChatMessage.jsx
import { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { FiCopy, FiRefreshCw, FiThumbsUp, FiThumbsDown, FiFile, FiMic } from "react-icons/fi";
import ThinkingDots from "./ThinkingDots";
import ImageLightbox from "./ImageLightbox";
import SigmaMark from "./SigmaMark";
import API_BASE_URL from "../config/api";

/* Navy code block with language indicator + copy button */
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
        customStyle={{ margin: 0, background: "transparent", fontSize: 13 }}
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
      <div className={"message-wrapper " + (isUser ? "user" : "assistant")}>
        {isAssistant && <div className="message-avatar assistant" aria-hidden="true">Σ</div>}
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
            <p className="message-user-text">{msg.content}</p>
          ) : isError ? (
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
            <>
              {isAssistant && !isStreaming && (
                <div className="message-ai-header">
                  <SigmaMark size={14} />
                  <span className="message-ai-name">SIGMA-GPT</span>
                </div>
              )}
              <div className="sigma-markdown">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {msg.content}
                </ReactMarkdown>
              </div>
            </>
          )}

          {showActions && (
            <div className="message-actions visible">
              <button onClick={handleCopy} className={"message-action-btn" + (copied ? " copied" : "")} title={copied ? "Copied!" : "Copy"}><FiCopy size={14} /></button>
              {onRetry && <button onClick={() => onRetry(index)} className="message-action-btn" title="Regenerate"><FiRefreshCw size={14} /></button>}
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
