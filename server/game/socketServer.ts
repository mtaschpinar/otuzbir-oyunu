// 31 Oyunu - Socket.io sunucusu ve oda yönetimi (in-memory)
import type { Server as HttpServer } from "http";
import { Server as SocketIOServer, type Socket } from "socket.io";
import {
  addPlayer,
  callNumber,
  confirmSecret,
  createRoom,
  generateRoomCode,
  markDisconnected,
  pickRandomValidNumber,
  removeOrMarkPlayer,
  resetGame,
  startGame,
  toPublicState,
  type Room,
} from "./engine";
import { TURN_DURATION_SEC, type Announcement } from "../../shared/gameTypes";

// Tüm odalar sunucu belleğinde tutulur (Reserved Hosting tek süreç)
const rooms = new Map<string, Room>();

// Rastgele anons varyasyonları
const TURN_TEXTS = [
  (name: string) => `${name}! Haydi aslanım, göster kendini!`,
  (name: string) => `${name}! Sıra sende patron, ne yapacaksın?`,
  (name: string) => `${name}! Hadi bakalım, cesaretini görelim!`,
  (name: string) => `${name}! Şov zamanı geldi, sahne senin!`,
  (name: string) => `${name}! Korkma be, at bi sayı!`,
  (name: string) => `${name}! Düşün taşın, akıllıca oyna!`,
  (name: string) => `${name}! Herkes sana bakıyor, hadi!`,
  (name: string) => `${name}! Nefesler tutuldu, sıra sende!`,
];

const SAVED_TEXTS = [
  (name: string) => `${name} kaçtı gitti! Bir daha görüşmeyiz!`,
  (name: string) => `${name} kurtuldu! Elveda dostum!`,
  (name: string) => `${name} sıyırdı! Şanslı herif!`,
  (name: string) => `${name} paçayı kurtardı! Rahat ol artık!`,
  (name: string) => `${name} özgür! Geride kalanlar düşünsün!`,
  (name: string) => `${name} uçtu gitti! Ceza yok sana!`,
];

const NO_MATCH_TEXTS = [
  "Boşa gitti be! Kimse yok burada!",
  "Havaya attın! Bu sayı kimsede yok!",
  "Boş çıktı! Devam ediyoruz!",
  "Rüzgara söyledin! Kimsede yok bu sayı!",
  "Iskaladın! Sıradaki düşünsün!",
  "Boşluk! Kimse düşmedi!",
];

const LOSER_TEXTS = [
  (name: string) => `Eyvaaah! ${name} yandı! Ceza vakti geldi dostum!`,
  (name: string) => `${name} battı! Herkes gülsün, ceza onda!`,
  (name: string) => `Vay vay vay! ${name} son kalan! Ceza senin!`,
  (name: string) => `${name} mahkum oldu! Cezadan kaçış yok!`,
  (name: string) => `Geçmiş olsun ${name}! Ceza çarkı dönecek!`,
  (name: string) => `${name} yapayalnız kaldı! Ceza zamanı!`,
];

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// socketId -> { roomCode, playerId } eşlemesi (disconnect için)
const socketIndex = new Map<string, { roomCode: string; playerId: string }>();

// Her oda için aktif sıra zamanlayıcısı (timeout) referansı
const turnTimers = new Map<string, NodeJS.Timeout>();

function roomExists(code: string): boolean {
  return rooms.has(code);
}

function emitState(io: SocketIOServer, room: Room) {
  io.to(room.code).emit("state", toPublicState(room));
}

function emitAnnouncement(io: SocketIOServer, room: Room, ann: Announcement) {
  io.to(room.code).emit("announce", ann);
}

/** Sırası gelen oyuncu için "sıra sende" anonsu yayınla */
function announceTurn(io: SocketIOServer, room: Room) {
  if (room.phase !== "playing" || !room.currentTurnPlayerId) return;
  const player = room.players.find((p) => p.id === room.currentTurnPlayerId);
  if (!player) return;
  emitAnnouncement(io, room, {
    type: "turn",
    text: randomPick(TURN_TEXTS)(player.name),
    name: player.name,
    playerId: player.id,
  });
}

