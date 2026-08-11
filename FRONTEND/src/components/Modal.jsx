// src/components/Modal.jsx
// Accessible modal: ESC to close, click-outside to close, focus moved into dialog.
import { useEffect, useRef } from "react";

export default function Modal({ open, onClose, title, children }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const onKey = (e) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      // Basic focus trap: keep Tab cycling inside the dialog
      if (e.key === "Tab" && ref.current) {
        const focusables = ref.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const list = Array.from(focusables);
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => ref.current?.focus(), 20);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
      if (previous && typeof previous.focus === "function") previous.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="sigma-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className="sigma-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <div className="sigma-modal-header">
          <h3 className="sigma-modal-title">{title}</h3>
          <button type="button" className="sigma-modal-close" onClick={onClose} aria-label="Close dialog">
            ✕
          </button>
        </div>
        <div className="sigma-modal-body">{children}</div>
      </div>
    </div>
  );
}
