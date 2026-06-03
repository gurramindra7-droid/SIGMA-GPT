// src/pages/Chat.jsx
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import ChatMessage from "../components/ChatMessage";
import FilePreview from "../components/FilePreview";
import { useVoiceInput } from "../hooks/useVoiceInput";
import { useFileUpload } from "../hooks/useFileUpload";
import api from "../api";
import { FiSend, FiMic, FiMicOff, FiPaperclip, FiMenu, FiX } from "react-icons/fi";

// Backend URL: uses env var on Vercel, falls back to Render for safety
const API_URL = import.meta.env.VITE_API_URL || "https://sigma-gpt-backend-obn8.onrender.com";

export default function Chat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeChatId, setActiveChatId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const { uploadedFile, extracting, error: fileError, handleFile, clearFile } = useFileUpload();

  const { listening, supported: voiceSupported, startListening, stopListening } =
    useVoiceInput((transcript) => {
      setInput((prev) => (prev ? prev + " " + transcript : transcript));
    });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  }, [input]);

  const loadChat = async (chatId) => {
    setActiveChatId(chatId);
    const token = localStorage.getItem("token");
    const chat = await api.getChatById(chatId, token);
    setMessages(chat.messages);
  };

  const handleNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
    setInput("");
    clearFile();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const sendMessage = async () => {
    if (!input.trim() && !uploadedFile) return;

    let finalMessage = input.trim();

    if (uploadedFile) {
      const fileContext = uploadedFile.type === "pdf"
        ? `I've uploaded a PDF called "${uploadedFile.name}". Here is the extracted text:\n\n${uploadedFile.content}`
        : `I've uploaded a file called "${uploadedFile.name}". Here is its content:\n\`\`\`\n${uploadedFile.content}\n\`\`\``;

      finalMessage = finalMessage
        ? `${fileContext}\n\nMy question: ${finalMessage}`
        : `${fileContext}\n\nPlease analyze this and give me a summary.`;

      clearFile();
    }

    const userMsg = { role: "user", content: input.trim() || `📎 ${uploadedFile?.name}` };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const token = localStorage.getItem("token");
      // ✅ Uses API_URL variable — works both locally and in production
      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: finalMessage, chatId: activeChatId }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const chatIdMarker = chunk.match(/\n__CHAT_ID__:([a-f0-9]+)/);

        if (chatIdMarker) {
          setActiveChatId(chatIdMarker[1]);
          setRefreshTrigger((t) => t + 1);
          fullText += chunk.replace(/\n__CHAT_ID__:[a-f0-9]+/, "");
        } else {
          fullText += chunk;
        }

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: fullText };
          return updated;
        });
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "❌ Something went wrong. Please try again.",
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <div
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } fixed md:relative md:translate-x-0 z-30 h-full transition-transform duration-200`}
      >
        <Sidebar
          activeChatId={activeChatId}
          onSelectChat={loadChat}
          onNewChat={handleNewChat}
          refreshTrigger={refreshTrigger}
        />
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex flex-col flex-1 min-w-0">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-gray-950">
          <button
            onClick={() => setSidebarOpen((s) => !s)}
            className="md:hidden text-gray-400 hover:text-white transition"
          >
            {sidebarOpen ? <FiX size={20} /> : <FiMenu size={20} />}
          </button>
          <h2 className="text-gray-300 text-sm font-medium">
            {activeChatId ? "Chat" : "New Chat"}
          </h2>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-5xl mb-4">⚡</div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Welcome, {user?.username}
              </h2>
              <p className="text-gray-400 max-w-sm">
                Ask anything. Upload PDFs, code files, or text files. Use voice input too.
              </p>
              <div className="flex gap-3 mt-6 flex-wrap justify-center">
                {["Summarize a PDF", "Explain this code", "Write a function", "What is RAG?"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm px-4 py-2 rounded-xl transition border border-gray-700"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto">
              {messages.map((msg, i) => (
                <ChatMessage key={i} role={msg.role} content={msg.content} />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="px-4 max-w-3xl mx-auto w-full">
          <FilePreview
            file={uploadedFile}
            extracting={extracting}
            error={fileError}
            onClear={clearFile}
          />
        </div>

        <div className="px-4 pb-4 pt-2 border-t border-gray-800">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2 bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={extracting}
                className="text-gray-500 hover:text-blue-400 transition flex-shrink-0 mb-0.5 disabled:opacity-40"
                title="Upload file (PDF, code, text)"
              >
                <FiPaperclip size={18} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.txt,.md,.js,.jsx,.ts,.tsx,.py,.json,.html,.css,.csv,.java,.c,.cpp"
                onChange={handleFileChange}
              />

              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  uploadedFile
                    ? `Ask something about ${uploadedFile.name}...`
                    : "Message SigmaGPT... (Shift+Enter for new line)"
                }
                rows={1}
                className="flex-1 bg-transparent text-white placeholder-gray-500 resize-none outline-none text-sm leading-relaxed"
                style={{ maxHeight: "160px" }}
              />

              {voiceSupported && (
                <button
                  onClick={listening ? stopListening : startListening}
                  className={`flex-shrink-0 mb-0.5 transition ${
                    listening ? "text-red-400 animate-pulse" : "text-gray-500 hover:text-blue-400"
                  }`}
                  title={listening ? "Stop recording" : "Voice input"}
                >
                  {listening ? <FiMicOff size={18} /> : <FiMic size={18} />}
                </button>
              )}

              <button
                onClick={sendMessage}
                disabled={loading || extracting || (!input.trim() && !uploadedFile)}
                className="flex-shrink-0 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white p-2 rounded-xl transition mb-0.5"
              >
                <FiSend size={16} />
              </button>
            </div>
            <p className="text-center text-xs text-gray-600 mt-2">
              SigmaGPT · Llama 3.3 70B via Groq
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}