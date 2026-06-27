import { Button } from "@/components/ui/button";
import type { PublicGameState } from "@shared/gameTypes";
import { RotateCcw, Trophy, Skull, ScrollText } from "lucide-react";

interface GameOverProps {
  state: PublicGameState;
  myId: string;
  isHost: boolean;
  onRematch: () => void;
  onLeave: () => void;
}

export default function GameOver({ state, myId, isHost, onRematch, onLeave }: GameOverProps) {
  const loser = state.players.find((p) => p.id === state.loserId);
  const iAmLoser = state.loserId === myId;

  // Kurtulanlar (kazananlar): saved=true, rank'e göre sırala
  const winners = state.players
    .filter((p) => p.saved && !p.isSpectator)
    .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));

  return (
    <div className={iAmLoser ? "relative ceza-shake" : "relative"}>
      {/* Kaybeden için tam ekran kırmızı dramatik yanıp sönme + titreşim */}
      {iAmLoser && (
        <div className="ceza-flash fixed inset-0 z-[40] pointer-events-none" />
      )}

      <div className="announce-in text-center py-4 relative z-[45]">
        {iAmLoser ? (
          <>
            <div className="ceza-text inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-destructive/25 border-2 border-destructive mb-4">
              <Skull className="w-12 h-12 text-destructive" />
            </div>
            <h2 className="ceza-text text-4xl sm:text-5xl font-black text-destructive mb-2 tracking-tight">
              CEZA SENİN!
            </h2>
            <p className="text-muted-foreground mb-6">
              Son kalan sendin, herkes kurtuldu. Cezayı sen ödüyorsun! 💀
            </p>
          </>
        ) : (
          <>
            <div className="win-bounce inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-emerald-500/20 border-2 border-emerald-400 mb-4">
              <Trophy className="w-12 h-12 text-emerald-400" />
            </div>
            <h2 className="text-3xl font-black mb-1 text-emerald-400">Kurtuldun! 🎉</h2>
            <p className="text-muted-foreground mb-6">
              {loser ? (
                <>
                  Ceza <span className="font-bold text-destructive">{loser.name}</span>'a/e kaldı!
                </>
              ) : (
                "Oyun sona erdi."
              )}
            </p>
          </>
        )}

        {/* Kurtulma sıralaması (kazananlar) */}
        <div className="mb-5 text-left max-w-sm mx-auto space-y-1.5">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5" /> Kurtulma Sırası
          </p>
          {winners.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-2"
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/30 text-emerald-300 text-xs font-black">
                  {p.rank}
                </span>
                {p.name}
                {p.id === myId && <span className="text-xs text-emerald-400">(sen)</span>}
              </span>
              <span className="text-xs text-emerald-400">
                {p.eliminatedByNumber != null ? `${p.eliminatedByNumber} ile kurtuldu` : "kurtuldu"}
              </span>
            </div>
          ))}
          {loser && (
            <div className="flex items-center justify-between rounded-xl bg-destructive/15 border border-destructive/40 px-3 py-2">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Skull className="h-4 w-4 text-destructive" />
                {loser.name}
                {loser.id === myId && <span className="text-xs text-destructive">(sen)</span>}
              </span>
              <span className="text-xs text-destructive font-bold">CEZALI</span>
            </div>
          )}
        </div>

        {/* Söylenen sayılar geçmişi */}
        {state.history.length > 0 && (
          <details className="mb-5 text-left max-w-sm mx-auto rounded-xl bg-card/50 border border-border">
            <summary className="cursor-pointer select-none px-3 py-2 text-sm font-bold flex items-center gap-1.5">
              <ScrollText className="h-4 w-4" /> Söylenen Sayılar ({state.history.length})
            </summary>
            <div className="px-3 pb-3 space-y-1 max-h-52 overflow-y-auto">
              {state.history.map((h, i) => (
                <div key={i} className="text-xs flex items-center justify-between gap-2 py-0.5">
                  <span className="text-muted-foreground">
                    <span className="font-bold text-foreground">{h.byName}</span> →{" "}
                    <span className="font-mono font-bold text-primary">{h.number}</span>
                  </span>
                  <span className={h.eliminatedName ? "text-emerald-400" : "text-muted-foreground"}>
                    {h.eliminatedName ? `${h.eliminatedName} kurtuldu` : "boşa gitti"}
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}

        {isHost ? (
          <Button className="w-full h-12 font-bold mb-2" onClick={onRematch}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Yeniden Oyna
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground mb-2">
            Oda sahibinin yeni oyunu başlatması bekleniyor...
          </p>
        )}
        <Button variant="ghost" className="w-full" onClick={onLeave}>
          Odadan Ayrıl
        </Button>
      </div>
    </div>
  );
}
