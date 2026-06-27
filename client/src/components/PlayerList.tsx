import { cn } from "@/lib/utils";
import type { PublicGameState } from "@shared/gameTypes";
import { Check, Crown, Eye, Hourglass, PartyPopper, WifiOff } from "lucide-react";

interface PlayerListProps {
  state: PublicGameState;
  myId: string;
}

export default function PlayerList({ state, myId }: PlayerListProps) {
  const { players, phase, currentTurnPlayerId, hostId } = state;

  return (
    <div className="space-y-1.5">
      {players.map((p) => {
        const isTurn = phase === "playing" && currentTurnPlayerId === p.id;
        const isMe = p.id === myId;
        return (
          <div
            key={p.id}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3 py-2 border transition-colors",
              isTurn
                ? "bg-primary/20 border-primary glow-pulse"
                : "bg-card/50 border-border",
              p.eliminated && !p.isSpectator && "opacity-60",
              p.isSpectator && "opacity-50"
            )}
          >
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                p.saved
                  ? "bg-emerald-500/30 text-emerald-300"
                  : p.eliminated
                  ? "bg-muted text-muted-foreground"
                  : "bg-primary/30 text-primary"
              )}
            >
              {p.name.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate font-semibold text-sm">
                  {p.name}
                  {isMe && <span className="text-muted-foreground font-normal"> (sen)</span>}
                </span>
                {p.id === hostId && <Crown className="h-3.5 w-3.5 shrink-0 text-amber-400" />}
                {!p.connected && <WifiOff className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {p.isSpectator
                  ? "İzleyici"
                  : p.saved
                  ? `Kurtuldu${p.eliminatedByNumber ? ` (${p.eliminatedByNumber})` : ""}`
                  : p.eliminated
                  ? "İzleyici"
                  : isTurn
                  ? "Sırası onda"
                  : phase === "selecting"
                  ? p.hasSecret
                    ? "Sayısını seçti"
                    : "Sayı seçiyor..."
                  : "Oyunda"}
              </div>
            </div>

            {/* Sağ durum ikonu */}
            <div className="shrink-0">
              {p.saved ? (
                <PartyPopper className="h-4 w-4 text-emerald-400" />
              ) : p.isSpectator ? (
                <Eye className="h-4 w-4 text-muted-foreground" />
              ) : p.eliminated ? (
                <Eye className="h-4 w-4 text-muted-foreground" />
              ) : phase === "selecting" ? (
                p.hasSecret ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Hourglass className="h-4 w-4 text-amber-400 animate-pulse" />
                )
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
