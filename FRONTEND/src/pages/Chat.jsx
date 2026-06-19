// src/pages/Chat.jsx
import { useState, useRef, useEffect } from "react";
import { FiSend, FiPlus, FiLogOut, FiTrash2, FiMic, FiImage, FiFile } from "react-icons/fi";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import API_BASE_URL from "../config/api";
import { getChats, getChatById, uploadImage, uploadPdf } from "../api";
import { useVoiceInput } from "../hooks/useVoiceInput";
import FilePreview from "../components/FilePreview";

function newChat() {
  return { id: Date.now(), title: "New Chat", messages: [], backendId: null };
}

export default function Chat({ username, onLogout }) {
  const [chats, setChats] = useState([newChat()]);
  const [activeChatId, setActiveChatId] = useState(chats[0].id);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState("connecting");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null); // { name, url, type, text? }
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const pdfInputRef = useRef(null);

  // Voice input handler
  const handleTranscript = (text) => {
    setInput((prev) => prev + text);
  };
  const { listening, supported: voiceSupported, error: voiceError, clearError, startListening, stopListening } = useVoiceInput(handleTranscript);

  // Health check to handle Render cold start
  useEffect(() => {
    let cancelled = false;
    const check = () => {
      fetch(`${API_BASE_URL}/health`)
        .then((res) => {
          if (!cancelled) setBackendStatus(res.ok ? "ready" : "error");
        })
        .catch(() => {
          if (!cancelled) {
            setBackendStatus("connecting");
            // Retry after 3s — Render cold start can take 10-30s
            setTimeout(check, 3000);
          }
        });
    };
    check();
    return () => { cancelled = true; };
  }, []);

  // ✅ Load existing chats from MongoDB on mount (after backend is ready)
  useEffect(() => {
    if (backendStatus !== "ready") return;

    const loadChats = async () => {
      try {
        const token = localStorage.getItem("sigma_token");
        if (!token) return;

        const chatList = await getChats(token);
        console.log("Chats loaded:", chatList);

        if (!chatList || chatList.length === 0) return;

        // Load the full messages for the most recent chat
        const latestChat = chatList[0];
        const fullChat = await getChatById(latestChat._id, token);
        console.log("Selected chat:", fullChat);

        const mappedChats = chatList.map((c) => ({
          id: c._id,
          title: c.title,
          messages: [],
          backendId: c._id,
        }));

        // Merge messages into the first (latest) chat
        mappedChats[0].messages = fullChat.messages || [];

        setChats(mappedChats);
        setActiveChatId(mappedChats[0].id);
        console.log("Messages rendered:", mappedChats[0].messages.length);
      } catch (err) {
        console.error("Failed to load chats:", err.message);
      }
    };

    loadChats();
  }, [backendStatus]);

  const activeChat = chats.find((c) => c.id === activeChatId);

  useEffect(() => {
    console.log("Messages rendered:", activeChat?.messages?.length ?? 0);
  }, [activeChat?.messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages]);

  const updateChat = (id, updater) => {
    setChats((prev) => prev.map((c) => (c.id === id ? updater(c) : c)));
  };

  // ─── File Upload Handlers ───────────────────────────────────────────────────

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const token = localStorage.getItem("sigma_token");
      const result = await uploadImage(file, token);
      setAttachedFile({ name: result.name, url: result.url, type: "image" });
    } catch (err) {
      console.error("Image upload error:", err.message);
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePdfSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const token = localStorage.getItem("sigma_token");
      const result = await uploadPdf(file, token);
      setAttachedFile({
        name: result.name,
        url: result.url,
        type: "pdf",
        text: result.text,
      });
    } catch (err) {
      console.error("PDF upload error:", err.message);
    } finally {
      setUploadingFile(false);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
    }
  };

  const clearAttachedFile = () => setAttachedFile(null);

  // ─── Send Message ───────────────────────────────────────────────────────────

  const sendMessage = async () => {
    const text = input.trim();
    const hasAttachment = !!attachedFile;
    if ((!text && !hasAttachment) || loading || uploadingFile) return;

    const messageText = text || (attachedFile ? attachedFile.name : "");
    setInput("");
    setLoading(true);

    const userMsg = {
      role: "user",
      content: messageText,
      type: attachedFile?.type || "text",
      fileUrl: attachedFile?.url || null,
      fileName: attachedFile?.name || null,
    };
    const assistantMsg = { role: "assistant", content: "", type: "text" };

    // Add user message + empty assistant message (for streaming) in one update
    updateChat(activeChatId, (c) => ({
      ...c,
      title: c.messages.length === 0 ? messageText.slice(0, 35) : c.title,
      messages: [...c.messages, userMsg, assistantMsg],
    }));

    const fileToSend = attachedFile;
    setAttachedFile(null);

    try {
      const currentChat = activeChat;
      const chatIdToSend = currentChat?.backendId || null;
      const token = localStorage.getItem("sigma_token");

      const body = {
        message: messageText,
        chatId: chatIdToSend,
        fileType: fileToSend?.type || null,
        fileUrl: fileToSend?.url || null,
        fileName: fileToSend?.name || null,
        fileText: fileToSend?.type === "pdf" ? fileToSend.text : null,
      };

      const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errBody = await res.text();
        console.error("Backend API error:", res.status, errBody);
        throw new Error(`API error ${res.status}: ${errBody.slice(0, 200)}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        full += chunk;

        // Realtime streaming update
        setChats((prev) =>
          prev.map((c) => {
            if (c.id !== activeChatId) return c;
            const msgs = [...c.messages];
            msgs[msgs.length - 1] = { role: "assistant", content: full };
            return { ...c, messages: msgs };
          })
        );
      }

      // After stream ends: strip the chat ID marker from the final content
      const marker = "__CHAT_ID__:";
      const markerIdx = full.indexOf(marker);
      if (markerIdx >= 0) {
        const content = full.slice(0, markerIdx).trimEnd();
        const newBackendId = full.slice(markerIdx + marker.length).trim();
        setChats((prev) =>
          prev.map((c) => {
            if (c.id !== activeChatId) return c;
            const msgs = [...c.messages];
            msgs[msgs.length - 1] = { role: "assistant", content };
            return { ...c, backendId: newBackendId, messages: msgs };
          })
        );
      }

      console.log("✅ AI response complete —", full.length, "chars received");
    } catch (err) {
      updateChat(activeChatId, (c) => {
        const msgs = [...c.messages];
        msgs[msgs.length - 1] = {
          role: "assistant",
          content: "⚠️ Error: " + err.message,
        };
        return { ...c, messages: msgs };
      });
    }

    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const addNewChat = () => {
    const c = newChat();
    setChats((prev) => [c, ...prev]);
    setActiveChatId(c.id);
  };

  const deleteChat = (id) => {
    const remaining = chats.filter((c) => c.id !== id);
    if (remaining.length === 0) {
      const c = newChat();
      setChats([c]);
      setActiveChatId(c.id);
    } else {
      setChats(remaining);
      if (activeChatId === id) setActiveChatId(remaining[0].id);
    }
  };

  // Show cold-start loading screen while backend wakes up
  if (backendStatus === "connecting") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white">
        <div className="text-center">
          <div className="text-6xl mb-6 animate-pulse">⚡</div>
          <h2 className="text-2xl font-semibold mb-2">Waking up SIGMA-GPT...</h2>
          <p className="text-gray-400 text-sm">
            The backend is starting up. This may take a moment.
          </p>
          <div className="mt-8 flex justify-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce mr-1" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce mr-1" style={{ animationDelay: "150ms" }} />
            <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-xl font-bold">⚡ SigmaGPT</h1>
          <p className="text-xs text-gray-500 mt-0.5">Groq · Llama 3.3 70B</p>
        </div>

        <div className="p-3">
          <button
            onClick={addNewChat}
            className="w-full flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition"
          >
            <FiPlus size={16} /> New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-1">
          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => {
                setActiveChatId(chat.id);
                // Load messages if this chat has a backendId but no messages yet
                const target = chats.find(c => c.id === chat.id);
                if (target && target.messages.length === 0 && target.backendId) {
                  const token = localStorage.getItem("sigma_token");
                  getChatById(target.backendId, token).then((full) => {
                    setChats((prev) =>
                      prev.map((c) =>
                        c.id === chat.id ? { ...c, messages: full.messages || [] } : c
                      )
                    );
                  }).catch((err) => {
                    console.error("Failed to load chat messages:", err.message);
                  });
                }
              }}
              className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer mb-1 transition ${
                activeChatId === chat.id
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span className="text-sm truncate flex-1">{chat.title}</span>
              <button
                onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition"
              >
                <FiTrash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-gray-800 flex items-center justify-between">
          <div>
            <p className="text-sm text-white font-medium">{username}</p>
            <p className="text-xs text-gray-500">Active</p>
          </div>
          <button onClick={onLogout} className="text-gray-500 hover:text-red-400 transition" title="Exit">
            <FiLogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {activeChat?.messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
              <p className="text-4xl mb-3">⚡</p>
              <p className="text-xl font-semibold">How can I help you, {username}?</p>
              <p className="text-gray-500 text-sm mt-1">Ask me anything</p>
            </div>
          )}          {activeChat?.messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0 mt-1">AI</div>
              )}
              <div className={`max-w-[80%] ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3"
                  : "bg-gray-800 text-gray-100 rounded-2xl rounded-tl-sm px-4 py-3"
              }`}>
                {/* File attachments */}
                {msg.type === "image" && msg.fileUrl && (
                  <div className="mb-2">
                    <img
                      src={`${API_BASE_URL}${msg.fileUrl}`}
                      alt={msg.fileName || "Uploaded image"}
                      className="max-w-full max-h-64 rounded-lg object-contain"
                      loading="lazy"
                    />
                    {msg.fileName && (
                      <p className="text-xs mt-1 opacity-60">📷 {msg.fileName}</p>
                    )}
                  </div>
                )}
                {msg.type === "pdf" && msg.fileName && (
                  <div className="mb-2 flex items-center gap-2 bg-gray-700/50 rounded-lg px-3 py-2 text-sm">
                    <FiFile className="text-red-400 flex-shrink-0" size={16} />
                    <span className="truncate">📄 {msg.fileName}</span>
                  </div>
                )}
                {msg.type === "voice" && msg.content && (
                  <div className="mb-2 flex items-center gap-2 text-sm opacity-70">
                    <FiMic size={14} />
                    <span className="italic">Voice: {msg.content.slice(0, 100)}</span>
                  </div>
                )}
                {/* Text content */}
                {msg.role === "user" ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                ) : msg.content === "" ? (
                  <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse rounded-sm" />
                ) : (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ inline, className, children }) {
                          const match = /language-(\w+)/.exec(className || "");
                          const code = String(children).replace(/\n$/, "");
                          if (!inline && match) {
                            return (
                              <div className="relative my-2">
                                <div className="flex items-center justify-between bg-gray-900 px-4 py-1 rounded-t-lg border-b border-gray-700">
                                  <span className="text-xs text-gray-400">{match[1]}</span>
                                  <button onClick={() => navigator.clipboard.writeText(code)} className="text-xs text-gray-400 hover:text-white">Copy</button>
                                </div>
                                <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div" customStyle={{ margin: 0, borderRadius: "0 0 8px 8px", fontSize: "13px" }}>
                                  {code}
                                </SyntaxHighlighter>
                              </div>
                            );
                          }
                          return <code className="bg-gray-700 text-blue-300 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>;
                        },
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold ml-2 flex-shrink-0 mt-1">{username[0].toUpperCase()}</div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-4 border-t border-gray-800 bg-gray-900">
          <div className="max-w-4xl mx-auto">
            {/* File preview above input */}
            {voiceError && (
              <div className="mb-2 flex items-center gap-2 bg-red-900/30 border border-red-700 text-sm text-red-300 px-3 py-2 rounded-lg">
                <span>{voiceError}</span>
                <button onClick={clearError} className="ml-auto hover:text-red-200">✕</button>
              </div>
            )}
            {attachedFile && (
              <div className="mb-2">
                <FilePreview
                  file={attachedFile}
                  extracting={uploadingFile}
                  error=""
                  onClear={clearAttachedFile}
                />
              </div>
            )}
            <div className="flex gap-3 items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                disabled={loading || uploadingFile}
                rows={1}
                placeholder={
                  listening
                    ? "🎤 Listening..."
                    : attachedFile
                    ? `Ask about this ${attachedFile.type}...`
                    : "Ask anything... (Enter to send)"
                }
                className="flex-1 bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm disabled:opacity-50"
                style={{ maxHeight: "120px" }}
              />

              {/* Voice button */}
              {voiceSupported && (
                <button
                  onClick={listening ? stopListening : startListening}
                  disabled={loading || uploadingFile}
                  className={`p-3 rounded-xl transition flex-shrink-0 ${
                    listening
                      ? "bg-red-600 text-white animate-pulse"
                      : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                  }`}
                  title={listening ? "Stop recording" : "Voice input"}
                >
                  <FiMic size={18} />
                </button>
              )}

              {/* Image button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleImageSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || uploadingFile}
                className="bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-gray-300 p-3 rounded-xl transition flex-shrink-0"
                title="Upload image"
              >
                <FiImage size={18} />
              </button>

              {/* PDF button */}
              <input
                ref={pdfInputRef}
                type="file"
                accept="application/pdf"
                onChange={handlePdfSelect}
                className="hidden"
              />
              <button
                onClick={() => pdfInputRef.current?.click()}
                disabled={loading || uploadingFile}
                className="bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-gray-300 p-3 rounded-xl transition flex-shrink-0"
                title="Upload PDF"
              >
                <FiFile size={18} />
              </button>

              {/* Send button */}
              <button
                onClick={sendMessage}
                disabled={loading || uploadingFile || (!input.trim() && !attachedFile)}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white p-3 rounded-xl transition flex-shrink-0"
              >
                <FiSend size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}