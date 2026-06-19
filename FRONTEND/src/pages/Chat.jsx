// src/pages/Chat.jsx
import { useState, useRef, useEffect } from "react";
import { FiSend, FiPlus, FiLogOut, FiTrash2 } from "react-icons/fi";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import API_BASE_URL from "../config/api";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
console.log("GROQ KEY LOADED:", GROQ_API_KEY ? "YES ✅" : "MISSING ❌");
const MODEL = "llama-3.3-70b-versatile";

function newChat() {
  return { id: Date.now(), title: "New Chat", messages: [] };
}

export default function Chat({ username, onLogout }) {
  const [chats, setChats] = useState([newChat()]);
  const [activeChatId, setActiveChatId] = useState(chats[0].id);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState("connecting");
  const bottomRef = useRef(null);

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

  const activeChat = chats.find((c) => c.id === activeChatId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages]);

  const updateChat = (id, updater) => {
    setChats((prev) => prev.map((c) => (c.id === id ? updater(c) : c)));
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setLoading(true);

    const userMsg = { role: "user", content: text };
    const assistantMsg = { role: "assistant", content: "" };

    // Add user message + empty assistant message (for streaming) in one update
    updateChat(activeChatId, (c) => ({
      ...c,
      title: c.messages.length === 0 ? text.slice(0, 35) : c.title,
      messages: [...c.messages, userMsg, assistantMsg],
    }));

    try {
      const history = [...activeChat.messages, userMsg];

      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: history,
          max_tokens: 1024,
          stream: true,
        }),
      });

      // ✅ Check for API errors (invalid key, rate limit, etc.) before streaming
      if (!res.ok) {
        const errBody = await res.text();
        console.error("Groq API error:", res.status, errBody);
        throw new Error(`Groq API error ${res.status}: ${errBody.slice(0, 200)}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));
        for (const line of lines) {
          const json = line.replace("data: ", "");
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices[0]?.delta?.content || "";
            full += delta;
            setChats((prev) =>
              prev.map((c) => {
                if (c.id !== activeChatId) return c;
                const msgs = [...c.messages];
                msgs[msgs.length - 1] = { role: "assistant", content: full };
                return { ...c, messages: msgs };
              })
            );
          } catch (parseErr) {
            console.warn("SSE parse warning:", parseErr.message, line.slice(0, 120));
          }
        }
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
              onClick={() => setActiveChatId(chat.id)}
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
          )}

          {activeChat?.messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0 mt-1">AI</div>
              )}
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-tr-sm"
                  : "bg-gray-800 text-gray-100 rounded-tl-sm"
              }`}>
                {msg.role === "user" ? (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
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
                <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold ml-2 flex-shrink-0 mt-1">
                  {username[0].toUpperCase()}
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-4 border-t border-gray-800 bg-gray-900">
          <div className="flex gap-3 items-end max-w-4xl mx-auto">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading}
              rows={1}
              placeholder="Ask anything... (Enter to send)"
              className="flex-1 bg-gray-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm disabled:opacity-50"
              style={{ maxHeight: "120px" }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white p-3 rounded-xl transition flex-shrink-0"
            >
              <FiSend size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}