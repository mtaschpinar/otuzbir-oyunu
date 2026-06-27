// 31 Oyunu - Paylaşılan tipler (hem sunucu hem istemci kullanır)

export const MIN_NUMBER = 1;
export const MAX_NUMBER = 31;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 15;

/** Sırası gelen oyuncuya tanınan süre (saniye) */
export const TURN_DURATION_SEC = 18;

/** Oyun aşamaları */
export type GamePhase =
  | "lobby" // Oyuncular bekleniyor, host başlatmadı
  | "selecting" // Herkes gizli sayısını seçiyor/onaylıyor
  | "playing" // Sıra sırayla oynanıyor
  | "finished"; // Oyun bitti, kaybeden belli

/** Sayı tahtasındaki bir sayının durumu */
export type BoardMark =
  | "none" // Henüz söylenmedi
  | "red" // Söylendi ama kimseyi kurtarmadı
  | "green"; // Söylendi ve birini kurtardı (oyundan çıkardı)

/** İstemciye gönderilen oyuncu görünümü (gizli sayı ASLA gönderilmez) */
export interface PublicPlayer {
  id: string; // Socket/oyuncu kimliği (kalıcı: playerId)
  name: string;
  isHost: boolean;
  connected: boolean;
  hasSecret: boolean; // Gizli sayısını onayladı mı
  eliminated: boolean; // Oyundan çıktı mı (sayısı söylendi = kurtuldu) -> izleyici
  isSpectator: boolean; // Oyuna sonradan izleyici olarak mı katıldı
  eliminatedByNumber?: number; // Hangi sayıyla oyundan çıktı (kurtuldu)
  saved: boolean; // Sayısı söylenip kurtuldu mu (kazanan)
  rank?: number; // Kurtulma sırası (1 = ilk kurtulan)
}

/** Sayı tahtasındaki tek bir hücre */
export interface BoardCell {
  number: number;
  mark: BoardMark;
  saidByName?: string; // Bu sayıyı kim söyledi
  eliminatedName?: string; // Bu sayı kimi kurtardı (yeşil ise)
}

/** Söylenen sayı geçmişi kaydı */
export interface CallRecord {
  number: number;
  byName: string;
  byId: string;
  eliminatedName: string | null; // null ise kimseyi kurtarmadı
  eliminatedId: string | null;
  timestamp: number;
}

/** İstemciye gönderilen tam oyun durumu */
export interface PublicGameState {
  roomCode: string;
  phase: GamePhase;
  players: PublicPlayer[];
  hostId: string;
  currentTurnPlayerId: string | null; // Sırası gelen aktif oyuncu
  board: BoardCell[]; // 1..31
  history: CallRecord[];
  loserId: string | null; // Oyun sonunda kaybeden (cezalı)
  activeCount: number; // Hâlâ oyunda olan oyuncu sayısı
  turnEndsAt: number | null; // Sıra bitiş zamanı (epoch ms) - süre baskısı
}

/** İstemci -> Sunucu olayları için yardımcı tipler */
export interface JoinRoomPayload {
  roomCode: string;
  name: string;
  playerId: string;
}

export interface CreateRoomPayload {
  name: string;
  playerId: string;
}

/** Sunucudan istemciye gelen ses/olay bildirimi tipi */
export type AnnouncementType =
  | "no-match" // "Bu sayı kimsede yok"
  | "saved" // "[İsim] götü kurtardı!"
  | "turn" // "[İsim] sıra sende kardeş!"
  | "loser"; // "[İsim] battı! Herkes rahat, ceza bu arkadaşta!"

export interface Announcement {
  type: AnnouncementType;
  text: string; // Tam Türkçe metin (seslendirilecek)
  name?: string; // İlgili oyuncu adı
  playerId?: string; // İlgili oyuncu kimliği
  number?: number;
}

/** Emoji reaksiyon (uçan emoji) */
export const REACTION_EMOJIS = ["😂", "😭", "🔥", "💀", "👏", "😱", "❤️", "🤡"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export interface ReactionEvent {
  id: string; // benzersiz olay kimliği (animasyon için)
  emoji: string;
  fromName: string;
  fromId: string;
  timestamp: number;
}

/** Hazır sohbet mesajları (trash talk) */
export const QUICK_CHATS = [
  "Seni bulacağım!",
  "Korkma!",
  "Hahaha",
  "Bu iş bende",
  "Aman dikkat 👀",
  "Bana güvenme 😈",
  "İyi şanslar!",
  "Titre!",
] as const;

export interface ChatEvent {
  id: string;
  text: string;
  fromName: string;
  fromId: string;
  timestamp: number;
}
