import { useEffect, useState } from "react";
import type { ReactionEvent } from "@shared/gameTypes";

interface FloatingEmoji {
  id: string;
  emoji: string;
  fromName: string;
  left: number; // vw %
  drift: number; // px
  duration: number; // s
}

interface EmojiRainProps {
  /** En son gelen reaksiyon olayı */
  reaction: ReactionEvent | null;
}

/** Ekranda alttan yukarı uçan emoji animasyonu */
export default function EmojiRain({ reaction }: EmojiRainProps) {
  const [items, setItems] = useState<FloatingEmoji[]>([]);

  useEffect(() => {
    if (!reaction) return;
    // Tek reaksiyon için 3-5 emoji yağdır
    const count = 4;
    const created: FloatingEmoji[] = [];
    for (let i = 0; i < count; i++) {
      created.push({
        id: `${reaction.id}_${i}`,
        emoji: reaction.emoji,
        fromName: reaction.fromName,
        left: 20 + Math.random() * 60,
        drift: (Math.random() - 0.5) * 120,
        duration: 2.2 + Math.random() * 1.2,
      });
    }
    setItems((prev) => [...prev, ...created]);
    const maxDur = Math.max(...created.map((c) => c.duration)) * 1000 + 200;
    const t = setTimeout(() => {
      setItems((prev) => prev.filter((it) => !created.some((c) => c.id === it.id)));
    }, maxDur);
    return () => clearTimeout(t);
  }, [reaction]);

  if (items.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[55] pointer-events-none overflow-hidden">
      {items.map((it) => (
        <div
          key={it.id}
          className="absolute bottom-16 flex flex-col items-center"
          style={{
            left: `${it.left}%`,
            // @ts-expect-error - custom property
            "--drift": `${it.drift}px`,
            animation: `emoji-float ${it.duration}s ease-out forwards`,
          }}
        >
          <span className="text-4xl drop-shadow-lg">{it.emoji}</span>
        </div>
      ))}
    </div>
  );
}