/** Süre dolunca otomatik rastgele sayı söyleyen zamanlayıcıyı kur */
function scheduleTurnTimeout(io: SocketIOServer, room: Room) {
  clearTurnTimer(room.code);
  if (room.phase !== "playing" || !room.currentTurnPlayerId || !room.turnEndsAt) {
    return;
  }
  const delay = Math.max(0, room.turnEndsAt - Date.now());
  const timer = setTimeout(() => {
    const current = rooms.get(room.code);
    if (!current || current.phase !== "playing" || !current.currentTurnPlayerId) {
      return;
    }
    const turnPlayerId = current.currentTurnPlayerId;
    const auto = pickRandomValidNumber(current, turnPlayerId);
    if (auto == null) {
      // Geçerli sayı kalmadı (uç durum): turu ilerletmek için yine de dene
      return;
    }
    const result = callNumber(current, turnPlayerId, auto);
    if (!result.ok) return;

    if (result.savedName) {
      emitAnnouncement(io, current, {
        type: "saved",
        text: randomPick(SAVED_TEXTS)(result.savedName),
        name: result.savedName,
        playerId: result.savedId ?? undefined,
        number: result.number,
      });
    } else {
      emitAnnouncement(io, current, {
        type: "no-match",
        text: randomPick(NO_MATCH_TEXTS),
        number: result.number,
      });
    }

    if (result.gameOver) {
      announceLoser(io, current);
    }
    emitState(io, current);

    if (!result.gameOver) {
      announceTurn(io, current);
      scheduleTurnTimeout(io, current);
    }
  }, delay);
  turnTimers.set(room.code, timer);
}

function clearTurnTimer(code: string) {
  const t = turnTimers.get(code);
  if (t) {
    clearTimeout(t);
    turnTimers.delete(code);
  }
}

/** Oyun bitince kaybeden (cezalı) anonsu yayınla */
function announceLoser(io: SocketIOServer, room: Room) {
  clearTurnTimer(room.code);
  if (!room.loserId) return;
  const loser = room.players.find((p) => p.id === room.loserId);
  if (!loser) return;
  emitAnnouncement(io, room, {
    type: "loser",
    text: randomPick(LOSER_TEXTS)(loser.name),
    name: loser.name,
    playerId: loser.id,
  });
}

// Eski ve boş odaları temizle
function cleanupRooms() {
  const now = Date.now();
  rooms.forEach((room: Room, code: string) => {
    const anyConnected = room.players.some((p) => p.connected);
    const stale = now - room.createdAt > 1000 * 60 * 60 * 6; // 6 saat
    if (!anyConnected && stale) {
      clearTurnTimer(code);
      rooms.delete(code);
    }
  });
}

