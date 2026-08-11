// src/pages/Chat.jsx
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { FiSend, FiPlus, FiMic, FiImage, FiFile, FiMenu, FiShield } from "react-icons/fi";
import API_BASE_URL from "../config/api";
import { getChats, getChatById, uploadImage, uploadPdf } from "../api";
import { useVoiceInput } from "../hooks/useVoiceInput";
import Sidebar from "../components/Sidebar";
import ChatMessage from "../components/ChatMessage";
import SigmaMark from "../components/SigmaMark";
import ProfileModal from "../components/ProfileModal";
import AboutModal from "../components/AboutModal";

function newChat() {
  return { id: "new-" + Date.now(), title: "New Chat", messages: [], backendId: null, createdAt: Date.now() };
}

/* ─── Lightweight welcome state ─── */
function WelcomeScreen({ onSuggestion, onStart }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        left: (i * 47 + 13) % 100,
        top: (i * 31 + 9) % 100,
        size: 2 + ((i * 5) % 3),
        delay: (i % 8) * 0.8,
        duration: 9 + ((i * 3) % 7),
      })),
    []
  );

  const suggestions = [
    "Explain quantum computing simply",
    "Write a Python script to analyze CSV data",
    "Help me debug a React component",
    "Create a workout plan for beginners",
  ];

  return (
    <div className="welcome-screen">
      <div className="welcome-ambient" aria-hidden="true" />
      {particles.map((p, i) => (
        <span
          key={i}
          className="welcome-particle"
          aria-hidden="true"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}

      <div className="welcome-content">
        <div className="welcome-mark"><SigmaMark size={40} /></div>
        <h1 className="welcome-title">
          Welcome to <span className="sigma-accent">SIGMA</span>-GPT
        </h1>
        <p className="welcome-subtitle">
          Your intelligent AI workspace. Ask a question, explore an idea, or start building something new.
        </p>
        <p className="welcome-credit">
          Engineered by <span>GURRAM INDRASENA YADAV</span>
        </p>
        <div className="welcome-actions">
          <button type="button" className="welcome-start-btn" onClick={onStart}>
            Start a conversation
          </button>
          <div className="welcome-suggestions">
            {suggestions.map((s, i) => (
              <button key={i} type="button" className="welcome-chip" onClick={() => onSuggestion(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Chat({ username, onLogout }) {
  const [chats, setChats] = useState([newChat()]);
  const [activeChatId, setActiveChatId] = useState(chats[0].id);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState("connecting");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [, setShowWaveform] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const messagesEndRef = useRef(null);
  const chatBoxRef = useRef(null);
  const fileInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Guest = anonymous session (a registered account named "Guest" keeps full access)
  const isGuest = username === "Guest" && !localStorage.getItem("sigma_token");

  const handleTranscript = useCallback((text) => {
    setInput((prev) => (prev || "") + text);
  }, []);

  const { listening, supported: voiceSupported, error: voiceError, interimText, clearError, startListening, stopListening } = useVoiceInput(handleTranscript);

  const activeChat = chats.find((c) => c.id === activeChatId);

  const initials = username
    ? username.split(/\s+/).map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "G";

  useEffect(() => {
    let cancelled = false;
    const check = () => {
      fetch(API_BASE_URL + '/health')
        .then((res) => { if (!cancelled) setBackendStatus(res.ok ? 'ready' : 'error'); })
        .catch(() => { if (!cancelled) { setBackendStatus('connecting'); setTimeout(check, 3000); } });
    };
    check();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (backendStatus !== 'ready') return;
    if (isGuest) return;
    const loadChats = async () => {
      try {
        const token = localStorage.getItem('sigma_token');
        if (!token) return;
        const chatList = await getChats(token);
        if (!chatList || chatList.length === 0) return;
        const latestChat = chatList[0];
        const fullChat = await getChatById(latestChat._id, token);
        const mappedChats = chatList.map((c) => ({ id: c._id, title: c.title, messages: [], backendId: c._id, createdAt: c.createdAt }));
        mappedChats[0].messages = fullChat.messages || [];
        setChats(mappedChats);
        setActiveChatId(mappedChats[0].id);
      } catch (err) { console.error('Failed to load chats:', err.message); }
    };
    loadChats();
  }, [backendStatus, isGuest]);

  // Handle manual scroll detection
  const handleScroll = useCallback(() => {
    const el = chatBoxRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAutoScroll(distFromBottom < 80);
  }, []);

  // Auto scroll only when user is at bottom
  useEffect(() => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeChat?.messages, autoScroll]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'; }
  }, [input]);

  const updateChat = useCallback((id, updater) => { setChats((prev) => prev.map((c) => (c.id === id ? updater(c) : c))); }, []);

  /* Network half of sending — assumes the UI messages already exist in state */
  const runChat = useCallback(async (messageText, fileToSend = null) => {
    try {
      const currentChat = activeChat;
      const chatIdToSend = currentChat?.backendId || null;
      const token = localStorage.getItem('sigma_token');
      const body = {
        message: messageText,
        chatId: chatIdToSend,
        fileType: fileToSend?.type || null,
        fileUrl: fileToSend?.url || null,
        fileName: fileToSend?.name || null,
        fileText: fileToSend?.type === 'pdf' ? fileToSend.text : null,
      };
      const headers = { 'Content-Type': 'application/json' };
      // Only authenticated users send a token — guests are anonymous
      if (token) headers.Authorization = 'Bearer ' + token;
      // Guests keep no server history, so send the in-session conversation for context
      if (!token) {
        body.history = (activeChat?.messages || [])
          .filter((m) => m.content && m.content !== '__SIGMA_ERROR__')
          .map((m) => ({ role: m.role, content: m.content }));
      }
      const res = await fetch(API_BASE_URL + '/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) { const errBody = await res.text(); throw new Error('API error ' + res.status + ': ' + errBody.slice(0, 200)); }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        full += chunk;
        setChats((prev) => prev.map((c) => { if (c.id !== activeChatId) return c; const msgs = [...c.messages]; msgs[msgs.length - 1] = { role: 'assistant', content: full, type: 'text' }; return { ...c, messages: msgs }; }));
      }
      const marker = '__CHAT_ID__:';
      const markerIdx = full.indexOf(marker);
      if (markerIdx >= 0) {
        const content = full.slice(0, markerIdx).trimEnd();
        const newBackendId = full.slice(markerIdx + marker.length).trim();
        setChats((prev) => prev.map((c) => { if (c.id !== activeChatId) return c; const msgs = [...c.messages]; msgs[msgs.length - 1] = { role: 'assistant', content, type: 'text' }; return { ...c, backendId: newBackendId, messages: msgs }; }));
      }
    } catch (err) {
      console.error('[Chat] Request failed:', err);
      updateChat(activeChatId, (c) => { const msgs = [...c.messages]; msgs[msgs.length - 1] = { role: 'assistant', content: '__SIGMA_ERROR__', type: 'text' }; return { ...c, messages: msgs }; });
    } finally {
      setLoading(false);
    }
  }, [activeChat, activeChatId, updateChat]);

  const sendMessage = async (textOverride) => {
    const text = (textOverride || input || "").trim();
    const hasAttachment = !!attachedFile;
    if ((!text && !hasAttachment) || loading || uploadingFile) return;
    const messageText = text || (attachedFile ? attachedFile.name : '');
    setInput('');
    setLoading(true);
    const userMsg = { role: 'user', content: messageText, type: attachedFile?.type || 'text', fileUrl: attachedFile?.url || null, fileName: attachedFile?.name || null };
    const assistantMsg = { role: 'assistant', content: '', type: 'text' };
    updateChat(activeChatId, (c) => ({ ...c, title: c.messages.length === 0 ? messageText.slice(0, 35) : c.title, messages: [...c.messages, userMsg, assistantMsg] }));
    const fileToSend = attachedFile;
    setAttachedFile(null);
    await runChat(messageText, fileToSend);
  };

  /* Retry / regenerate: re-send the user message that precedes the given message index */
  const retryMessage = useCallback((index) => {
    const msgs = activeChat?.messages || [];
    const userMsg = msgs[index - 1];
    if (!userMsg || userMsg.role !== 'user' || loading) return;
    updateChat(activeChatId, (c) => {
      const arr = [...c.messages];
      arr[index] = { role: 'assistant', content: '', type: 'text' };
      return { ...c, messages: arr };
    });
    // Re-attach file metadata if the original message carried an attachment
    const fileMeta =
      userMsg.type && userMsg.type !== 'text'
        ? { type: userMsg.type, url: userMsg.fileUrl, name: userMsg.fileName, text: userMsg.fileText || null }
        : null;
    setLoading(true);
    runChat(userMsg.content, fileMeta);
  }, [activeChat, activeChatId, loading, runChat, updateChat]);

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  const addNewChat = () => { const c = newChat(); setChats((prev) => [c, ...prev]); setActiveChatId(c.id); setSidebarOpen(false); };

  const deleteChat = (id) => {
    const remaining = chats.filter((c) => c.id !== id);
    if (remaining.length === 0) { const c = newChat(); setChats([c]); setActiveChatId(c.id); }
    else { setChats(remaining); if (activeChatId === id) setActiveChatId(remaining[0].id); }
  };

  const selectChat = (id) => {
    setActiveChatId(id);
    const target = chats.find((c) => c.id === id);
    if (target && target.messages.length === 0 && target.backendId) {
      const token = localStorage.getItem('sigma_token');
      getChatById(target.backendId, token).then((full) => { setChats((prev) => prev.map((c) => c.id === id ? { ...c, messages: full.messages || [] } : c)); }).catch((err) => console.error('Failed to load chat:', err.message));
    }
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const token = localStorage.getItem('sigma_token');
      const result = await uploadImage(file, token);
      setAttachedFile({ name: result.name, url: result.url, type: 'image' });
    } catch (err) {
      console.error('[Upload] Image upload error:', err.message);
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePdfSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const token = localStorage.getItem('sigma_token');
      const result = await uploadPdf(file, token);
      setAttachedFile({ name: result.name, url: result.url, type: 'pdf', text: result.text });
    } catch (err) {
      console.error('[Upload] PDF upload error:', err.message);
    } finally {
      setUploadingFile(false);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  };

  const toggleVoice = () => {
    if (listening) { stopListening(); setShowWaveform(false); }
    else { startListening(); setShowWaveform(true); }
  };

  if (backendStatus === "connecting" && !isGuest) {
    return (
      <div className="cold-start-screen">
        <div className="cold-start-mark"><SigmaMark size={54} /></div>
        <h2 className="cold-start-title">Waking up SIGMA-GPT...</h2>
        <p className="cold-start-text">The backend is starting up. This may take a moment.</p>
        <div style={{ display: "flex", gap: "6px" }}>
          <div className="thinking-dot" />
          <div className="thinking-dot" />
          <div className="thinking-dot" />
        </div>
      </div>
    );
  }

  const msgs = activeChat?.messages || [];
  const isStreaming = msgs.length > 0 && msgs[msgs.length - 1]?.role === "assistant" && msgs[msgs.length - 1]?.content === "";

  const guestBanner = (
    <div className="guest-banner">
      <FiShield className="guest-banner-icon" size={15} />
      <span>You are in Guest mode — </span>
      <span onClick={() => window.location.href='/register'} className="guest-banner-link">Sign up for full access</span>
    </div>
  );

  return (
    <div className="chat-layout">
      {/* Mobile overlay */}
      <div className={"sidebar-overlay" + (sidebarOpen ? " open" : "")} onClick={() => setSidebarOpen(false)} />

      {/* Sidebar */}
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={selectChat}
        onNewChat={addNewChat}
        onDeleteChat={deleteChat}
        username={username}
        onLogout={onLogout}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
        onOpenProfile={() => setProfileOpen(true)}
        onOpenAbout={() => setAboutOpen(true)}
      />

      {/* Main content */}
      <div className="chat-main">
        {/* Mobile header */}
        <div className="mobile-header">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar"><FiMenu size={20} /></button>
          <div className="mobile-header-brand">
            <SigmaMark size={22} />
            <span className="mobile-header-title">SIGMA-GPT</span>
          </div>
          <button className="mobile-header-new-btn" onClick={addNewChat} aria-label="New chat"><FiPlus size={16} /></button>
        </div>

        {/* Desktop header */}
        <div className="chat-header">
          <div className="chat-header-left">
            <button className="hamburger-btn chat-header-hamburger" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar">
              <FiMenu size={20} />
            </button>
            <div className="chat-header-brand">
              <SigmaMark size={26} />
              <div>
                <span className="chat-header-title">SIGMA-GPT</span>
                <span className="chat-header-subtitle">AI Conversation</span>
              </div>
            </div>
          </div>
          <div className="chat-header-right">
            <button className="chat-header-avatar-btn" onClick={() => setProfileOpen(true)} aria-label="Open profile">
              {initials}
            </button>
          </div>
        </div>

        {/* Messages or Welcome Screen */}
        {msgs.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
            {isGuest && <div style={{ margin: "14px auto 0", maxWidth: 640, width: "calc(100% - 32px)" }}>{guestBanner}</div>}
            <WelcomeScreen
              onSuggestion={(text) => {
                setInput(text);
                setTimeout(() => sendMessage(text), 100);
              }}
              onStart={() => textareaRef.current?.focus()}
            />
          </div>
        ) : (
          <div className="messages-container" ref={chatBoxRef} onScroll={handleScroll}>
            <div className="messages-inner">
              {isGuest && guestBanner}

              {msgs.map((msg, i) => (
                <ChatMessage
                  key={i}
                  msg={msg}
                  username={username}
                  index={i}
                  onRetry={retryMessage}
                  isStreaming={i === msgs.length - 1 && isStreaming}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Composer */}
        <div className="composer-wrapper">
          <div className="composer-inner">
            {voiceError && (
              <div className="voice-error-banner">
                <span>{voiceError}</span>
                <button className="voice-error-close" onClick={clearError}>✕</button>
              </div>
            )}
            {listening && interimText && <div className="voice-live-transcript">{interimText}</div>}
            {attachedFile && (
              <div className="composer-file-preview">
                <span className="composer-file-preview-icon">{attachedFile.type === "image" ? "🖼️" : "📄"}</span>
                <span className="composer-file-preview-name">{attachedFile.name}</span>
                <button className="composer-file-preview-remove" onClick={() => setAttachedFile(null)} aria-label="Remove attachment">✕</button>
              </div>
            )}
            <div className="composer-container">
              <textarea ref={textareaRef} name="message-input" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey} disabled={loading || uploadingFile} rows={1} placeholder={listening ? "🎤 Listening..." : attachedFile ? "Ask about this " + attachedFile.type + "..." : "Ask SIGMA-GPT anything..."} className="composer-textarea" aria-label="Message input" />
              <div className="composer-actions">
                {!isGuest && voiceSupported && (
                  <button onClick={toggleVoice} disabled={loading || uploadingFile} className={"composer-btn" + (listening ? " recording" : "")} title={listening ? "Stop recording" : "Voice input"} aria-label={listening ? "Stop recording" : "Voice input"}>
                    {listening ? <span className="voice-recording-indicator"><span className="voice-recording-dot" /></span> : <FiMic size={16} />}
                  </button>
                )}
                {!isGuest && (
                  <>
                    <input ref={fileInputRef} name="image-upload" type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleImageSelect} style={{ display: "none" }} />
                    <button onClick={() => fileInputRef.current?.click()} disabled={loading || uploadingFile} className="composer-btn" title="Upload image" aria-label="Upload image"><FiImage size={16} /></button>
                    <input ref={pdfInputRef} name="pdf-upload" type="file" accept="application/pdf" onChange={handlePdfSelect} style={{ display: "none" }} />
                    <button onClick={() => pdfInputRef.current?.click()} disabled={loading || uploadingFile} className="composer-btn" title="Upload PDF" aria-label="Upload PDF"><FiFile size={16} /></button>
                  </>
                )}
                <button onClick={() => sendMessage()} disabled={loading || uploadingFile || (!(input || "").trim() && !attachedFile)} className="composer-btn send" title="Send message" aria-label="Send message">
                  <FiSend size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile & About modals */}
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} username={username} onLogout={onLogout} />
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
