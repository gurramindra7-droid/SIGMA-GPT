// src/pages/Chat.jsx
import { useState, useRef, useEffect, useCallback } from "react";
import { FiSend, FiPlus, FiMic, FiImage, FiFile, FiMenu } from "react-icons/fi";
import API_BASE_URL from "../config/api";
import { getChats, getChatById, uploadImage, uploadPdf } from "../api";
import { useVoiceInput } from "../hooks/useVoiceInput";
import Sidebar from "../components/Sidebar";
import ChatMessage from "../components/ChatMessage";

function newChat() {
  return { id: "new-" + Date.now(), title: "New Chat", messages: [], backendId: null };
}

/* ─── Welcome Screen: 3D Mountain Animation ─── */
function WelcomeScreen({ username, onSuggestion }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let W = canvas.width = canvas.offsetWidth;
    let H = canvas.height = canvas.offsetHeight;
    let t = 0;
    let animId;

    // Mountain layers
    const generateMountain = (seed, points) => {
      const pts = [];
      for (let i = 0; i <= points; i++) {
        const x = (i / points) * W;
        const noise = Math.sin(i * seed * 0.3) * 60 +
                      Math.sin(i * seed * 0.7) * 30 +
                      Math.sin(i * seed * 1.3) * 15;
        pts.push({ x, y: H * 0.65 + noise });
      }
      return pts;
    };

    const mountains = [
      { pts: generateMountain(0.4, 20), color: "rgba(0,80,40,0.9)", speed: 0.0003 },
      { pts: generateMountain(0.7, 15), color: "rgba(0,60,30,0.8)", speed: 0.0005 },
      { pts: generateMountain(1.1, 12), color: "rgba(0,40,20,0.7)", speed: 0.0008 },
      { pts: generateMountain(1.5, 10), color: "rgba(0,30,15,0.6)", speed: 0.001 },
    ];

    // Stars
    const stars = Array.from({length: 150}, () => ({
      x: Math.random() * W,
      y: Math.random() * H * 0.6,
      size: Math.random() * 1.5 + 0.3,
      twinkle: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 2
    }));

    // Floating particles (green energy)
    const particles = Array.from({length: 40}, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -Math.random() * 0.5 - 0.1,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.6 + 0.2,
      life: Math.random()
    }));

    const drawMountain = (pts, color, offset) => {
      ctx.beginPath();
      ctx.moveTo(0, H);
      const shifted = pts.map((p, i) => ({
        x: p.x,
        y: p.y + Math.sin(t * offset + i * 0.5) * 8
      }));
      shifted.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    };

    const draw = () => {
      t += 0.016;
      ctx.clearRect(0, 0, W, H);

      // Sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#020408");
      sky.addColorStop(0.4, "#050A0F");
      sky.addColorStop(0.7, "#071210");
      sky.addColorStop(1, "#050508");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // Horizon glow (green aurora)
      const aurora = ctx.createLinearGradient(0, H*0.3, 0, H*0.7);
      aurora.addColorStop(0, "transparent");
      aurora.addColorStop(0.5, "rgba(0,255,136,0.04)");
      aurora.addColorStop(1, "transparent");
      ctx.fillStyle = aurora;
      ctx.fillRect(0, 0, W, H);

      // Stars
      stars.forEach(s => {
        const tw = 0.3 + 0.7 * Math.sin(s.twinkle + t * s.speed);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,255,220,${tw * 0.9})`;
        ctx.fill();
      });

      // Moon/light source
      const moonX = W * 0.75, moonY = H * 0.18;
      const moonGlow = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, 120);
      moonGlow.addColorStop(0, "rgba(0,255,136,0.12)");
      moonGlow.addColorStop(0.3, "rgba(0,212,170,0.06)");
      moonGlow.addColorStop(1, "transparent");
      ctx.fillStyle = moonGlow;
      ctx.fillRect(0, 0, W, H);

      ctx.beginPath();
      ctx.arc(moonX, moonY, 28, 0, Math.PI * 2);
      const moonGrad = ctx.createRadialGradient(moonX-5, moonY-5, 2, moonX, moonY, 28);
      moonGrad.addColorStop(0, "rgba(180,255,220,0.9)");
      moonGrad.addColorStop(1, "rgba(0,255,136,0.6)");
      ctx.fillStyle = moonGrad;
      ctx.shadowBlur = 30;
      ctx.shadowColor = "#00FF88";
      ctx.fill();
      ctx.shadowBlur = 0;

      // Mountains back to front
      [...mountains].reverse().forEach((m, i) => {
        drawMountain(m.pts, m.color, m.speed * 1000);
      });

      // Floating particles
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        p.life += 0.003;
        if (p.y < 0 || p.life > 1) {
          p.x = Math.random() * W;
          p.y = H; p.life = 0;
        }
        const alpha = Math.sin(p.life * Math.PI) * p.opacity;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,255,136,${alpha})`;
        ctx.fill();
      });

      animId = requestAnimationFrame(draw);
    };

    draw();
    const ro = new ResizeObserver(() => {
      W = canvas.width = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    });
    ro.observe(canvas);
    return () => { cancelAnimationFrame(animId); ro.disconnect(); };
  }, []);

  const suggestions = [
    "Explain quantum computing simply",
    "Write a Python script to analyze CSV data",
    "Help me debug a React component",
    "Create a workout plan for beginners"
  ];

  return (
    <div style={{
      position:"relative", flex:1,
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      overflow:"hidden", minHeight:0
    }}>
      {/* Mountain canvas background */}
      <canvas ref={canvasRef} style={{
        position:"absolute", inset:0,
        width:"100%", height:"100%"
      }}/>

      {/* Content overlay */}
      <div style={{
        position:"relative", zIndex:1,
        display:"flex", flexDirection:"column",
        alignItems:"center", gap:"16px",
        padding:"0 24px", textAlign:"center",
        width:"100%", maxWidth:"600px"
      }}>
        {/* SIGMA-GPT title */}
        <div>
          <h1 style={{
            fontFamily:"'Space Grotesk', sans-serif",
            fontSize:"clamp(32px, 6vw, 64px)",
            fontWeight:900, margin:0,
            background:"linear-gradient(135deg, #00FF88 0%, #0EA5E9 50%, #00D4AA 100%)",
            WebkitBackgroundClip:"text",
            WebkitTextFillColor:"transparent",
            backgroundClip:"text",
            textShadow:"none",
            letterSpacing:"-1px",
            filter:"drop-shadow(0 0 30px rgba(0,255,136,0.3))"
          }}>
            SIGMA GPT
          </h1>
          <p style={{
            margin:"8px 0 0",
            fontSize:"13px",
            color:"#2D6A4F",
            letterSpacing:"3px",
            textTransform:"uppercase",
            fontFamily:"'Inter', sans-serif"
          }}>
            Built by <span style={{
              color:"#00FF88",
              fontWeight:700,
              textShadow:"0 0 15px rgba(0,255,136,0.6)"
            }}>Indra</span>
            {" · "}Groq · Llama 3.3 70B
          </p>
        </div>

        {/* Greeting */}
        <p style={{
          fontFamily:"'Inter', sans-serif",
          fontSize:"clamp(16px, 3vw, 22px)",
          color:"rgba(240,255,244,0.85)",
          margin:"4px 0 0",
          fontWeight:500
        }}>
          How can I help you today,{" "}
          <span style={{
            color:"#00FF88",
            fontWeight:700
          }}>{username || "there"}</span>?
        </p>

        {/* Suggestion chips */}
        <div style={{
          display:"flex", flexWrap:"wrap",
          gap:"10px", justifyContent:"center",
          marginTop:"8px"
        }}>
          {suggestions.map((s, i) => (
            <button key={i}
              onClick={() => onSuggestion(s)}
              style={{
                background:"rgba(0,255,136,0.04)",
                border:"1px solid rgba(0,255,136,0.12)",
                borderRadius:"24px",
                padding:"10px 18px",
                color:"#4A7C59",
                fontSize:"13px",
                cursor:"pointer",
                fontFamily:"'Inter', sans-serif",
                transition:"all 0.2s ease",
                backdropFilter:"blur(10px)"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "rgba(0,255,136,0.1)";
                e.currentTarget.style.borderColor = "rgba(0,255,136,0.3)";
                e.currentTarget.style.color = "#00FF88";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "rgba(0,255,136,0.04)";
                e.currentTarget.style.borderColor = "rgba(0,255,136,0.12)";
                e.currentTarget.style.color = "#4A7C59";
              }}
            >
              {s}
            </button>
          ))}
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
  const [showWaveform, setShowWaveform] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const messagesEndRef = useRef(null);
  const chatBoxRef = useRef(null);
  const fileInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const textareaRef = useRef(null);

  const isGuest = username === "Guest";

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
    if (isGuest) return;
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

  const updateChat = (id, updater) => { setChats((prev) => prev.map((c) => (c.id === id ? updater(c) : c))); };

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
    try {
      const currentChat = activeChat;
      const chatIdToSend = currentChat?.backendId || null;
      const token = localStorage.getItem('sigma_token');
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
      {/* Mobile overlay */}
      <div className={"sidebar-overlay" + (sidebarOpen ? " open" : "")} onClick={() => setSidebarOpen(false)} />

      {/* Sidebar */}
      <Sidebar chats={chats} activeChatId={activeChatId} onSelectChat={selectChat} onNewChat={addNewChat} onDeleteChat={deleteChat} username={username} userEmail="" onLogout={onLogout} mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="chat-main">
        {/* Mobile header */}
        <div className="mobile-header">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar"><FiMenu size={20} /></button>
          <span className="mobile-header-title">SIGMA GPT</span>
          <button className="mobile-header-new-btn" onClick={addNewChat} aria-label="New chat"><FiPlus size={16} /></button>
        </div>

        {/* Desktop header */}
        <div className="chat-header">
          <div className="chat-header-left">
            <button className="hamburger-btn chat-header-hamburger" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar">
              <FiMenu size={20} />
            </button>
            <div>
              <span className="chat-header-title">{activeChat?.title || "New Chat"}</span>
              <span className="chat-header-subtitle">Groq · Llama 3.3 70B</span>
            </div>
          </div>
          <div className="chat-header-right">
            <div className="chat-header-avatar">Σ</div>
          </div>
        </div>

        {/* Messages or Welcome Screen */}
        {msgs.length === 0 ? (
          <WelcomeScreen
            username={username}
            onSuggestion={(text) => {
              setInput(text);
              setTimeout(() => sendMessage(text), 100);
            }}
          />
        ) : (
          <div className="messages-container" ref={chatBoxRef} onScroll={handleScroll}>
            <div className="messages-inner">
              {/* Guest banner */}
              {isGuest && (
                <div className="guest-banner">
                  <span>👤 You are in Guest mode — </span>
                  <span onClick={() => window.location.href='/register'} className="guest-banner-link">Sign up for full access</span>
                </div>
              )}

              {msgs.map((msg, i) => (
                <ChatMessage key={i} msg={msg} username={username} isStreaming={i === msgs.length - 1 && isStreaming} />
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
              <textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey} disabled={loading || uploadingFile} rows={1} placeholder={listening ? "🎤 Listening..." : attachedFile ? "Ask about this " + attachedFile.type + "..." : "Message SIGMA-GPT..."} className="composer-textarea" aria-label="Message input" />
              <div className="composer-actions">
                {!isGuest && voiceSupported && (
                  <button onClick={toggleVoice} disabled={loading || uploadingFile} className={"composer-btn" + (listening ? " recording" : "")} title={listening ? "Stop recording" : "Voice input"} aria-label={listening ? "Stop recording" : "Voice input"}>
                    {listening ? <span className="voice-recording-indicator"><span className="voice-recording-dot" /></span> : <FiMic size={16} />}
                  </button>
                )}
                {!isGuest && (
                  <>
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleImageSelect} style={{ display: "none" }} />
                    <button onClick={() => fileInputRef.current?.click()} disabled={loading || uploadingFile} className="composer-btn" title="Upload image" aria-label="Upload image"><FiImage size={16} /></button>
                    <input ref={pdfInputRef} type="file" accept="application/pdf" onChange={handlePdfSelect} style={{ display: "none" }} />
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
    </div>
  );
}