export function registerSocketServer(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    path: "/api/socket.io",
    // Hem WebSocket hem polling destekle (mobil operatör uyumluluğu)
    transports: ["websocket", "polling"],
    cors: {
      origin: "*",
      methods: ["GET", "POST", "OPTIONS"],
      credentials: false,
    },
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 45000,
    cookie: false,
  });

  io.on("connection", (socket: Socket) => {
    // Oda oluştur
    socket.on(
      "createRoom",
      (
        payload: { name: string; playerId: string },
        cb?: (res: { ok: boolean; roomCode?: string; error?: string }) => void
      ) => {
        try {
          const name = (payload?.name || "").trim();
          const playerId = (payload?.playerId || "").trim();
          if (!name || !playerId) {
            return cb?.({ ok: false, error: "İsim gerekli." });
          }
          const code = generateRoomCode(roomExists);
          if (!code) {
            return cb?.({ ok: false, error: "Şu anda yeni oda oluşturulamıyor. Lütfen tekrar deneyin." });
          }
          const room = createRoom(code, { id: playerId, name, socketId: socket.id });
          rooms.set(code, room);
          socket.join(code);
          socketIndex.set(socket.id, { roomCode: code, playerId });
          cb?.({ ok: true, roomCode: code });
          emitState(io, room);
        } catch (e) {
          cb?.({ ok: false, error: "Oda oluşturulamadı." });
        }
      }
    );

    // Odaya katıl
    socket.on(
      "joinRoom",
      (
        payload: { roomCode: string; name: string; playerId: string },
        cb?: (res: { ok: boolean; error?: string; asSpectator?: boolean }) => void
      ) => {
        try {
          const code = (payload?.roomCode || "").trim();
          const name = (payload?.name || "").trim();
          const playerId = (payload?.playerId || "").trim();
          if (!code || !name || !playerId) {
            return cb?.({ ok: false, error: "Oda kodu ve isim gerekli." });
          }
          const room = rooms.get(code);
          if (!room) {
            return cb?.({ ok: false, error: "Oda bulunamadı. Kodu kontrol edin." });
          }
          const result = addPlayer(room, { id: playerId, name, socketId: socket.id });
          if (!result.ok) {
            return cb?.({ ok: false, error: result.error });
          }
          socket.join(code);
          socketIndex.set(socket.id, { roomCode: code, playerId });
          cb?.({ ok: true, asSpectator: result.asSpectator });
          emitState(io, room);
        } catch (e) {
          cb?.({ ok: false, error: "Odaya katılınamadı." });
        }
      }
    );

    // Mevcut odaya yeniden bağlan (sayfa yenileme / reconnect)
    socket.on(
      "rejoin",
      (
        payload: { roomCode: string; playerId: string; name: string },
        cb?: (res: { ok: boolean; error?: string }) => void
      ) => {
        try {
          const code = (payload?.roomCode || "").trim();
          const playerId = (payload?.playerId || "").trim();
          const name = (payload?.name || "").trim();
          const room = rooms.get(code);
          if (!room) {
            return cb?.({ ok: false, error: "Oda artık mevcut değil." });
          }
          const existing = room.players.find((p) => p.id === playerId);
          if (existing) {
            existing.connected = true;
            existing.socketId = socket.id;
          } else {
            addPlayer(room, { id: playerId, name: name || "Oyuncu", socketId: socket.id });
          }
          socket.join(code);
          socketIndex.set(socket.id, { roomCode: code, playerId });
          cb?.({ ok: true });
          emitState(io, room);
        } catch (e) {
          cb?.({ ok: false, error: "Yeniden bağlanılamadı." });
        }
      }
    );

    // Oyunu başlat (host)
    socket.on("startGame", (cb?: (res: { ok: boolean; error?: string }) => void) => {
      const idx = socketIndex.get(socket.id);
      if (!idx) return cb?.({ ok: false, error: "Oturum bulunamadı." });
      const room = rooms.get(idx.roomCode);
      if (!room) return cb?.({ ok: false, error: "Oda bulunamadı." });
      const result = startGame(room, idx.playerId);
      if (!result.ok) return cb?.({ ok: false, error: result.error });
      cb?.({ ok: true });
      emitState(io, room);
    });

    // Gizli sayıyı onayla
    socket.on(
      "confirmSecret",
      (payload: { secret: number }, cb?: (res: { ok: boolean; error?: string }) => void) => {
        const idx = socketIndex.get(socket.id);
        if (!idx) return cb?.({ ok: false, error: "Oturum bulunamadı." });
        const room = rooms.get(idx.roomCode);
        if (!room) return cb?.({ ok: false, error: "Oda bulunamadı." });
        const result = confirmSecret(room, idx.playerId, Number(payload?.secret));
        if (!result.ok) return cb?.({ ok: false, error: result.error });
        cb?.({ ok: true });
        emitState(io, room);
        // Oyun başladıysa ilk sıra anonsu + sayaç
        if (result.allConfirmed && room.phase === "playing") {
          announceTurn(io, room);
          scheduleTurnTimeout(io, room);
        }
      }
    );

    // Sayı söyle
    socket.on(
      "callNumber",
      (payload: { number: number }, cb?: (res: { ok: boolean; error?: string }) => void) => {
        const idx = socketIndex.get(socket.id);
        if (!idx) return cb?.({ ok: false, error: "Oturum bulunamadı." });
        const room = rooms.get(idx.roomCode);
        if (!room) return cb?.({ ok: false, error: "Oda bulunamadı." });
        const result = callNumber(room, idx.playerId, Number(payload?.number));
        if (!result.ok) return cb?.({ ok: false, error: result.error });
        cb?.({ ok: true });

        // Ses bildirimi: sayısı söylenen kişi kurtuldu mu?
        if (result.savedName) {
          emitAnnouncement(io, room, {
            type: "saved",
            text: randomPick(SAVED_TEXTS)(result.savedName),
            name: result.savedName,
            playerId: result.savedId ?? undefined,
            number: result.number,
          });
        } else {
          emitAnnouncement(io, room, {
            type: "no-match",
            text: randomPick(NO_MATCH_TEXTS),
            number: result.number,
          });
        }

        if (result.gameOver) {
          announceLoser(io, room);
        }
        emitState(io, room);

        if (!result.gameOver) {
          announceTurn(io, room);
          scheduleTurnTimeout(io, room);
        }
      }
    );

    // Emoji reaksiyon gönder
    socket.on("reaction", (payload: { emoji: string }) => {
      const idx = socketIndex.get(socket.id);
      if (!idx) return;
      const room = rooms.get(idx.roomCode);
      if (!room) return;
      const player = room.players.find((p) => p.id === idx.playerId);
      if (!player) return;
      const emoji = String(payload?.emoji || "").slice(0, 8);
      if (!emoji) return;
      io.to(room.code).emit("reaction", {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        emoji,
        fromName: player.name,
        fromId: player.id,
        timestamp: Date.now(),
      });
    });

    // Sohbet mesajı gönder (kısa)
    socket.on("chat", (payload: { text: string }) => {
      const idx = socketIndex.get(socket.id);
      if (!idx) return;
      const room = rooms.get(idx.roomCode);
      if (!room) return;
      const player = room.players.find((p) => p.id === idx.playerId);
      if (!player) return;
      const text = String(payload?.text || "").trim().slice(0, 60);
      if (!text) return;
      io.to(room.code).emit("chat", {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        text,
        fromName: player.name,
        fromId: player.id,
        timestamp: Date.now(),
      });
    });

    // Yeniden oyna (host)
    socket.on("rematch", (cb?: (res: { ok: boolean; error?: string }) => void) => {
      const idx = socketIndex.get(socket.id);
      if (!idx) return cb?.({ ok: false, error: "Oturum bulunamadı." });
      const room = rooms.get(idx.roomCode);
      if (!room) return cb?.({ ok: false, error: "Oda bulunamadı." });
      const result = resetGame(room, idx.playerId);
      if (!result.ok) return cb?.({ ok: false, error: result.error });
      clearTurnTimer(room.code);
      cb?.({ ok: true });
      emitState(io, room);
    });

    // Odadan ayrıl
    socket.on("leaveRoom", () => {
      handleLeave(io, socket);
    });

    socket.on("disconnect", () => {
      const idx = socketIndex.get(socket.id);
      if (!idx) return;
      const room = rooms.get(idx.roomCode);
      if (room) {
        markDisconnected(room, idx.playerId);
        emitState(io, room);
      }
      socketIndex.delete(socket.id);
      cleanupRooms();
    });
  });

  return io;
}

function handleLeave(io: SocketIOServer, socket: Socket) {
  const idx = socketIndex.get(socket.id);
  if (!idx) return;
  const room = rooms.get(idx.roomCode);
  if (room) {
    removeOrMarkPlayer(room, idx.playerId);
    socket.leave(idx.roomCode);
    if (room.players.length === 0) {
      clearTurnTimer(idx.roomCode);
      rooms.delete(idx.roomCode);
    } else {
      emitState(io, room);
    }
  }
  socketIndex.delete(socket.id);
}

// Test/yönetim amaçlı erişim
export function _getRooms() {
  return rooms;
}

// İstemci ile aynı süreyi paylaşmak için dışa aktar
export { TURN_DURATION_SEC };
