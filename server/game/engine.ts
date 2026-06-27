// 31 Oyunu - Saf oyun motoru (Socket.io'dan bağımsız, test edilebilir)
import {
  MAX_NUMBER,
  MAX_PLAYERS,
  MIN_NUMBER,
  MIN_PLAYERS,
  TURN_DURATION_SEC,
  type BoardCell,
  type CallRecord,
  type GamePhase,
  type PublicGameState,
  type PublicPlayer,
} from "../../shared/gameTypes";

/** Sunucu içi tam oyuncu kaydı (gizli sayı dahil) */
export interface ServerPlayer {
  id: string; // kalıcı playerId
  socketId: string | null;
  name: string;
  isHost: boolean;
  connected: boolean;
  secret: number | null; // gizli sayı (sadece sunucuda)
  secretConfirmed: boolean;
  eliminated: boolean; // sayısı söylendi -> oyundan çıktı (kurtuldu) / izleyici
  isSpectator: boolean; // oyun başladıktan sonra katılan
  saved: boolean; // sayısı söylenerek kurtuldu mu (kazanan)
  eliminatedByNumber?: number;
  rank?: number; // kurtulma sırası (1 = ilk kurtulan)
  order: number; // katılma sırası (turn sırası için)
}

/** Sunucu içi tam oda kaydı */
export interface Room {
  code: string;
  phase: GamePhase;
  players: ServerPlayer[];
  hostId: string;
  currentTurnPlayerId: string | null;
  board: BoardCell[]; // index 0 = sayı 1
  history: CallRecord[];
  loserId: string | null;
  createdAt: number;
  nextOrder: number;
  savedCount: number; // kaç kişi kurtuldu (rank için)
  turnEndsAt: number | null; // sıra bitiş zamanı (epoch ms)
}

export function createEmptyBoard(): BoardCell[] {
  const cells: BoardCell[] = [];
  for (let n = MIN_NUMBER; n <= MAX_NUMBER; n++) {
    cells.push({ number: n, mark: "none" });
  }
  return cells;
}

export function createRoom(code: string, host: { id: string; name: string; socketId: string | null }): Room {
  const hostPlayer: ServerPlayer = {
    id: host.id,
    socketId: host.socketId,
    name: host.name,
    isHost: true,
    connected: true,
    secret: null,
    secretConfirmed: false,
    eliminated: false,
    isSpectator: false,
    saved: false,
    order: 0,
  };
  return {
    code,
    phase: "lobby",
    players: [hostPlayer],
    hostId: host.id,
    currentTurnPlayerId: null,
    board: createEmptyBoard(),
    history: [],
    loserId: null,
    createdAt: Date.now(),
    nextOrder: 1,
    savedCount: 0,
    turnEndsAt: null,
  };
}

export interface JoinResult {
  ok: boolean;
  error?: string;
  asSpectator?: boolean;
}

/** Bir oyuncuyu odaya ekler. Oyun başlamışsa izleyici olarak ekler. */
export function addPlayer(
  room: Room,
  player: { id: string; name: string; socketId: string | null }
): JoinResult {
  // Aynı playerId zaten varsa yeniden bağlanma sayılır
  const existing = room.players.find((p) => p.id === player.id);
  if (existing) {
    existing.connected = true;
    existing.socketId = player.socketId;
    if (player.name && player.name.trim()) existing.name = player.name.trim();
    return { ok: true, asSpectator: existing.isSpectator };
  }

  if (room.phase === "lobby") {
    const activeCount = room.players.length;
    if (activeCount >= MAX_PLAYERS) {
      return { ok: false, error: "Oda dolu (en fazla 15 oyuncu)." };
    }
    room.players.push({
      id: player.id,
      socketId: player.socketId,
      name: player.name.trim(),
      isHost: false,
      connected: true,
      secret: null,
      secretConfirmed: false,
      eliminated: false,
      isSpectator: false,
      saved: false,
      order: room.nextOrder++,
    });
    return { ok: true, asSpectator: false };
  }

  // Oyun başladıktan sonra katılan -> izleyici
  const totalCount = room.players.length;
  if (totalCount >= MAX_PLAYERS + 10) {
    return { ok: false, error: "Oda dolu." };
  }
  room.players.push({
    id: player.id,
    socketId: player.socketId,
    name: player.name.trim(),
    isHost: false,
    connected: true,
    secret: null,
    secretConfirmed: false,
    eliminated: true, // izleyici, oynamaz
    isSpectator: true,
    saved: false,
    order: room.nextOrder++,
  });
  return { ok: true, asSpectator: true };
}

