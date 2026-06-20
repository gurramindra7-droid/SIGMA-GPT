import { useEffect, useState, useRef } from "react";

export default function Intro({ onComplete }) {
  const [phase, setPhase] = useState(0);
  const canvasRef = useRef(null);

  const letters = ["S","I","G","M","A","-","G","P","T"];

  // Particle canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({length: 120}, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      size: Math.random() * 2.5 + 0.5,
      opacity: Math.random() * 0.7 + 0.1,
      color: Math.random() > 0.5 ? "#7C3AED" : "#06B6D4"
    }));

    let animId;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
      });
      // Draw connections between close particles
      particles.forEach((p1, i) => {
        particles.slice(i+1).forEach(p2 => {
          const d = Math.hypot(p1.x-p2.x, p1.y-p2.y);
          if (d < 100) {
            ctx.beginPath();
            ctx.strokeStyle = "#7C3AED";
            ctx.globalAlpha = (1 - d/100) * 0.3;
            ctx.lineWidth = 0.5;
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        });
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  // Phase timing
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1800);
    const t2 = setTimeout(() => setPhase(2), 2800);
    const t3 = setTimeout(() => setPhase(3), 3800);
    const t4 = setTimeout(() => onComplete(), 4600);
    return () => [t1,t2,t3,t4].forEach(clearTimeout);
  }, []);

  return (
    <div style={{
      position:"fixed", inset:0,
      background:"#0A0A0F",
      display:"flex", alignItems:"center", justifyContent:"center",
      zIndex:9999, overflow:"hidden",
      opacity: phase === 3 ? 0 : 1,
      transition: phase === 3 ? "opacity 0.8s ease" : "none"
    }}>
      {/* Particle Canvas */}
      <canvas ref={canvasRef} style={{
        position:"absolute", inset:0, zIndex:0
      }}/>

      {/* Glowing orbs */}
      <div style={{
        position:"absolute",
        width:"600px", height:"600px",
        background:"radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)",
        borderRadius:"50%", top:"50%", left:"50%",
        transform:"translate(-50%,-50%)",
        animation:"orbPulse 3s ease-in-out infinite"
      }}/>
      <div style={{
        position:"absolute",
        width:"400px", height:"400px",
        background:"radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)",
        borderRadius:"50%", top:"40%", left:"60%",
        transform:"translate(-50%,-50%)",
        animation:"orbPulse 4s ease-in-out infinite reverse"
      }}/>

      {/* Main Content */}
      <div style={{
        position:"relative", zIndex:1,
        display:"flex", flexDirection:"column",
        alignItems:"center", gap:"28px",
        textAlign:"center"
      }}>
        {/* Letters */}
        <div style={{display:"flex", gap:"4px", perspective:"1000px"}}>
          {letters.map((letter, i) => (
            <span key={i} style={{
              fontFamily:"'Space Grotesk', sans-serif",
              fontSize:"clamp(52px, 11vw, 130px)",
              fontWeight:900,
              background:"linear-gradient(135deg, #7C3AED, #06B6D4)",
              WebkitBackgroundClip:"text",
              WebkitTextFillColor:"transparent",
              backgroundClip:"text",
              display:"inline-block",
              opacity:0,
              animation:`letterPunch 0.7s cubic-bezier(0.17,0.89,0.32,1.49) 
                         ${i * 130}ms forwards`,
            }}>
              {letter}
            </span>
          ))}
        </div>

        {/* Subtitle */}
        <div style={{
          fontFamily:"'Inter', sans-serif",
          fontSize:"clamp(12px, 2vw, 17px)",
          color:"rgba(255,255,255,0.45)",
          letterSpacing:"4px",
          textTransform:"uppercase",
          opacity: phase >= 1 ? 1 : 0,
          transform: phase >= 1 ? "translateY(0)" : "translateY(20px)",
          transition:"all 0.8s ease"
        }}>
          Powered by Groq · Llama 3.3 70B
        </div>

        {/* Created by */}
        <div style={{
          fontFamily:"'Inter', sans-serif",
          fontSize:"clamp(14px, 2.5vw, 20px)",
          color:"rgba(255,255,255,0.7)",
          opacity: phase >= 2 ? 1 : 0,
          transform: phase >= 2 ? "translateY(0)" : "translateY(15px)",
          transition:"all 0.8s ease 0.2s",
          letterSpacing:"1px"
        }}>
          Created by{" "}
          <span style={{
            color:"#F59E0B",
            fontWeight:800,
            fontSize:"1.25em",
            textShadow:"0 0 20px rgba(245,158,11,0.8), 0 0 40px rgba(245,158,11,0.4)"
          }}>
            Indra
          </span>
        </div>
      </div>

      <style>{`
        @keyframes letterPunch {
          0% { 
            opacity:0; 
            transform:translateZ(-3000px) scale(0.01) rotateX(90deg);
            filter:blur(30px);
          }
          60% { 
            opacity:1; 
            transform:translateZ(50px) scale(1.2) rotateX(-5deg);
            filter:blur(0);
          }
          80% { transform:translateZ(-15px) scale(0.96); }
          100% { 
            opacity:1; 
            transform:translateZ(0) scale(1) rotateX(0);
            filter:blur(0);
          }
        }
        @keyframes orbPulse {
          0%,100% { transform:translate(-50%,-50%) scale(1); opacity:0.8; }
          50% { transform:translate(-50%,-50%) scale(1.2); opacity:1; }
        }
      `}</style>
    </div>
  );
}
