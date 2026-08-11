// src/components/SigmaMark.jsx
// The single SIGMA-GPT brand mark — a hexagon AI core with a soft-blue gradient.
import { useId } from "react";

export default function SigmaMark({ size = 24, className = "" }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const grad = `sigma-grad-${uid}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={grad} x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#B8DAFF" />
          <stop offset="1" stopColor="#1677FF" />
        </linearGradient>
      </defs>
      <path
        d="M12 1.9 L21.1 6.95 V17.05 L12 22.1 L2.9 17.05 V6.95 Z"
        stroke={`url(#${grad})`}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="5.4" stroke="rgba(142, 197, 255, 0.35)" strokeWidth="0.8" />
      <circle cx="12" cy="12" r="3" fill={`url(#${grad})`} />
    </svg>
  );
}