/** Lobide olan, izleyici olmayan aktif oyuncular */
export function lobbyPlayers(room: Room): ServerPlayer[] {
  return room.players.filter((p) => !p.isSpectator);
}

/** Hâlâ oyunda olan (çıkmamış, izleyici olmayan) oyuncular */
export function activePlayers(room: Room): ServerPlayer[] {
  return room.players.filter((p) => !p.eliminated && !p.isSpectator);
}

export interface StartResult {
  ok: boolean;
  error?: string;
}

/** Host oyunu başlatır -> gizli sayı seçim aşamasına geçer */
export function startGame(room: Room, requesterId: string): StartResult {
  if (room.phase !== "lobby") {
    return { ok: false, error: "Oyun zaten başladı." };
  }
  if (requesterId !== room.hostId) {
    return { ok: false, error: "Sadece oda sahibi oyunu başlatabilir." };
  }
  const lp = lobbyPlayers(room);
  if (lp.length < MIN_PLAYERS) {
    return { ok: false, error: "Oyunu başlatmak için en az 2 oyuncu gerekli." };
  }
  room.phase = "selecting";
  room.savedCount = 0;
  room.turnEndsAt = null;
  // Sayıları sıfırla
  for (const p of lp) {
    p.secret = null;
    p.secretConfirmed = false;
    p.eliminated = false;
    p.saved = false;
    p.rank = undefined;
    p.eliminatedByNumber = undefined;
  }
  return { ok: true };
}

export interface SecretResult {
  ok: boolean;
  error?: string;
  allConfirmed?: boolean;
}

/** Bir oyuncu gizli sayısını onaylar. Onaylandıktan sonra değiştirilemez. */
export function confirmSecret(room: Room, playerId: string, secret: number): SecretResult {
  if (room.phase !== "selecting") {
    return { ok: false, error: "Şu anda gizli sayı seçilemez." };
  }
  const player = room.players.find((p) => p.id === playerId);
  if (!player || player.isSpectator) {
    return { ok: false, error: "Oyuncu bulunamadı." };
  }
  if (player.secretConfirmed) {
    return { ok: false, error: "Gizli sayınız zaten onaylandı ve değiştirilemez." };
  }
  if (!Number.isInteger(secret) || secret < MIN_NUMBER || secret > MAX_NUMBER) {
    return { ok: false, error: "Geçersiz sayı. 1 ile 31 arasında olmalı." };
  }
  player.secret = secret;
  player.secretConfirmed = true;

  const lp = lobbyPlayers(room);
  const allConfirmed = lp.every((p) => p.secretConfirmed);
  if (allConfirmed) {
    beginPlaying(room);
  }
  return { ok: true, allConfirmed };
}

/** Tüm sayılar onaylanınca oynanışa geç ve ilk sırayı belirle */
function beginPlaying(room: Room) {
  room.phase = "playing";
  const ordered = activePlayers(room).sort((a, b) => a.order - b.order);
  room.currentTurnPlayerId = ordered.length > 0 ? ordered[0].id : null;
  startTurnTimer(room);
}

/** Sıra için süre sayacını başlatır */
export function startTurnTimer(room: Room) {
  room.turnEndsAt = Date.now() + TURN_DURATION_SEC * 1000;
}

export interface CallResult {
  ok: boolean;
  error?: string;
  savedName?: string | null; // null = kimseyi kurtarmadı
  savedId?: string | null;
  number?: number;
  gameOver?: boolean;
  loserId?: string | null;
  nextPlayerId?: string | null; // yeni sıra kimde
}

