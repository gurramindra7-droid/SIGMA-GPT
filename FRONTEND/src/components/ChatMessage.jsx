// src/components/ChatMessage.jsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useState } from "react";

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="absolute top-2 right-2 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded transition"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function ChatMessage({ role, content }) {
  const isUser = role === "user";

  const renderContent = () => {
    if (isUser) {
      return (
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
      );
    }

    if (!content) {
      return (
        <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse rounded-sm" />
      );
    }

    return (
      <div className="prose prose-invert prose-sm max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || "");
              const codeString = String(children).replace(/\n$/, "");
              if (!inline && match) {
                return (
                  <div className="relative my-2">
                    <div className="flex items-center justify-between bg-gray-900 px-4 py-1 rounded-t-lg border-b border-gray-700">
                      <span className="text-xs text-gray-400 font-mono">{match[1]}</span>
                      <CopyButton text={codeString} />
                    </div>
                    <SyntaxHighlighter
                      style={oneDark}
                      language={match[1]}
                      PreTag="div"
                      customStyle={{ margin: 0, borderRadius: "0 0 8px 8px", fontSize: "13px" }}
                      {...props}
                    >
                      {codeString}
                    </SyntaxHighlighter>
                  </div>
                );
              }
              return (
                <code className="bg-gray-700 text-blue-300 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                  {children}
                </code>
              );
            },
            table({ children }) {
              return (
                <div className="overflow-x-auto my-2">
                  <table className="border-collapse w-full text-sm">{children}</table>
                </div>
              );
            },
            th({ children }) {
              return <th className="border border-gray-600 bg-gray-700 px-3 py-2 text-left font-semibold">{children}</th>;
            },
            td({ children }) {
              return <td className="border border-gray-600 px-3 py-2">{children}</td>;
            },
            a({ href, children }) {
              return <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{children}</a>;
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 mt-1">
          AI
        </div>
      )}
      <div
        className={`max-w-[80%] ${
          isUser
            ? "bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3"
            : "bg-gray-800 text-gray-100 rounded-2xl rounded-tl-sm px-4 py-3"
        }`}
      >
        {renderContent()}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white text-xs font-bold ml-2 flex-shrink-0 mt-1">
          U
        </div>
      )}
    </div>
  );
}