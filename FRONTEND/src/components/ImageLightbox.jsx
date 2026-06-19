// src/components/ImageLightbox.jsx
import { useEffect, useCallback } from "react";
import { FiX, FiDownload, FiExternalLink } from "react-icons/fi";

export default function ImageLightbox({ src, alt, onClose }) {
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = src;
    a.download = alt || "image";
    a.click();
  };

  const handleOpen = () => {
    window.open(src, "_blank");
  };

  return (
    <div className="lightbox-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        <button className="lightbox-close" onClick={onClose} aria-label="Close">
          <FiX size={20} />
        </button>
        <img src={src} alt={alt || "Image"} />
        <div className="lightbox-actions">
          <button className="lightbox-action-btn" onClick={handleDownload}>
            <FiDownload size={14} /> Download
          </button>
          <button className="lightbox-action-btn" onClick={handleOpen}>
            <FiExternalLink size={14} /> Open
          </button>
        </div>
      </div>
    </div>
  );
}
