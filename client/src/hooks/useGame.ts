import { getPlayerId, getSocket, getStoredName } from "@/lib/socket";
import { getSoundEnabled, speak, vibrate, unlockSpeech } from "@/lib/speech";
import {
  getMusicEnabled,
  playLoseSound,
  playWinChime,
  setMusicEnabled as persistMusicEnabled,
  setTense,
  startMusic,
  stopMusic,
} from "@/lib/music";
import type {
  Announcement,
  ChatEvent,
  PublicGameState,
  ReactionEvent,
} from "@shared/gameTypes";
import { useCallback, useEffect, useRef, useState } from "react";

export interface UseGameResult {
  state: PublicGameState | null;
  connected: boolean;
  myId: string;
  notFound: boolean;
  lastAnnouncement: Announcement | null;
  lastReaction: ReactionEvent | null;
  lastChat: ChatEvent | null;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  musicEnabled: boolean;
  setMusicEnabled: (v: boolean) => void;
  startGame: () => void;
  confirmSecret: (n: number) => Promise<{ ok: boolean; error?: string }>;
  callNumber: (n: number) => Promise<{ ok: boolean; error?: string }>;
  sendReaction: (emoji: string) => void;
  sendChat: (text: string) => void;
  rematch: () => void;
  leave: () => void;
}

export function useGame(roomCode: string): UseGameResult {
  const [state, setState] = useState<PublicGameState | null>(null);
  const [connected, setConnected] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [lastAnnouncement, setLastAnnouncement] = useState<Announcement | null>(null);
  const [lastReaction, setLastReaction] = useState<ReactionEvent | null>(null);
  const [lastChat, setLastChat] = useState<ChatEvent | null>(null);
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(getSoundEnabled());
  const [musicEnabled, setMusicEnabledState] = useState<boolean>(getMusicEnabled());
  const soundRef = useRef(soundEnabled);
  const myId = getPlayerId();
  const prevPhaseRef = useRef<string | null>(null);
  const prevTurnRef = useRef<string | null>(null);

  useEffect(() => {
    soundRef.current = soundEnabled;
  }, [soundEnabled]);

  const setSoundEnabled = useCallback((v: boolean) => {
    setSoundEnabledState(v);
    import("@/lib/speech").then((m) => m.setSoundEnabled(v));
  }, []);

  const setMusicEnabled = useCallback((v: boolean) => {
    setMusicEnabledState(v);
    persistMusicEnabled(v);
    if (v) startMusic();
    else stopMusic();
  }, []);

  useEffect(() => {
    const socket = getSocket();

    const doRejoin = () => {
      socket.emit(
        "rejoin",
        { roomCode, playerId: getPlayerId(), name: getStoredName() || "Oyuncu" },
        (res: { ok: boolean; error?: string }) => {
          if (!res.ok) setNotFound(true);
        }
      );
    };

    const onConnect = () => {
      setConnected(true);
      doRejoin();
    };
    const onDisconnect = () => setConnected(false);
    const onState = (s: PublicGameState) => {
      setNotFound(false);
      setState(s);
    };
    const onAnnounce = (ann: Announcement) => {
      setLastAnnouncement({ ...ann, number: ann.number });
      speak(ann.text, soundRef.current);
      // Haptic: kurtulma / kaybetme / sıra
      if (ann.type === "saved") vibrate([40, 30, 40]);
      else if (ann.type === "loser") vibrate([120, 60, 120, 60, 200]);
      else if (ann.type === "turn" && ann.playerId === myId) vibrate([60, 40, 60]);
    };
    const onReaction = (r: ReactionEvent) => setLastReaction(r);
    const onChat = (c: ChatEvent) => setLastChat(c);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("state", onState);
    socket.on("announce", onAnnounce);
    socket.on("reaction", onReaction);
    socket.on("chat", onChat);

    if (socket.connected) {
      setConnected(true);
      doRejoin();
    } else {
      socket.connect();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("state", onState);
      socket.off("announce", onAnnounce);
      socket.off("reaction", onReaction);
      socket.off("chat", onChat);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, myId]);

  // Müzik kontrolü: oyun oynanırken çal, bitince/lobide durdur. Son 2 kişide gerilim modu.
  useEffect(() => {
    if (!state) return;
    const phase = state.phase;

    if (phase === "playing") {
      if (musicEnabled) startMusic();
      setTense(state.activeCount <= 2);
    } else {
      stopMusic();
      setTense(false);
    }

    // Oyun yeni bittiyse: kazanç/kayıp sesi (kendine göre)
    if (prevPhaseRef.current !== "finished" && phase === "finished") {
      const me = state.players.find((p) => p.id === myId);
      if (me && state.loserId === myId) {
        playLoseSound();
        vibrate([200, 100, 200, 100, 400]);
      } else if (me && me.saved) {
        playWinChime();
      }
    }
    prevPhaseRef.current = phase;
    prevTurnRef.current = state.currentTurnPlayerId;
  }, [state, musicEnabled, myId]);

  const startGame = useCallback(() => {
    // İlk kullanıcı etkileşimi: AudioContext ve TTS'i uyandır
    unlockSpeech();
    if (getMusicEnabled()) startMusic();
    getSocket().emit("startGame", (_res: { ok: boolean; error?: string }) => {});
  }, []);

  const confirmSecret = useCallback((n: number) => {
    unlockSpeech();
    if (getMusicEnabled()) startMusic();
    return new Promise<{ ok: boolean; error?: string }>((resolve) => {
      getSocket().emit("confirmSecret", { secret: n }, (res: { ok: boolean; error?: string }) =>
        resolve(res)
      );
    });
  }, []);

  const callNumber = useCallback((n: number) => {
    unlockSpeech();
    return new Promise<{ ok: boolean; error?: string }>((resolve) => {
      getSocket().emit("callNumber", { number: n }, (res: { ok: boolean; error?: string }) =>
        resolve(res)
      );
    });
  }, []);

  const sendReaction = useCallback((emoji: string) => {
    getSocket().emit("reaction", { emoji });
  }, []);

  const sendChat = useCallback((text: string) => {
    getSocket().emit("chat", { text });
  }, []);

  const rematch = useCallback(() => {
    getSocket().emit("rematch", (_res: { ok: boolean; error?: string }) => {});
  }, []);

  const leave = useCallback(() => {
    stopMusic();
    getSocket().emit("leaveRoom");
  }, []);

  return {
    state,
    connected,
    myId,
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
  };
}
