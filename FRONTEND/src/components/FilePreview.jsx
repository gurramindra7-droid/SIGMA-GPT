// src/components/FilePreview.jsx
import { FiFileText, FiCode, FiX } from "react-icons/fi";

export default function FilePreview({ file, extracting, error, onClear }) {
  if (extracting) {
    return (
      <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 text-sm text-gray-300 px-3 py-2 rounded-lg mb-2">
        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        <span>Reading file...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 bg-red-900/30 border border-red-700 text-sm text-red-300 px-3 py-2 rounded-lg mb-2">
        <span>{error}</span>
        <button onClick={onClear} className="ml-auto hover:text-red-200">
          <FiX size={14} />
        </button>
      </div>
    );
  }

  if (!file) return null;

  const Icon = file.type === "pdf" ? FiFileText : FiCode;
  const color = file.type === "pdf" ? "text-red-400" : "text-blue-400";

  return (
    <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 text-sm text-gray-300 px-3 py-2 rounded-lg mb-2">
      <Icon size={15} className={color} />
      <span className="truncate flex-1 font-medium">{file.name}</span>
      <span className="text-gray-500 text-xs flex-shrink-0">{file.size}</span>
      <button
        onClick={onClear}
        className="text-gray-500 hover:text-red-400 transition flex-shrink-0"
      >
        <FiX size={14} />
      </button>
    </div>
  );
}