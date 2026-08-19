// src/components/Intro.jsx
// ─────────────────────────────────────────────────────────────────────────────
// SIGMA-GPT — Cinematic 3D Landing Experience
// A controlled, movie-like opening: darkness → AI core → brand reveal →
// developer credit → enter experience (Sign In / Create Account / Guest).
//
// Engineered by GURRAM INDRASENA YADAV
//
// Performance & accessibility:
//  • three.js is lazy-loaded (dynamic import) so the main app is unaffected.
//  • Quality tiers: low-end devices get fewer particles + lower pixel ratio.
//  • Automatic CSS fallback when WebGL is unavailable.
//  • prefers-reduced-motion → skips the cinematic entirely (entry panel only).
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/intro.css";

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext("webgl2") || c.getContext("webgl") || c.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

function detectQuality() {
  const ua = navigator.userAgent || "";
  const isMobile =
    /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (window.innerWidth || 0) < 768;
  const mem = navigator.deviceMemory || 8;
  const cores = navigator.hardwareConcurrency || 8;
  return isMobile || mem <= 4 || cores <= 4 ? "low" : "high";
}

/* Build a glow sprite texture via a tiny canvas (no external assets). */
function makeGlowTexture(THREE) {
  const size = 256;
  const cv = document.createElement("canvas");
  cv.width = size;
  cv.height = size;
  const ctx = cv.getContext("2d");
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.25, "rgba(255,255,255,0.55)");
  grad.addColorStop(0.6, "rgba(255,255,255,0.12)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ─── Builds the three.js scene. Returns handles for cleanup. ─── */
function buildScene(THREE, host, quality) {
  host.innerHTML = ""; // clear any previous canvas (StrictMode safety)

  const canvas = document.createElement("canvas");
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0A0C12);
  scene.fog = new THREE.FogExp2(0x0A0C12, 0.045);

  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 120);
  camera.position.set(0, 0, 9.5);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: quality === "high",
    powerPreference: "high-performance",
    alpha: false,
  });
  const dpr = Math.min(window.devicePixelRatio || 1, quality === "high" ? 2 : 1.4);
  renderer.setPixelRatio(dpr);
  renderer.setSize(host.clientWidth || window.innerWidth, host.clientHeight || window.innerHeight);

  const coreGroup = new THREE.Group();
  scene.add(coreGroup);

  // Inner glowing sphere (deep blue)
  const innerGeo = new THREE.SphereGeometry(0.82, 28, 28);
  const innerMat = new THREE.MeshBasicMaterial({ color: 0x027CFE, transparent: true, opacity: 0.65 });
  const inner = new THREE.Mesh(innerGeo, innerMat);
  coreGroup.add(inner);

  // Wireframe shells (subtle cyan / blue)
  const shellGeo = new THREE.IcosahedronGeometry(1.12, 1);
  const shellMat = new THREE.MeshBasicMaterial({ color: 0xA6ACB8, wireframe: true, transparent: true, opacity: 0.2 });
  const shell = new THREE.Mesh(shellGeo, shellMat);
  coreGroup.add(shell);

  const shell2Geo = new THREE.OctahedronGeometry(1.55, 0);
  const shell2Mat = new THREE.MeshBasicMaterial({ color: 0x027CFE, wireframe: true, transparent: true, opacity: 0.1 });
  const shell2 = new THREE.Mesh(shell2Geo, shell2Mat);
  coreGroup.add(shell2);

  // Halo glow sprite
  const glowSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: makeGlowTexture(THREE),
      color: 0x027CFE,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  glowSprite.scale.set(7, 7, 1);
  coreGroup.add(glowSprite);

  // Point light pulses inside the core
  const light = new THREE.PointLight(0x027CFE, 1.1, 30);
  coreGroup.add(light);

  // Orbital rings (3, tilted, rotating) + orbiting node points
  const ringConfigs = [
    { radius: 2.15, tilt: 0.42, speed: 0.16, color: 0x027CFE, nodes: quality === "high" ? 26 : 14 },
    { radius: 2.75, tilt: -0.6, speed: -0.1, color: 0x1688FF, nodes: quality === "high" ? 22 : 12 },
    { radius: 3.4, tilt: 1.05, speed: 0.07, color: 0x027CFE, nodes: quality === "high" ? 18 : 10 },
  ];
  const ringLines = [];
  const ringNodes = [];
  ringConfigs.forEach((cfg) => {
    const seg = quality === "high" ? 96 : 48;
    const pts = [];
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * cfg.radius, Math.sin(a) * cfg.radius, 0));
    }
    const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
    const lineMat = new THREE.LineBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.28 });
    const line = new THREE.LineLoop(lineGeo, lineMat);
    line.rotation.x = cfg.tilt;
    line.userData.speed = cfg.speed;
    coreGroup.add(line);
    ringLines.push(line);

    const positions = new Float32Array(cfg.nodes * 3);
    for (let i = 0; i < cfg.nodes; i++) {
      const a = (i / cfg.nodes) * Math.PI * 2;
      positions[i * 3] = Math.cos(a) * cfg.radius;
      positions[i * 3 + 1] = Math.sin(a) * cfg.radius;
      positions[i * 3 + 2] = 0;
    }
    const nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const nodeMat = new THREE.PointsMaterial({
      color: cfg.color,
      size: 0.07,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const nodes = new THREE.Points(nodeGeo, nodeMat);
    nodes.rotation.x = cfg.tilt;
    nodes.userData.speed = cfg.speed;
    coreGroup.add(nodes);
    ringNodes.push(nodes);
  });

  // Neural connections — lines radiating from the core
  const neuralCount = quality === "high" ? 90 : 40;
  const neuralPositions = new Float32Array(neuralCount * 6);
  for (let i = 0; i < neuralCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 1.3 + Math.random() * 2.1;
    neuralPositions[i * 6] = 0;
    neuralPositions[i * 6 + 1] = 0;
    neuralPositions[i * 6 + 2] = 0;
    neuralPositions[i * 6 + 3] = Math.sin(phi) * Math.cos(theta) * r;
    neuralPositions[i * 6 + 4] = Math.sin(phi) * Math.sin(theta) * r;
    neuralPositions[i * 6 + 5] = Math.cos(phi) * r;
  }
  const neuralGeo = new THREE.BufferGeometry();
  neuralGeo.setAttribute("position", new THREE.BufferAttribute(neuralPositions, 3));
  const neuralMat = new THREE.LineBasicMaterial({ color: 0x027CFE, transparent: true, opacity: 0.07 });
  const neural = new THREE.LineSegments(neuralGeo, neuralMat);
  coreGroup.add(neural);

  // Ambient dust cloud (distant starfield)
  const dustCount = quality === "high" ? 1100 : 420;
  const dustPositions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 8 + Math.random() * 16;
    dustPositions[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
    dustPositions[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * r;
    dustPositions[i * 3 + 2] = Math.cos(phi) * r;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
  const dustMat = new THREE.PointsMaterial({
    color: 0xA6ACB8,
    size: 0.05,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);

  // ─── Animation loop ───
  const clock = new THREE.Clock();
  let elapsed = 0;

  const animate = () => {
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;

    // Core emerges between ~2.3s and ~5.5s
    const coreT = easeOutCubic(clamp01((elapsed - 2.3) / 3.2));
    coreGroup.scale.setScalar(coreT);

    // Ambient dust fades in during the darkness phase
    dustMat.opacity = clamp01(elapsed / 3.5) * (quality === "high" ? 0.55 : 0.4);

    // Slow rotations (cheap, additive)
    inner.rotation.y += dt * 0.08;
    shell.rotation.y += dt * 0.22;
    shell.rotation.x += dt * 0.06;
    shell2.rotation.y -= dt * 0.12;
    shell2.rotation.z += dt * 0.05;
    ringLines.forEach((r) => { r.rotation.z += dt * r.userData.speed; });
    ringNodes.forEach((n) => { n.rotation.z += dt * n.userData.speed; });

    // Light pulse
    const pulse = (Math.sin(elapsed * 1.5) + 1) / 2;
    innerMat.opacity = 0.7 + pulse * 0.3;
    glowSprite.material.opacity = 0.35 + pulse * 0.25;
    light.intensity = 1.0 + pulse * 0.9;

    // Cinematic camera: subtle sway + gentle push-in
    const pull = clamp01((elapsed - 1) / 6);
    camera.position.z = 9.5 - pull * 1.2;
    camera.position.x = Math.sin(elapsed * 0.14) * 0.35;
    camera.position.y = Math.cos(elapsed * 0.11) * 0.28;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  };
  renderer.setAnimationLoop(animate);

  const onResize = () => {
    const w = host.clientWidth || window.innerWidth;
    const h = host.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener("resize", onResize);

  const dispose = () => {
    renderer.setAnimationLoop(null);
    window.removeEventListener("resize", onResize);
    scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
          if (m.map) m.map.dispose();
          m.dispose();
        });
      }
    });
    renderer.dispose();
    if (canvas.parentNode === host) host.removeChild(canvas);
  };

  return { renderer, dispose };
}

