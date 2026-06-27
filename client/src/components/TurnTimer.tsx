import { TURN_DURATION_SEC } from "@shared/gameTypes";
import { Timer } from "lucide-react";
import { useEffect, useState } from "react";

interface TurnTimerProps {
  turnEndsAt: number | null;
  /** Sıra bu oyuncuda mı (haptic/uyarı için) */
  isMyTurn: boolean;
}

/** Sırası gelen oyuncuya geri sayım gösteren çubuk */
export default function TurnTimer({ turnEndsAt, isMyTurn }: TurnTimerProps) {
  const [remaining, setRemaining] = useState(TURN_DURATION_SEC);

  useEffect(() => {
    if (!turnEndsAt) {
      setRemaining(TURN_DURATION_SEC);
      return;
    }
    const tick = () => {
      const ms = turnEndsAt - Date.now();
      setRemaining(Math.max(0, ms / 1000));
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [turnEndsAt]);

  if (!turnEndsAt) return null;

  const pct = Math.max(0, Math.min(100, (remaining / TURN_DURATION_SEC) * 100));
  const critical = remaining <= 5;
  const secs = Math.ceil(remaining);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1 text-xs">
        <span className="flex items-center gap-1 text-muted-foreground">
          <Timer className="h-3.5 w-3.5" /> Süre
        </span>
        <span className={`font-mono font-bold ${critical ? "timer-critical" : ""}`}>
          {secs}s
        </span>
      </div>
      <div className="h-2 rounded-full bg-card/70 border border-border overflow-hidden">
        <div
          className={`h-full rounded-full transition-[width] duration-100 ease-linear ${
            critical ? "bg-destructive" : isMyTurn ? "bg-primary" : "bg-accent"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