/** Sırası gelen oyuncu bir sayı söyler */
export function callNumber(room: Room, playerId: string, number: number): CallResult {
  if (room.phase !== "playing") {
    return { ok: false, error: "Oyun şu anda oynanmıyor." };
  }
  if (room.currentTurnPlayerId !== playerId) {
    return { ok: false, error: "Sıra sizde değil." };
  }
  const caller = room.players.find((p) => p.id === playerId);
  if (!caller || caller.eliminated || caller.isSpectator) {
    return { ok: false, error: "Bu oyuncu oynayamaz." };
  }
  if (!Number.isInteger(number) || number < MIN_NUMBER || number > MAX_NUMBER) {
    return { ok: false, error: "Geçersiz sayı. 1 ile 31 arasında olmalı." };
  }
  if (number === caller.secret) {
    return { ok: false, error: "Kendi gizli sayınızı söyleyemezsiniz." };
  }
  const cell = room.board[number - 1];
  if (cell.mark !== "none") {
    return { ok: false, error: "Bu sayı zaten söylendi." };
  }

  // Eşleşme kontrolü: bu sayı oyunda olan başka bir oyuncunun gizli sayısı mı?
  const matched = activePlayers(room).find(
    (p) => p.id !== caller.id && p.secret === number
  );

  let savedName: string | null = null;
  let savedId: string | null = null;

  if (matched) {
    // Sayısı söylenen kişi KURTULDU (oyundan çıkar, kazanır, izleyici olur)
    matched.eliminated = true;
    matched.saved = true;
    matched.eliminatedByNumber = number;
    matched.rank = ++room.savedCount;
    savedName = matched.name;
    savedId = matched.id;
    cell.mark = "green";
    cell.saidByName = caller.name;
    cell.eliminatedName = matched.name;
  } else {
    cell.mark = "red";
    cell.saidByName = caller.name;
  }

  room.history.push({
    number,
    byName: caller.name,
    byId: caller.id,
    eliminatedName: savedName,
    eliminatedId: savedId,
    timestamp: Date.now(),
  });

  // Oyun sonu kontrolü: tek kişi kalınca o kişi KAYBEDER (cezalı)
  const remaining = activePlayers(room);
  if (remaining.length <= 1) {
    room.phase = "finished";
    room.loserId = remaining.length === 1 ? remaining[0].id : null;
    room.currentTurnPlayerId = null;
    room.turnEndsAt = null;
    return {
      ok: true,
      savedName,
      savedId,
      number,
      gameOver: true,
      loserId: room.loserId,
      nextPlayerId: null,
    };
  }

  // Sıradaki oyuncuya geç
  advanceTurn(room, caller.id);

  return {
    ok: true,
    savedName,
    savedId,
    number,
    gameOver: false,
    nextPlayerId: room.currentTurnPlayerId,
  };
}

/**
 * Süre dolunca sırası gelen oyuncu için otomatik rastgele geçerli sayı seç.
 * Geçerli sayı: tahtada söylenmemiş ve oyuncunun kendi gizli sayısı olmayan.
 * Hiç geçerli sayı yoksa null döner (uç durum).
 */
