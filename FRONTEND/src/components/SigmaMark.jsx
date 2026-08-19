// src/components/SigmaMark.jsx
// SIGMA-GPT — Geometric sigma mark with electric-blue accent
import { useId } from "react";

export default function SigmaMark({ size = 24, className = "" }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const grad = `sg-grad-${uid}`;
  const glow = `sg-glow-${uid}`;
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
        <linearGradient id={grad} x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="1" stopColor="#027CFE" />
        </linearGradient>
        <filter id={glow} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" />
        </filter>
      </defs>
      {/* Outer hexagon */}
      <path
        d="M12 2 L20.66 7 V17 L12 22 L3.34 17 V7 Z"
        stroke={`url(#${grad})`}
        strokeWidth="1.2"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Inner sigma symbol */}
      <path
        d="M15 8.5 H9 L13 12 H9 L15 15.5"
        stroke="#027CFE"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Subtle glow at center */}
      <circle cx="12" cy="12" r="2" fill="#027CFE" opacity="0.25" filter={`url(#${glow})`} />
    </svg>
  );
}
