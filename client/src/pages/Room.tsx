import AnnouncementBanner from "@/components/AnnouncementBanner";
import CallPanel from "@/components/CallPanel";
import ChatBubbles from "@/components/ChatBubbles";
import Confetti from "@/components/Confetti";
import EmojiRain from "@/components/EmojiRain";
import GameOver from "@/components/GameOver";
import NumberBoard from "@/components/NumberBoard";
import PlayerList from "@/components/PlayerList";
import ReactionBar from "@/components/ReactionBar";
import SecretPicker from "@/components/SecretPicker";
import TurnTimer from "@/components/TurnTimer";
import { Button } from "@/components/ui/button";
import { useGame } from "@/hooks/useGame";
import { getPlayerId } from "@/lib/socket";
import { MIN_PLAYERS } from "@shared/gameTypes";
import {
  Check,
  Copy,
  LogOut,
  Music,
  Music2,
  Share2,
  Users,
  Volume2,
  VolumeX,
  WifiOff,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

export default function Room() {
  const params = useParams();
  const roomCode = (params.code || "").toUpperCase();
  const [, setLocation] = useLocation();
  const myId = getPlayerId();

  const {
    state,
    connected,
    notFound,
    lastAnnouncement,
    lastReaction,
    lastChat,
    soundEnabled,
    setSoundEnabled,
    musicEnabled,
    setMusicEnabled,
    startGame,
    confirmSecret,
    callNumber,
    sendReaction,
    sendChat,
    rematch,
    leave,
  } = useGame(roomCode);

  const [copied, setCopied] = useState(false);
  const [pendingNumber, setPendingNumber] = useState<number | null>(null);
  const [mySecret, setMySecret] = useState<number | null>(null);

  // Konfeti tetikleyici: kurtulma anonsu geldiğinde patlat
  const [confettiKey, setConfettiKey] = useState(0);
  const lastSavedAnnId = useRef<string>("");

  useEffect(() => {
    if (notFound) {
      toast.error("Oda bulunamadı.");
      const t = setTimeout(() => setLocation("/"), 1500);
      return () => clearTimeout(t);
    }
  }, [notFound, setLocation]);

  useEffect(() => {
    if (state?.phase === "lobby" || state?.phase === "selecting") {
      const me = state.players.find((p) => p.id === myId);
      if (me && !me.hasSecret) setMySecret(null);
    }
  }, [state?.phase, state?.players, myId]);

  // "saved" (kurtuldu) anonsunda veya oyun bitiminde konfeti
  useEffect(() => {
    if (lastAnnouncement?.type === "saved") {
      const annId = `${lastAnnouncement.name}_${lastAnnouncement.number}`;
      if (annId !== lastSavedAnnId.current) {
        lastSavedAnnId.current = annId;
        setConfettiKey((k) => k + 1);
      }
    }
  }, [lastAnnouncement]);

  // Oyun bitince kaybeden değilsem konfeti
  useEffect(() => {
    if (state?.phase === "finished" && state.loserId !== myId) {
      setConfettiKey((k) => k + 1);
    }
  }, [state?.phase, state?.loserId, myId]);

  const handleConfirmSecret = async (n: number) => {
    const res = await confirmSecret(n);
    if (res.ok) setMySecret(n);
    return res;
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      toast.success("Oda kodu kopyalandı!");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Kopyalanamadı.");
    }
  };

  const shareRoom = async () => {
    const url = `${window.location.origin}/oda/${roomCode}`;
    const text = `31 oyununa katıl! Oda kodu: ${roomCode}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "31 Oyunu", text, url });
      } catch {
        /* iptal */
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        toast.success("Davet bağlantısı kopyalandı!");
      } catch {
        toast.error("Paylaşılamadı.");
      }
    }
  };

  const handleLeave = () => {
    leave();
    setLocation("/");
  };

  if (!state) {
    return (
      <div className="game-bg min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-primary/20 border border-primary/40 items-center justify-center mb-3 glow-pulse">
            <span className="text-2xl font-black text-primary">31</span>
          </div>
          <p className="text-muted-foreground">
            {notFound ? "Oda bulunamadı, yönlendiriliyorsun..." : "Odaya bağlanılıyor..."}
          </p>
        </div>
      </div>
    );
  }

  const me = state.players.find((p) => p.id === myId);
  const isHost = state.hostId === myId;
  const isSpectator = me?.isSpectator ?? false;
  const amEliminated = me?.eliminated ?? false;
  const myTurn = state.phase === "playing" && state.currentTurnPlayerId === myId && !amEliminated;
  const currentTurnPlayer = state.players.find((p) => p.id === state.currentTurnPlayerId);
  const activePlayers = state.players.filter((p) => !p.isSpectator);
  const readyCount = activePlayers.filter((p) => p.hasSecret).length;
  const inGame = state.phase === "playing";

  return (
    <div className="game-bg min-h-screen w-full">
      <AnnouncementBanner announcement={lastAnnouncement} />
      <EmojiRain reaction={lastReaction} />
      <ChatBubbles lastChat={lastChat} myId={myId} />
      <Confetti burstKey={confettiKey} />

      {/* Üst bar */}
      <header className="sticky top-0 z-40 backdrop-blur bg-background/70 border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-2.5 flex items-center justify-between gap-2">
          <button
            onClick={copyCode}
            className="flex items-center gap-2 rounded-xl bg-card/60 border border-border px-3 py-1.5"
          >
            <span className="text-xs text-muted-foreground">Oda</span>
            <span className="font-black tracking-widest text-lg text-primary">{roomCode}</span>
            {copied ? (
              <Check className="h-4 w-4 text-emerald-400" />
            ) : (
              <Copy className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          <div className="flex items-center gap-1">
            {!connected && (
              <span className="flex items-center gap-1 text-xs text-amber-400 mr-1">
                <WifiOff className="h-3.5 w-3.5" /> Bağlanıyor
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setMusicEnabled(!musicEnabled)}
              title={musicEnabled ? "Müziği kapat" : "Müziği aç"}
            >
              {musicEnabled ? <Music className="h-5 w-5" /> : <Music2 className="h-5 w-5 opacity-50" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? "Sesi kapat" : "Sesi aç"}
            >
              {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleLeave} title="Ayrıl">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 pb-28">
        {/* İzleyici / kurtulma rozeti */}
        {(isSpectator || (amEliminated && state.phase === "playing")) && (
          <div className="mb-4 rounded-xl bg-muted/40 border border-border px-4 py-2.5 text-center text-sm">
            {me?.saved ? (
              <>
                <span className="font-semibold text-emerald-400">Kurtuldun! 🎉</span>{" "}
                <span className="text-muted-foreground">Artık izleyicisin, keyfini çıkar.</span>
              </>
            ) : (
              <>
                <span className="font-semibold">İzleyici modundasın.</span>{" "}
                <span className="text-muted-foreground">Oyunu izlemeye devam edebilirsin.</span>
              </>
            )}
          </div>
        )}

        {/* === LOBİ === */}
        {state.phase === "lobby" && (
          <div className="space-y-5">
            <div className="text-center">
              <h1 className="text-xl font-black mb-1">Lobi</h1>
              <p className="text-sm text-muted-foreground">
                Arkadaşlarını davet et, sonra oyunu başlat.
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1 font-semibold" onClick={copyCode}>
                <Copy className="h-4 w-4 mr-2" /> Kodu Kopyala
              </Button>
              <Button variant="secondary" className="flex-1 font-semibold" onClick={shareRoom}>
                <Share2 className="h-4 w-4 mr-2" /> Paylaş
              </Button>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-sm font-semibold mb-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                Oyuncular ({activePlayers.length}/15)
              </div>
              <PlayerList state={state} myId={myId} />
            </div>

            {isHost ? (
              <Button
                className="w-full h-12 font-bold text-base"
                disabled={activePlayers.length < MIN_PLAYERS}
                onClick={startGame}
              >
                {activePlayers.length < MIN_PLAYERS
                  ? `En az ${MIN_PLAYERS} oyuncu gerekli`
                  : "Oyunu Başlat"}
              </Button>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                Oda sahibinin oyunu başlatması bekleniyor...
              </p>
            )}
          </div>
        )}

        {/* === GİZLİ SAYI SEÇİMİ === */}
        {state.phase === "selecting" && (
          <div className="space-y-5">
            {!isSpectator ? (
              <SecretPicker
                confirmed={me?.hasSecret ?? false}
                confirmedNumber={mySecret}
                onConfirm={handleConfirmSecret}
                waitingCount={readyCount}
                totalCount={activePlayers.length}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Oyuncular gizli sayılarını seçiyor...
              </div>
            )}
            <div>
              <div className="text-sm font-semibold mb-2 text-muted-foreground">
                Hazır olanlar ({readyCount}/{activePlayers.length})
              </div>
              <PlayerList state={state} myId={myId} />
            </div>
          </div>
        )}

        {/* === OYUN === */}
        {state.phase === "playing" && (
          <div className="space-y-4">
            {/* Sıra + süre */}
            <div className="rounded-2xl bg-card/50 border border-border px-4 py-3 space-y-2">
              <p className="text-sm text-center">
                {myTurn ? (
                  <span className="font-bold text-primary">Sıra sende, kardeş! 🎯</span>
                ) : (
                  <>
                    Sıra{" "}
                    <span className="font-bold text-foreground">
                      {currentTurnPlayer?.name || "..."}
                    </span>{" "}
                    oyuncusunda
                  </>
                )}
              </p>
              <TurnTimer turnEndsAt={state.turnEndsAt} isMyTurn={myTurn} />
            </div>

            <NumberBoard
              board={state.board}
              selectable={myTurn}
              disabledNumber={mySecret}
              onPick={(n) => setPendingNumber(n)}
            />

            {/* Lejant */}
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded bg-destructive/40 border border-destructive" />
                Kimse kurtulmadı
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded bg-emerald-500/40 border border-emerald-500" />
                Biri kurtuldu
              </span>
            </div>

            {!isSpectator && !amEliminated && (
              <CallPanel
                myTurn={myTurn}
                currentTurnName={currentTurnPlayer?.name ?? null}
                pendingNumber={pendingNumber}
                onClearPending={() => setPendingNumber(null)}
                onCall={callNumber}
              />
            )}

            <div>
              <div className="text-sm font-semibold mb-2 text-muted-foreground">
                Oyuncular (kalan: {state.activeCount})
              </div>
              <PlayerList state={state} myId={myId} />
            </div>
          </div>
        )}

        {/* === OYUN SONU === */}
        {state.phase === "finished" && (
          <GameOver
            state={state}
            myId={myId}
            isHost={isHost}
            onRematch={rematch}
            onLeave={handleLeave}
          />
        )}
      </main>

      {/* Alt sabit etkileşim barı (oyun sırasında herkes - oyuncu ve izleyici) */}
      {inGame && (
        <div className="fixed bottom-0 inset-x-0 z-[57] border-t border-border bg-background/85 backdrop-blur">
          <div className="max-w-2xl mx-auto px-4 py-2.5 flex items-center justify-center">
            <ReactionBar onReaction={sendReaction} onChat={sendChat} />
          </div>
        </div>
      )}
    </div>
  );
}