export function pickRandomValidNumber(room: Room, playerId: string): number | null {
  const player = room.players.find((p) => p.id === playerId);
  if (!player) return null;
  const candidates: number[] = [];
  for (let n = MIN_NUMBER; n <= MAX_NUMBER; n++) {
    const cell = room.board[n - 1];
    if (cell.mark === "none" && n !== player.secret) {
      candidates.push(n);
    }
  }
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/** Verilen oyuncudan sonra sıradaki aktif oyuncuya geçer */
function advanceTurn(room: Room, fromPlayerId: string) {
  const ordered = room.players
    .filter((p) => !p.isSpectator)
    .sort((a, b) => a.order - b.order);
  const n = ordered.length;
  const startIdx = ordered.findIndex((p) => p.id === fromPlayerId);
  // Önce bağlı ve oyunda olan bir oyuncu ara
  for (let step = 1; step <= n; step++) {
    const candidate = ordered[(startIdx + step) % n];
    if (!candidate.eliminated && candidate.connected) {
      room.currentTurnPlayerId = candidate.id;
      startTurnTimer(room);
      return;
    }
  }
  // Hepsi bağlantısız ise yine de oyunda birine ver (kilitlenmeyi önle)
  for (let step = 1; step <= n; step++) {
    const candidate = ordered[(startIdx + step) % n];
    if (!candidate.eliminated) {
      room.currentTurnPlayerId = candidate.id;
      startTurnTimer(room);
      return;
    }
  }
  room.currentTurnPlayerId = null;
  room.turnEndsAt = null;
}

/** Oyunu yeniden başlatır (rematch) -> lobiye döner */
export function resetGame(room: Room, requesterId: string): StartResult {
  if (requesterId !== room.hostId) {
    return { ok: false, error: "Sadece oda sahibi yeni oyun başlatabilir." };
  }
  room.phase = "lobby";
  room.board = createEmptyBoard();
  room.history = [];
  room.loserId = null;
  room.currentTurnPlayerId = null;
  room.savedCount = 0;
  room.turnEndsAt = null;
  // İzleyicileri artık aktif oyuncuya çevir, herkesi sıfırla
  for (const p of room.players) {
    p.secret = null;
    p.secretConfirmed = false;
    p.eliminated = false;
    p.saved = false;
    p.rank = undefined;
    p.eliminatedByNumber = undefined;
    p.isSpectator = false;
  }
  return { ok: true };
}

/** Bir oyuncunun bağlantısı koptuğunda */
export function markDisconnected(room: Room, playerId: string) {
  const player = room.players.find((p) => p.id === playerId);
  if (player) {
    player.connected = false;
    player.socketId = null;
  }
}

/** Lobide bir oyuncu ayrılırsa tamamen kaldır; oyun sırasında işaretle */
export function removeOrMarkPlayer(room: Room, playerId: string): { hostChanged: boolean; turnAdvanced: boolean } {
  const player = room.players.find((p) => p.id === playerId);
  if (!player) return { hostChanged: false, turnAdvanced: false };

  let hostChanged = false;
  const turnAdvanced = false;

  if (room.phase === "lobby") {
    room.players = room.players.filter((p) => p.id !== playerId);
    if (player.isHost && room.players.length > 0) {
      room.players[0].isHost = true;
      room.hostId = room.players[0].id;
      hostChanged = true;
    }
  } else {
    // Oyun sırasında ayrılan oyuncu bağlantısız işaretlenir (oyunu kilitlememek için)
    markDisconnected(room, playerId);
  }
  return { hostChanged, turnAdvanced };
}

/** İstemciye gönderilecek güvenli durumu üretir (gizli sayılar gizlenir) */
export function toPublicState(room: Room): PublicGameState {
  const players: PublicPlayer[] = room.players
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((p) => ({
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      connected: p.connected,
      hasSecret: p.secretConfirmed,
      eliminated: p.eliminated,
      isSpectator: p.isSpectator,
      saved: p.saved,
      eliminatedByNumber: p.eliminatedByNumber,
      rank: p.rank,
    }));

  return {
    roomCode: room.code,
    phase: room.phase,
    players,
    hostId: room.hostId,
    currentTurnPlayerId: room.currentTurnPlayerId,
    board: room.board,
    history: room.history,
    loserId: room.loserId,
    activeCount: activePlayers(room).length,
    turnEndsAt: room.turnEndsAt,
  };
}

/** 4 haneli benzersiz oda kodu üretir. Boşta kod kalmazsa null döner. */
export function generateRoomCode(exists: (code: string) => boolean): string | null {
  // Önce rastgele dene
  for (let attempts = 0; attempts < 200; attempts++) {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    if (!exists(code)) return code;
  }
  // Doygunsa sırayla tara (1000..9999)
  for (let n = 1000; n <= 9999; n++) {
    const code = String(n);
    if (!exists(code)) return code;
  }
  return null;
}
