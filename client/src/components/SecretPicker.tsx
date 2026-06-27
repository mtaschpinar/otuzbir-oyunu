import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { MAX_NUMBER, MIN_NUMBER } from "@shared/gameTypes";
import { Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface SecretPickerProps {
  confirmed: boolean;
  confirmedNumber: number | null;
  onConfirm: (n: number) => Promise<{ ok: boolean; error?: string }>;
  waitingCount: number;
  totalCount: number;
}

export default function SecretPicker({
  confirmed,
  confirmedNumber,
  onConfirm,
  waitingCount,
  totalCount,
}: SecretPickerProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const numbers = Array.from({ length: MAX_NUMBER - MIN_NUMBER + 1 }, (_, i) => MIN_NUMBER + i);

  const handleConfirm = async () => {
    if (selected == null) return;
    setBusy(true);
    const res = await onConfirm(selected);
    setBusy(false);
    setDialogOpen(false);
    if (!res.ok) toast.error(res.error || "Sayı onaylanamadı.");
  };

  if (confirmed) {
    return (
      <div className="text-center py-8 announce-in">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-500/15 border border-emerald-500/40 mb-4">
          <Lock className="w-9 h-9 text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold">Gizli sayın onaylandı</h2>
        <p className="text-5xl font-black text-primary my-3">{confirmedNumber}</p>
        <p className="text-sm text-muted-foreground">
          Bu sayı artık değiştirilemez.
          <br />
          Diğer oyuncular bekleniyor... ({totalCount - waitingCount}/{totalCount} hazır)
        </p>
      </div>
    );
  }

  return (
    <div className="announce-in">
      <div className="text-center mb-4">
        <h2 className="text-lg font-bold">Gizli sayını seç</h2>
        <p className="text-sm text-muted-foreground">
          1-31 arası bir sayı seç. Kimse göremez, onayladıktan sonra değiştirilemez.
        </p>
      </div>

      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 sm:gap-2 mb-5">
        {numbers.map((n) => (
          <button
            key={n}
            type="button"
            onClick={(e) => {
              const el = e.currentTarget;
              el.classList.remove("num-pop");
              void el.offsetWidth;
              el.classList.add("num-pop");
              setSelected(n);
            }}
            onAnimationEnd={(e) => e.currentTarget.classList.remove("num-pop")}
            className={cn(
              "num-cell text-base sm:text-lg border",
              selected === n
                ? "bg-primary text-primary-foreground border-primary scale-105"
                : "bg-secondary/60 border-border hover:bg-primary/20"
            )}
          >
            {n}
          </button>
        ))}
      </div>

      <Button
        className="w-full h-12 font-bold"
        disabled={selected == null}
        onClick={() => setDialogOpen(true)}
      >
        {selected == null ? "Bir sayı seç" : `${selected} sayısını onayla`}
      </Button>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gizli sayın: {selected}</AlertDialogTitle>
            <AlertDialogDescription>
              Bu sayıyı onaylıyor musun? Onayladıktan sonra <strong>kesinlikle değiştirilemez</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={handleConfirm}>
              {busy ? "Onaylanıyor..." : "Evet, onayla"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
