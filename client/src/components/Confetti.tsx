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
}

const COLORS = ["#a855f7", "#22c55e", "#eab308", "#ef4444", "#3b82f6", "#ec4899", "#f97316"];

/** Tam ekran konfeti patlaması (canvas, harici kütüphane yok) */
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
    ctx.scale(dpr, dpr);

    const W = window.innerWidth;
    const H = window.innerHeight;

    // Yeni partiküller ekle (iki kaynaktan)
    const newParticles: Particle[] = [];
    const sources = [
      { x: W * 0.5, y: H * 0.35 },
    ];
    for (const src of sources) {
      for (let i = 0; i < 90; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 4 + Math.random() * 9;
        newParticles.push({
          x: src.x,
          y: src.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 4,
          size: 5 + Math.random() * 7,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          rot: Math.random() * Math.PI,
          vrot: (Math.random() - 0.5) * 0.3,
          life: 1,
        });
      }
    }
    particlesRef.current = [...particlesRef.current, ...newParticles];

    const gravity = 0.18;
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
        p.life -= 0.008;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
      particlesRef.current = parts.filter((p) => p.life > 0 && p.y < H + 40);
      if (particlesRef.current.length > 0) {
        rafRef.current = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, W, H);
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
