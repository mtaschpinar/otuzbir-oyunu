import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

/**
 * Socket.io bağlantısı:
 * - URL belirtilmez → tarayıcının mevcut origin'ini kullanır (otomatik)
 *   Production'da https://otuzbirgame-kcxpcjdd.manus.space → wss:// otomatik
 *   Development'da http://localhost:3000 → ws:// otomatik
 * - secure: true KULLANILMAZ → Cloud Run SSL'i proxy katmanında sonlandırır,
 *   sunucu HTTP üzerinden çalışır; secure:true bu durumda SSL hatası verir.
 * - Önce WebSocket dener, başarısız olursa polling'e düşer (mobil operatör uyumluluğu)
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      path: "/api/socket.io",
      transports: ["websocket", "polling"],
      upgrade: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
      timeout: 30000,
    });
  }
  return socket;
}

/** Kalıcı oyuncu kimliği (tarayıcı yenilense de aynı kalır) */
export function getPlayerId(): string {
  const KEY = "otuzbir_player_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id =
      "p_" +
      Math.random().toString(36).slice(2, 10) +
      Date.now().toString(36).slice(-4);
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function getStoredName(): string {
  return localStorage.getItem("otuzbir_name") || "";
}

export function setStoredName(name: string) {
  localStorage.setItem("otuzbir_name", name);
}
