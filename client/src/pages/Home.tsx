import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPlayerId, getSocket, getStoredName, setStoredName } from "@/lib/socket";
import { BookOpen, LogIn, Plus, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

type Mode = "menu" | "create" | "join";

export default function Home() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<Mode>("menu");
  const [name, setName] = useState(getStoredName());
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const socketRef = useRef(getSocket());

  useEffect(() => {
    const s = socketRef.current;
    if (!s.connected) s.connect();
  }, []);

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Lütfen bir isim gir.");
      return;
    }
    setStoredName(trimmed);
    setBusy(true);
    const s = socketRef.current;
    s.emit(
      "createRoom",
      { name: trimmed, playerId: getPlayerId() },
      (res: { ok: boolean; roomCode?: string; error?: string }) => {
        setBusy(false);
        if (res.ok && res.roomCode) {
          setLocation(`/oda/${res.roomCode}`);
        } else {
          toast.error(res.error || "Oda oluşturulamadı.");
        }
      }
    );
  };

  const handleJoin = () => {
    const trimmed = name.trim();
    const c = code.trim();
    if (!trimmed) {
      toast.error("Lütfen bir isim gir.");
      return;
    }
    if (!/^\d{4}$/.test(c)) {
      toast.error("Oda kodu 4 haneli olmalı.");
      return;
    }
    setStoredName(trimmed);
    setBusy(true);
    const s = socketRef.current;
    s.emit(
      "joinRoom",
      { roomCode: c, name: trimmed, playerId: getPlayerId() },
      (res: { ok: boolean; error?: string; asSpectator?: boolean }) => {
        setBusy(false);
        if (res.ok) {
          if (res.asSpectator) toast.info("Oyun başlamış. İzleyici olarak katıldın.");
          setLocation(`/oda/${c}`);
        } else {
          toast.error(res.error || "Odaya katılınamadı.");
        }
      }
    );
  };

  return (
    <div className="game-bg min-h-screen w-full flex flex-col">
      <header className="w-full px-4 pt-6 flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => setLocation("/kurallar")}
        >
          <BookOpen className="w-4 h-4 mr-1.5" />
          Nasıl Oynanır?
        </Button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-10">
        <div className="w-full max-w-sm">
          {/* Logo / başlık */}
          <div className="text-center mb-8 select-none">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-primary/20 border border-primary/40 mb-4 glow-pulse">
              <span className="text-5xl font-black text-primary">31</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight">31 Oyunu</h1>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              Arkadaşlarınla gerçek zamanlı sayı eleme oyunu.
              <br />
              Gizli sayını seç, son kalan cezayı kapar!
            </p>
          </div>

          {/* Menü */}
          {mode === "menu" && (
            <div className="space-y-3 announce-in">
              <Button
                size="lg"
                className="w-full h-14 text-base font-bold"
                onClick={() => setMode("create")}
              >
                <Plus className="w-5 h-5 mr-2" />
                Oda Oluştur
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="w-full h-14 text-base font-bold"
                onClick={() => setMode("join")}
              >
                <LogIn className="w-5 h-5 mr-2" />
                Odaya Katıl
              </Button>
            </div>
          )}

          {/* Oda oluştur */}
          {mode === "create" && (
            <div className="space-y-4 announce-in bg-card/60 backdrop-blur border border-border rounded-2xl p-5">
              <div className="space-y-2">
                <Label htmlFor="name">Adın</Label>
                <Input
                  id="name"
                  value={name}
                  maxLength={16}
                  placeholder="Örn: Ali"
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  autoFocus
                />
              </div>
              <Button className="w-full h-12 font-bold" disabled={busy} onClick={handleCreate}>
                {busy ? "Oluşturuluyor..." : "Odayı Kur"}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setMode("menu")}>
                Geri
              </Button>
            </div>
          )}

          {/* Odaya katıl */}
          {mode === "join" && (
            <div className="space-y-4 announce-in bg-card/60 backdrop-blur border border-border rounded-2xl p-5">
              <div className="space-y-2">
                <Label htmlFor="jname">Adın</Label>
                <Input
                  id="jname"
                  value={name}
                  maxLength={16}
                  placeholder="Örn: Ayşe"
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Oda Kodu</Label>
                <Input
                  id="code"
                  value={code}
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="4 haneli kod"
                  className="text-center text-2xl tracking-[0.5em] font-bold h-14"
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                />
              </div>
              <Button className="w-full h-12 font-bold" disabled={busy} onClick={handleJoin}>
                {busy ? "Katılınıyor..." : "Odaya Gir"}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setMode("menu")}>
                Geri
              </Button>
            </div>
          )}

          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            <span>2 - 15 oyuncu</span>
          </div>
        </div>
      </main>
    </div>
  );
}
