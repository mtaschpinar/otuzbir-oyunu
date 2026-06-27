import { useEffect, useRef } from "react";

interface ConfettiProps {
  /** Her artışta yeni bir patlama tetiklenir */
  burstKey: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rot: number;
  vrot: number;
  life: number;
  decay: number;
  /** "rect" normal konfeti, "emoji" emoji yağmuru */
  kind: "rect" | "emoji";
  emoji?: string;
}

// Canlı/neon renk paleti (mor tema + neon yeşil + parlak turuncu)
const COLORS = [
  "#a855f7", // mor
  "#c084fc", // açık mor
  "#39ff14", // neon yeşil
  "#22c55e", // yeşil
  "#ff9500", // parlak turuncu
  "#fbbf24", // amber
  "#22d3ee", // neon cyan
  "#ef4444", // kırmızı
  "#ec4899", // pembe
  "#3b82f6", // mavi
];

const EMOJIS = ["🎉", "🥳", "🎊", "✨", "🏆", "💜", "🟢", "🧡", "⭐"];

/** Tam ekran büyük & gösterişli konfeti patlaması + emoji yağmuru (canvas, harici kütüphane yok) */
export default function Confetti({ burstKey }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (burstKey <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const W = window.innerWidth;
    const H = window.innerHeight;

    const newParticles: Particle[] = [];

    // 1) Büyük merkez patlaması + iki yan patlama (toplam çok daha gösterişli)
    const sources = [
      { x: W * 0.5, y: H * 0.4, count: 160, power: 1.25 },
      { x: W * 0.18, y: H * 0.55, count: 80, power: 1.0 },
      { x: W * 0.82, y: H * 0.55, count: 80, power: 1.0 },
    ];
    for (const src of sources) {
      for (let i = 0; i < src.count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (5 + Math.random() * 12) * src.power;
        newParticles.push({
          x: src.x,
          y: src.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 6,
          size: 6 + Math.random() * 10,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          rot: Math.random() * Math.PI,
          vrot: (Math.random() - 0.5) * 0.4,
          life: 1,
          decay: 0.006 + Math.random() * 0.006,
          kind: "rect",
        });
      }
    }

    // 2) Üstten dökülen şerit konfeti (tam genişlik)
    for (let i = 0; i < 90; i++) {
      newParticles.push({
        x: Math.random() * W,
        y: -20 - Math.random() * H * 0.3,
        vx: (Math.random() - 0.5) * 3,
        vy: 2 + Math.random() * 4,
        size: 7 + Math.random() * 9,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rot: Math.random() * Math.PI,
        vrot: (Math.random() - 0.5) * 0.3,
        life: 1,
        decay: 0.004 + Math.random() * 0.004,
        kind: "rect",
      });
    }

    // 3) Emoji yağmuru (yukarı fırlayıp düşen)
    for (let i = 0; i < 26; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      const speed = 8 + Math.random() * 10;
      newParticles.push({
        x: W * (0.2 + Math.random() * 0.6),
        y: H * 0.45,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 26 + Math.random() * 18,
        color: "#fff",
        rot: (Math.random() - 0.5) * 0.6,
        vrot: (Math.random() - 0.5) * 0.15,
        life: 1,
        decay: 0.005 + Math.random() * 0.004,
        kind: "emoji",
        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      });
    }

    particlesRef.current = [...particlesRef.current, ...newParticles];

    const gravity = 0.2;
    const friction = 0.99;

    const render = () => {
      ctx.clearRect(0, 0, W, H);
      const parts = particlesRef.current;
      for (const p of parts) {
        p.vx *= friction;
        p.vy = p.vy * friction + gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vrot;
        p.life -= p.decay;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, p.life);
        if (p.kind === "emoji" && p.emoji) {
          ctx.font = `${p.size}px serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(p.emoji, 0, 0);
        } else {
          // Parlak konfeti: hafif gölge/parlaklık efekti
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        }
        ctx.restore();
      }
      particlesRef.current = parts.filter((p) => p.life > 0 && p.y < H + 60);
      if (particlesRef.current.length > 0) {
        rafRef.current = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, W, H);
        rafRef.current = null;
      }
    };

    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(render);
    }

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [burstKey]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[60] pointer-events-none"
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}
