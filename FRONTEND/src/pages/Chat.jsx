// src/pages/Chat.jsx
import { useState, useRef, useEffect, useCallback } from "react";
import { FiSend, FiPlus, FiMic, FiImage, FiFile, FiMenu, FiX } from "react-icons/fi";
import API_BASE_URL from "../config/api";
import { getChats, getChatById, uploadImage, uploadPdf } from "../api";
import { useVoiceInput } from "../hooks/useVoiceInput";
import Sidebar from "../components/Sidebar";
import ChatMessage from "../components/ChatMessage";

function newChat() {
  return { id: "new-" + Date.now(), title: "New Chat", messages: [], backendId: null };
}

export default function Chat({ username, onLogout }) {
  console.log("[Chat] Mounted — sigma_token:", localStorage.getItem("sigma_token") ? "✅ present" : "❌ MISSING");
  console.log("[Chat] Mounted — sigma_username:", username);
  const [chats, setChats] = useState([newChat()]);
  const [activeChatId, setActiveChatId] = useState(chats[0].id);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState("connecting");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showWaveform, setShowWaveform] = useState(false);
  const [userScrolled, setUserScrolled] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const textareaRef = useRef(null);

  const handleTranscript = useCallback((text) => {
    setInput((prev) => (prev || "") + text);
  }, []);

  const { listening, supported: voiceSupported, error: voiceError, interimText, clearError, startListening, stopListening } = useVoiceInput(handleTranscript);

  const activeChat = chats.find((c) => c.id === activeChatId);

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
    const loadChats = async () => {
      try {
        const token = localStorage.getItem('sigma_token');
        if (!token) return;
        const chatList = await getChats(token);
        if (!chatList || chatList.length === 0) return;
        const latestChat = chatList[0];
        const fullChat = await getChatById(latestChat._id, token);
        const mappedChats = chatList.map((c) => ({ id: c._id, title: c.title, messages: [], backendId: c._id }));
        mappedChats[0].messages = fullChat.messages || [];
        setChats(mappedChats);
        setActiveChatId(mappedChats[0].id);
      } catch (err) { console.error('Failed to load chats:', err.message); }
    };
    loadChats();
  }, [backendStatus]);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const isAtBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    setUserScrolled(!isAtBottom);
  }, []);

  // Only auto-scroll if user hasn't scrolled up
  useEffect(() => {
    if (!userScrolled) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeChat?.messages, userScrolled]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'; }
  }, [input]);

  const updateChat = (id, updater) => { setChats((prev) => prev.map((c) => (c.id === id ? updater(c) : c))); };

  const sendMessage = async () => {
    const text = (input || "").trim();
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
    try {
      const currentChat = activeChat;
      const chatIdToSend = currentChat?.backendId || null;
      const token = localStorage.getItem('sigma_token');
      console.log('[Chat] Token from localStorage:', token ? token.slice(0, 25) + '...' : 'null');
      console.log('[Chat] Sending to:', API_BASE_URL + '/api/chat');
      const body = { message: messageText, chatId: chatIdToSend, fileType: fileToSend?.type || null, fileUrl: fileToSend?.url || null, fileName: fileToSend?.name || null, fileText: fileToSend?.type === 'pdf' ? fileToSend.text : null };
      const res = await fetch(API_BASE_URL + '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
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
      updateChat(activeChatId, (c) => { const msgs = [...c.messages]; msgs[msgs.length - 1] = { role: 'assistant', content: 'Error: ' + err.message, type: 'text' }; return { ...c, messages: msgs }; });
    }
    setLoading(false);
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  const addNewChat = () => { const c = newChat(); setChats((prev) => [c, ...prev]); setActiveChatId(c.id); setMobileSidebarOpen(false); };

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
    console.log('[Upload] Image selected:', file.name, file.size);
    setUploadingFile(true);
    try {
      const token = localStorage.getItem('sigma_token');
      const result = await uploadImage(file, token);
      console.log('[Upload] Image uploaded:', result);
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
    console.log('[Upload] PDF selected:', file.name, file.size);
    setUploadingFile(true);
    try {
      const token = localStorage.getItem('sigma_token');
      const result = await uploadPdf(file, token);
      console.log('[Upload] PDF uploaded:', result);
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

  const suggestions = ["Explain quantum computing simply", "Write a Python script to analyze CSV data", "Help me debug a React component", "Create a workout plan for beginners"];

  if (backendStatus === "connecting") {
    return (
      <div className="cold-start-screen">
        <div className="cold-start-icon">&#x26A1;</div>
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

  return (
    <div className="chat-layout">
      <div className={"sidebar-overlay" + (mobileSidebarOpen ? " open" : "")} onClick={() => setMobileSidebarOpen(false)} />
      <Sidebar chats={chats} activeChatId={activeChatId} onSelectChat={selectChat} onNewChat={addNewChat} onDeleteChat={deleteChat} username={username} userEmail="" onLogout={onLogout} mobileOpen={mobileSidebarOpen} onMobileClose={() => setMobileSidebarOpen(false)} />
      <div className="chat-main">
        <div className="mobile-header">
          <button className="hamburger-btn" onClick={() => setMobileSidebarOpen(true)} aria-label="Open sidebar"><FiMenu size={20} /></button>
          <span className="mobile-header-title">SIGMA GPT</span>
          <button className="mobile-header-new-btn" onClick={addNewChat} aria-label="New chat"><FiPlus size={16} /></button>
        </div>
        {/* Desktop Header */}
        <div className="chat-header">
          <div className="chat-header-left">
            <span className="chat-header-logo">SIGMA GPT</span>
            <span className="chat-header-model">Groq · Llama 3.3 70B</span>
          </div>
          <div className="chat-header-right">
            <span className="chat-header-user">{username}</span>
          </div>
        </div>
        <div
          className="messages-container"
          ref={messagesContainerRef}
          onScroll={handleScroll}
        >
          <div className="messages-inner">
            {msgs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-logo">SIGMA GPT</div>
                <h2>How can I help you, {username}?</h2>
                <p>Ask me anything — code, writing, analysis, and more</p>
                <div className="empty-state-suggestions">
                  {suggestions.map((s, i) => (
                    <button key={i} className="empty-state-suggestion" onClick={() => { setInput(s); textareaRef.current?.focus(); }}>{s}</button>
                  ))}
                </div>
              </div>
            ) : (
              msgs.map((msg, i) => (
                <ChatMessage key={i} msg={msg} username={username} isStreaming={i === msgs.length - 1 && isStreaming} />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
        <div className="composer-wrapper">
          <div className="composer-inner">
            {voiceError && (
              <div className="voice-error-banner">
                <span>{voiceError}</span>
                <button className="voice-error-close" onClick={clearError}><FiX size={14} /></button>
              </div>
            )}
            {listening && interimText && <div className="voice-live-transcript">{interimText}</div>}
            {attachedFile && (
              <div className="composer-file-preview">
                <span className="composer-file-preview-icon">{attachedFile.type === "image" ? "🖼️" : "📄"}</span>
                <span className="composer-file-preview-name">{attachedFile.name}</span>
                <button className="composer-file-preview-remove" onClick={() => setAttachedFile(null)} aria-label="Remove attachment"><FiX size={14} /></button>
              </div>
            )}
            <div className={"composer-container" + (attachedFile ? " has-attachment" : "")}>
              <textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey} disabled={loading || uploadingFile} rows={1} placeholder={listening ? "🎤 Listening..." : attachedFile ? "Ask about this " + attachedFile.type + "..." : "Type a message..."} className="composer-textarea" aria-label="Message input" />
              <div className="composer-actions">
                {voiceSupported && (
                  <button onClick={toggleVoice} disabled={loading || uploadingFile} className={"composer-btn" + (listening ? " recording" : "")} title={listening ? "Stop recording" : "Voice input"} aria-label={listening ? "Stop recording" : "Voice input"}>
                    {listening ? <span className="voice-recording-indicator"><span className="voice-recording-dot" /></span> : <FiMic size={16} />}
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleImageSelect} style={{ display: "none" }} />
                <button onClick={() => fileInputRef.current?.click()} disabled={loading || uploadingFile} className="composer-btn" title="Upload image" aria-label="Upload image"><FiImage size={16} /></button>
                <input ref={pdfInputRef} type="file" accept="application/pdf" onChange={handlePdfSelect} style={{ display: "none" }} />
                <button onClick={() => pdfInputRef.current?.click()} disabled={loading || uploadingFile} className="composer-btn" title="Upload PDF" aria-label="Upload PDF"><FiFile size={16} /></button>
                <button onClick={sendMessage} disabled={ loading || uploadingFile || (!(input || "").trim() && !attachedFile)} className="composer-btn send" title="Send message" aria-label="Send message"><FiSend size={16} /></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
