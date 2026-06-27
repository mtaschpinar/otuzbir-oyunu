import { describe, expect, it } from "vitest";
import {
  addPlayer,
  callNumber,
  confirmSecret,
  createRoom,
  generateRoomCode,
  pickRandomValidNumber,
  resetGame,
  startGame,
  toPublicState,
  type Room,
} from "./engine";

function makeRoom(): Room {
  return createRoom("1234", { id: "host", name: "Host", socketId: "s_host" });
}

function addP(room: Room, id: string, name: string) {
  return addPlayer(room, { id, name, socketId: "s_" + id });
}

describe("oda oluşturma ve katılma", () => {
  it("host ile oda oluşturur", () => {
    const room = makeRoom();
    expect(room.players).toHaveLength(1);
    expect(room.players[0].isHost).toBe(true);
    expect(room.phase).toBe("lobby");
    expect(room.board).toHaveLength(31);
  });

  it("oyuncu ekler ve aynı id ile tekrar eklemez (reconnect)", () => {
    const room = makeRoom();
    addP(room, "a", "Ali");
    expect(room.players).toHaveLength(2);
    const again = addP(room, "a", "Ali");
    expect(again.ok).toBe(true);
    expect(room.players).toHaveLength(2);
  });

  it("15 oyuncu sınırını lobide uygular", () => {
    const room = makeRoom();
    for (let i = 0; i < 14; i++) addP(room, "p" + i, "P" + i);
    expect(room.players).toHaveLength(15);
    const overflow = addP(room, "extra", "Fazla");
    expect(overflow.ok).toBe(false);
  });
});

describe("oyun başlatma ve gizli sayı", () => {
  it("sadece host başlatabilir ve en az 2 oyuncu gerekir", () => {
    const room = makeRoom();
    expect(startGame(room, "host").ok).toBe(false); // tek kişi
    addP(room, "a", "Ali");
    expect(startGame(room, "a").ok).toBe(false); // host değil
    expect(startGame(room, "host").ok).toBe(true);
    expect(room.phase).toBe("selecting");
  });

  it("gizli sayı onaylanınca değiştirilemez", () => {
    const room = makeRoom();
    addP(room, "a", "Ali");
    startGame(room, "host");
    expect(confirmSecret(room, "host", 5).ok).toBe(true);
    const second = confirmSecret(room, "host", 9);
    expect(second.ok).toBe(false);
    expect(second.error).toContain("değiştirilemez");
  });

  it("geçersiz sayı reddedilir", () => {
    const room = makeRoom();
    addP(room, "a", "Ali");
    startGame(room, "host");
    expect(confirmSecret(room, "host", 0).ok).toBe(false);
    expect(confirmSecret(room, "host", 32).ok).toBe(false);
  });

  it("tüm sayılar onaylanınca oyun başlar ve ilk sıra belirlenir", () => {
    const room = makeRoom();
    addP(room, "a", "Ali");
    startGame(room, "host");
    confirmSecret(room, "host", 5);
    const res = confirmSecret(room, "a", 10);
    expect(res.allConfirmed).toBe(true);
    expect(room.phase).toBe("playing");
    expect(room.currentTurnPlayerId).toBe("host"); // order 0
  });
});

