import { useEffect, useState } from "react";

export default function Intro({ onComplete }) {
  const [phase, setPhase] = useState(0);
  const letters = ["S", "I", "G", "M", "A", "-", "G", "P", "T"];

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 2000);
    const t2 = setTimeout(() => setPhase(2), 2800);
    const t3 = setTimeout(() => setPhase(3), 3800);
    const t4 = setTimeout(() => onComplete(), 4400);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, []);

  return (
    <div className={`intro-wrapper ${phase === 3 ? "flash-exit" : ""}`}>
      <div className="particles">
        {[...Array(60)].map((_, i) => (
          <div key={i} className="particle" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${2 + Math.random() * 4}s`,
            width: `${1 + Math.random() * 3}px`,
            height: `${1 + Math.random() * 3}px`,
          }} />
        ))}
      </div>

      <div className="intro-content">
        <div className="letters-row">
          {letters.map((letter, i) => (
            <span
              key={i}
              className="intro-letter"
              style={{ animationDelay: `${i * 120}ms` }}
            >
              {letter}
            </span>
          ))}
        </div>

        <div className={`intro-subtitle ${phase >= 1 ? "visible" : ""}`}>
          Powered by Groq &middot; Llama 3.3 70B
        </div>

        <div className={`intro-creator ${phase >= 2 ? "visible" : ""}`}>
          Created by <span className="creator-name">Indra</span>
        </div>
      </div>
    </div>
  );
}