/* ─── CSS fallback when WebGL is unavailable ─── */
function CssFallback() {
  const particles = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        left: (i * 37 + 11) % 100,
        top: (i * 23 + 7) % 100,
        size: 2 + ((i * 7) % 4),
        delay: (i % 9) * 0.7,
        duration: 7 + ((i * 3) % 6),
        hue: i % 2 === 0 ? 199 : 210,
      })),
    []
  );
  return (
    <div className="ci-fallback" aria-hidden="true">
      <div className="ci-fallback-orb ci-fallback-orb--a" />
      <div className="ci-fallback-orb ci-fallback-orb--b" />
      <div className="ci-fallback-orb ci-fallback-orb--c" />
      {particles.map((p, i) => (
        <span
          key={i}
          className="ci-fallback-particle"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            background: `hsla(210, 90%, 50%, 0.35)`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Main intro component ─── */
export default function Intro({ onComplete }) {
  const navigate = useNavigate();
  const canvasHostRef = useRef(null);
  const [reducedMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  // Reduced motion / no-WebGL are known at mount — derive initial state, no effects needed.
  const [phase, setPhase] = useState(() => (reducedMotion ? 4 : 0));
  const [mode, setMode] = useState(() => {
    if (reducedMotion) return "static";
    if (!webglAvailable()) return "css";
    return "boot";
  });
  const [exiting, setExiting] = useState(false);
  const modeRef = useRef(mode);

  const TITLE = "SIGMA-GPT";

  // ─── Phase timeline (cinematic sequence) ───
  useEffect(() => {
    if (reducedMotion) return undefined;
    const timers = [
      setTimeout(() => setPhase(1), 2500), // AI core emerges
      setTimeout(() => setPhase(2), 5500), // SIGMA-GPT reveal
      setTimeout(() => setPhase(3), 8700), // developer credit
      setTimeout(() => setPhase(4), 11800), // enter experience
    ];
    return () => timers.forEach(clearTimeout);
  }, [reducedMotion]);

  // ─── three.js scene (lazy) — runs once; no sync setState in the body ───
  useEffect(() => {
    if (reducedMotion || modeRef.current === "css") return undefined;
    let disposed = false;
    let cleanupScene = null;

    (async () => {
      try {
        const THREE = await import("three");
        if (disposed || !canvasHostRef.current) return;
        const built = buildScene(THREE, canvasHostRef.current, detectQuality());
        cleanupScene = built.dispose;
        if (!disposed) setMode("webgl");
      } catch (err) {
        console.warn("[Intro] 3D renderer unavailable — using CSS fallback:", err);
        if (!disposed) setMode("css");
      }
    })();

    return () => {
      disposed = true;
      if (cleanupScene) cleanupScene();
    };
  }, [reducedMotion]);

  // ─── Exit / navigation ───
  const exit = useCallback(
    (target) => {
      if (exiting) return;
      setExiting(true);
      setTimeout(() => {
        if (target === "guest") {
          localStorage.setItem("sigma_username", "Guest");
          localStorage.removeItem("sigma_token");
          navigate("/chat");
        } else if (target === "login") {
          navigate("/login");
        } else if (target === "register") {
          navigate("/register");
        } else {
          navigate("/");
        }
        onComplete();
      }, 650);
    },
    [navigate, onComplete, exiting]
  );

  const entryVisible = phase >= 4;

  return (
    <div className={"cinematic-intro" + (exiting ? " ci-exiting" : "")}>
      {/* 3D / fallback backdrop */}
      <div ref={canvasHostRef} className="ci-canvas-host" />
      {mode === "css" && <CssFallback />}
      {mode === "static" && <div className="ci-static-bg" aria-hidden="true" />}

      {/* Cinematic grade */}
      <div className="ci-vignette" aria-hidden="true" />
      <div className={"ci-letterbox ci-letterbox--top" + (entryVisible ? " ci-letterbox--open" : "")} aria-hidden="true" />
      <div className={"ci-letterbox ci-letterbox--bottom" + (entryVisible ? " ci-letterbox--open" : "")} aria-hidden="true" />

      {/* Skip Intro */}
      <button type="button" className="ci-skip" onClick={() => exit("default")}>
        Skip Intro <span aria-hidden="true">→</span>
      </button>

      {/* Center stage */}
      <div className="ci-stage">
        {/* Boot marker (darkness phase) */}
        <p className={"ci-boot" + (phase >= 2 ? " ci-hidden" : "")}>INITIALIZING NEURAL CORE</p>

        {/* Brand reveal */}
        <div
          className={
            "ci-title-wrap" +
            (phase >= 2 ? " is-visible" : "") +
            (entryVisible ? " ci-fade-out" : "")
          }
        >
          <h1 className="ci-title" aria-label={TITLE}>
            {TITLE.split("").map((ch, i) => (
              <span key={i} className="ci-letter" style={{ transitionDelay: `${i * 70}ms` }}>
                {ch === " " ? "\u00A0" : ch}
              </span>
            ))}
          </h1>
          <p className="ci-subtitle">An Intelligent AI Conversation Experience</p>
        </div>

        {/* Developer credit */}
        <div
          className={
            "ci-credit" +
            (phase >= 3 ? " is-visible" : "") +
            (entryVisible ? " ci-fade-out" : "")
          }
        >
          <span className="ci-credit-line" />
          <p className="ci-credit-label">ENGINEERED BY</p>
          <p className="ci-credit-name">GURRAM INDRASENA YADAV</p>
        </div>

        {/* Enter experience */}
        <div className={"ci-entry" + (entryVisible ? " is-visible" : "")}>
          <div className="ci-entry-card">
            <h2 className="ci-entry-title">Enter the Experience</h2>
            <p className="ci-entry-subtitle">Sign in, create an account, or continue as a guest.</p>
            <div className="ci-entry-actions">
              <button type="button" className="ci-btn ci-btn--primary" onClick={() => exit("login")}>
                Sign In
              </button>
              <button type="button" className="ci-btn ci-btn--secondary" onClick={() => exit("register")}>
                Create Account
              </button>
              <button type="button" className="ci-btn ci-btn--ghost" onClick={() => exit("guest")}>
                Continue as Guest
              </button>
            </div>
            <p className="ci-entry-note">Guest mode provides text-only AI messaging.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