describe("sayı söyleme ve eleme", () => {
  function setupPlaying() {
    const room = makeRoom(); // host order 0
    addP(room, "a", "Ali"); // order 1
    addP(room, "b", "Veli"); // order 2
    startGame(room, "host");
    confirmSecret(room, "host", 5);
    confirmSecret(room, "a", 10);
    confirmSecret(room, "b", 15);
    return room;
  }

  it("kendi gizli sayısını söyleyemez", () => {
    const room = setupPlaying();
    const res = callNumber(room, "host", 5); // host'un gizli sayısı 5
    expect(res.ok).toBe(false);
    expect(res.error).toContain("Kendi gizli");
  });

  it("sıra dışındaki oyuncu söyleyemez", () => {
    const room = setupPlaying();
    expect(callNumber(room, "a", 7).ok).toBe(false);
  });

  it("eşleşme yoksa kırmızı işaret ve sıra ilerler", () => {
    const room = setupPlaying();
    const res = callNumber(room, "host", 20); // kimsede yok
    expect(res.ok).toBe(true);
    expect(res.savedName).toBeNull();
    expect(room.board[19].mark).toBe("red");
    expect(room.currentTurnPlayerId).toBe("a");
  });

  it("eşleşme varsa o oyuncu kurtulur (saved) ve yeşil işaret konur", () => {
    const room = setupPlaying();
    const res = callNumber(room, "host", 10); // Ali'nin sayısı
    expect(res.ok).toBe(true);
    expect(res.savedName).toBe("Ali");
    expect(room.board[9].mark).toBe("green");
    const ali = room.players.find((p) => p.id === "a")!;
    expect(ali.eliminated).toBe(true);
    expect(ali.saved).toBe(true);
    expect(ali.rank).toBe(1);
    expect(ali.eliminatedByNumber).toBe(10);
  });

  it("zaten söylenmiş sayı tekrar söylenemez", () => {
    const room = setupPlaying();
    callNumber(room, "host", 20);
    // sıra a'da; a 20'yi tekrar söyleyemez
    expect(callNumber(room, "a", 20).ok).toBe(false);
  });

  it("son kalan oyuncu kaybeder, oyun biter", () => {
    const room = setupPlaying(); // host=5, a=10, b=15
    // host Ali'yi eler (10)
    callNumber(room, "host", 10);
    expect(room.phase).toBe("playing");
    // sıra Veli'de (b), çünkü a elendi -> host sonrası a atlanır -> b
    expect(room.currentTurnPlayerId).toBe("b");
    // Veli, host'u kurtarır (5)
    const res = callNumber(room, "b", 5);
    expect(res.gameOver).toBe(true);
    expect(room.phase).toBe("finished");
    // Geriye sadece Veli kaldı -> kaybeden (cezalı) Veli
    expect(room.loserId).toBe("b");
    // Kurtulanlar saved=true, kaybeden saved=false
    expect(room.players.find((p) => p.id === "a")!.saved).toBe(true);
    expect(room.players.find((p) => p.id === "host")!.saved).toBe(true);
    expect(room.players.find((p) => p.id === "b")!.saved).toBe(false);
  });

  it("kurtulma sırası (rank) artan şekilde atanır", () => {
    const room = setupPlaying(); // host=5, a=10, b=15
    callNumber(room, "host", 10); // Ali kurtulur rank 1
    callNumber(room, "b", 5); // host kurtulur rank 2, oyun biter
    expect(room.players.find((p) => p.id === "a")!.rank).toBe(1);
    expect(room.players.find((p) => p.id === "host")!.rank).toBe(2);
  });

  it("history söylenen sayıları kaydeder", () => {
    const room = setupPlaying();
    callNumber(room, "host", 20); // boşa
    callNumber(room, "a", 15); // Veli kurtulur
    expect(room.history).toHaveLength(2);
    expect(room.history[0]).toMatchObject({ number: 20, byName: "Host", eliminatedName: null });
    expect(room.history[1]).toMatchObject({ number: 15, byName: "Ali", eliminatedName: "Veli" });
  });

  it("süre dolunca geçerli rastgele sayı seçilir (kendi gizli sayısı ve dolu hücreler hariç)", () => {
    const room = setupPlaying(); // host=5
    callNumber(room, "host", 20); // 20 dolu, sıra a'da
    const n = pickRandomValidNumber(room, "host");
    expect(n).not.toBeNull();
    expect(n).not.toBe(5); // kendi gizli sayısı
    expect(n).not.toBe(20); // dolu hücre
  });
});

describe("izleyici modu", () => {
  it("oyun başladıktan sonra katılan izleyici olur", () => {
    const room = makeRoom();
    addP(room, "a", "Ali");
    startGame(room, "host");
    const res = addP(room, "izle", "İzleyici");
    expect(res.asSpectator).toBe(true);
    const spec = room.players.find((p) => p.id === "izle")!;
    expect(spec.isSpectator).toBe(true);
    expect(spec.eliminated).toBe(true);
  });
});

describe("public state gizli sayıyı sızdırmaz", () => {
  it("toPublicState gizli sayı içermez", () => {
    const room = makeRoom();
    addP(room, "a", "Ali");
    startGame(room, "host");
    confirmSecret(room, "host", 7);
    const pub = toPublicState(room);
    const json = JSON.stringify(pub);
    // hasSecret true olmalı ama 7 değeri görünmemeli (board'da da olmamalı)
    expect(pub.players.find((p) => p.id === "host")?.hasSecret).toBe(true);
    // 'secret' alanı asla olmamalı
    expect(json).not.toContain('"secret"');
  });
});

describe("rematch", () => {
  it("oyunu lobiye sıfırlar ve izleyicileri oyuncu yapar", () => {
    const room = makeRoom();
    addP(room, "a", "Ali");
    startGame(room, "host");
    confirmSecret(room, "host", 5);
    confirmSecret(room, "a", 10);
    callNumber(room, "host", 10); // Ali elenir, oyun biter (2 kişi)
    expect(room.phase).toBe("finished");
    const res = resetGame(room, "host");
    expect(res.ok).toBe(true);
    expect(room.phase).toBe("lobby");
    expect(room.players.every((p) => !p.eliminated && !p.secretConfirmed)).toBe(true);
    expect(room.board.every((c) => c.mark === "none")).toBe(true);
  });
});

describe("oda kodu üretimi", () => {
  it("benzersiz 4 haneli kod üretir", () => {
    const used = new Set(["1234", "5678"]);
    const code = generateRoomCode((c) => used.has(c));
    expect(code).not.toBeNull();
    expect(code).toMatch(/^\d{4}$/);
    expect(used.has(code!)).toBe(false);
  });

  it("tüm kodlar doluysa null döner", () => {
    const code = generateRoomCode(() => true);
    expect(code).toBeNull();
  });
});
