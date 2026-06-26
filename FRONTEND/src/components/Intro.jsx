import { useEffect, useRef, useState } from "react";

export default function Intro({ onComplete }) {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState(0);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;
    let t = 0;

    // DNA Helix particles
    const dnaParticles = Array.from({length: 200}, (_, i) => ({
      angle: (i / 200) * Math.PI * 8,
      offset: (i / 200) * H * 2 - H,
      strand: i % 2,
      speed: 0.02,
      size: Math.random() * 3 + 1,
    }));

    // Stars
    const stars = Array.from({length: 300}, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      size: Math.random() * 1.5,
      twinkle: Math.random() * Math.PI * 2,
    }));

    // Sphere particles
    const sphereParticles = Array.from({length: 150}, (_, i) => ({
      theta: Math.random() * Math.PI * 2,
      phi: Math.random() * Math.PI,
      r: 120,
      speed: (Math.random() - 0.5) * 0.02,
    }));

    // Orbiting rings
    const rings = Array.from({length: 5}, (_, i) => ({
      radius: 150 + i * 40,
      angle: (i / 5) * Math.PI * 2,
      tilt: (i / 5) * Math.PI * 0.5,
      speed: 0.005 + i * 0.003,
    }));

    const draw = () => {
      t += 0.016;
      ctx.clearRect(0, 0, W, H);

      // Background gradient
      const bg = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W*0.7);
      bg.addColorStop(0, "#071210");
      bg.addColorStop(1, "#050508");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Stars
      stars.forEach(s => {
        const twinkle = 0.4 + 0.6 * Math.sin(s.twinkle + t * 2);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${twinkle * 0.8})`;
        ctx.fill();
      });

      if (t < 4) {
        // PHASE 1: DNA HELIX
        const cx = W / 2, cy = H / 2;
        dnaParticles.forEach((p, i) => {
          const progress = Math.min(t / 2, 1);
          const a = p.angle + t * 0.5;
          const x = cx + Math.cos(a + p.strand * Math.PI) * 120 * progress;
          const y = cy + (p.offset * 0.3) * progress;
          const z = Math.sin(a) * 0.5 + 0.5;

          const color = p.strand === 0
            ? `rgba(0,255,136,${z * 0.9 * progress})`
            : `rgba(14,165,233,${z * 0.9 * progress})`;

          ctx.beginPath();
          ctx.arc(x, y, p.size * z, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();

          // Connect strands
          if (i % 10 === 0 && i + 1 < dnaParticles.length) {
            const next = dnaParticles[i + 1];
            const na = next.angle + t * 0.5;
            const nx = cx + Math.cos(na + next.strand * Math.PI) * 120 * progress;
            const ny = cy + (next.offset * 0.3) * progress;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(nx, ny);
            ctx.strokeStyle = `rgba(255,255,255,${0.1 * progress})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      }

      if (t >= 2 && t < 6) {
        // PHASE 2: LIQUID SPHERE + RINGS
        const cx = W / 2, cy = H / 2;
        const progress = Math.min((t - 2) / 2, 1);

        // Outer glow
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 280 * progress);
        glow.addColorStop(0, `rgba(0,255,136,${0.3 * progress})`);
        glow.addColorStop(0.5, `rgba(14,165,233,${0.15 * progress})`);
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, W, H);

        // Sphere surface
        sphereParticles.forEach(p => {
          p.theta += p.speed;
          const r = 100 * progress;
          const x = cx + r * Math.sin(p.phi) * Math.cos(p.theta + t * 0.3);
          const y = cy + r * Math.sin(p.phi) * Math.sin(p.theta + t * 0.3) * 0.4;
          const brightness = (Math.sin(p.theta + t) * 0.5 + 0.5);
          const grad = ctx.createRadialGradient(x, y, 0, x, y, 4);
          grad.addColorStop(0, `rgba(200,255,220,${brightness * progress})`);
          grad.addColorStop(1, `rgba(0,255,136,0)`);
          ctx.beginPath();
          ctx.arc(x, y, 3 * brightness, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        });

        // Orbiting rings
        rings.forEach((ring, i) => {
          ring.angle += ring.speed;
          const r = ring.radius * progress;
          ctx.beginPath();
          ctx.ellipse(
            cx, cy,
            r, r * Math.abs(Math.sin(ring.tilt + t * 0.1 + i)),
            ring.angle, 0, Math.PI * 2
          );
          const ringColor = i % 2 === 0
            ? `rgba(0,255,136,${0.4 * progress})`
            : `rgba(14,165,233,${0.4 * progress})`;
          ctx.strokeStyle = ringColor;
          ctx.lineWidth = 1.5;
          ctx.shadowBlur = 15;
          ctx.shadowColor = i % 2 === 0 ? "#00FF88" : "#0EA5E9";
          ctx.stroke();
          ctx.shadowBlur = 0;
        });
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  // Phase timing
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 2000);
    const t2 = setTimeout(() => setPhase(2), 4000);
    const t3 = setTimeout(() => setPhase(3), 6000);
    const t4 = setTimeout(() => onComplete(), 7200);
    return () => [t1,t2,t3,t4].forEach(clearTimeout);
  }, [onComplete]);

  const letters = ["S","I","G","M","A","-","G","P","T"];

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:9999,
      overflow:"hidden", background:"#030308",
      opacity: phase === 3 ? 0 : 1,
      transition: phase === 3 ? "opacity 1s ease" : "none"
    }}>
      <canvas ref={canvasRef} style={{
        position:"absolute", inset:0, width:"100%", height:"100%"
      }}/>

      {/* Logo reveal */}
      <div style={{
        position:"absolute", inset:0, zIndex:1,
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        gap:"20px"
      }}>
        {/* Letters */}
        <div style={{
          display:"flex", gap:"2px",
          perspective:"1200px"
        }}>
          {letters.map((letter, i) => (
            <span key={i} style={{
              fontFamily:"'Space Grotesk', sans-serif",
              fontSize:"clamp(44px, 10vw, 120px)",
              fontWeight:900,
              background:"linear-gradient(135deg, #00FF88, #0EA5E9)",
              WebkitBackgroundClip:"text",
              WebkitTextFillColor:"transparent",
              backgroundClip:"text",
              display:"inline-block",
              opacity: phase >= 2 ? 1 : 0,
              transform: phase >= 2
                ? "translateZ(0) scale(1) rotateX(0deg)"
                : "translateZ(-3000px) scale(0) rotateX(90deg)",
              transition: `all 0.7s cubic-bezier(0.17,0.89,0.32,1.49) 
                          ${i * 80}ms`,
              filter: phase >= 2 ? "blur(0)" : "blur(20px)",
              textShadow: phase >= 2
                ? "0 0 40px rgba(0,255,136,0.5)" : "none"
            }}>
              {letter}
            </span>
          ))}
        </div>

        {/* Subtitle */}
        <p style={{
          fontFamily:"'Inter', sans-serif",
          fontSize:"clamp(11px, 2vw, 16px)",
          color:"rgba(255,255,255,0.4)",
          letterSpacing:"5px",
          textTransform:"uppercase",
          opacity: phase >= 2 ? 1 : 0,
          transform: phase >= 2 ? "translateY(0)" : "translateY(30px)",
          transition:"all 0.8s ease 0.8s",
          margin:0
        }}>
          Powered by Groq · Llama 3.3 70B
        </p>

        {/* Created by Indra */}
        <p style={{
          fontFamily:"'Inter', sans-serif",
          fontSize:"clamp(13px, 2.5vw, 19px)",
          color:"rgba(240,255,244,0.6)",
          opacity: phase >= 2 ? 1 : 0,
          transform: phase >= 2 ? "translateY(0)" : "translateY(20px)",
          transition:"all 0.8s ease 1.2s",
          margin:0, letterSpacing:"1px"
        }}>
          Created by{" "}
          <span style={{
            color:"#00FF88", fontWeight:800, fontSize:"1.2em",
            textShadow:"0 0 30px rgba(0,255,136,0.9)"
          }}>Indra</span>
        </p>
      </div>
    </div>
  );
}
