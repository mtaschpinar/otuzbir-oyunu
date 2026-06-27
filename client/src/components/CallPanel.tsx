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
import { useState } from "react";
import { toast } from "sonner";

interface CallPanelProps {
  myTurn: boolean;
  currentTurnName: string | null;
  pendingNumber: number | null;
  onClearPending: () => void;
  onCall: (n: number) => Promise<{ ok: boolean; error?: string }>;
}

/**
 * Sayı tahtasından seçilen sayıyı onaylayıp söyleyen panel.
 * Sayı seçimi tahtadan yapılır (pendingNumber), burada onay alınır.
 */
export default function CallPanel({
  myTurn,
  currentTurnName,
  pendingNumber,
  onClearPending,
  onCall,
}: CallPanelProps) {
  const [busy, setBusy] = useState(false);

  const handleCall = async () => {
    if (pendingNumber == null) return;
    setBusy(true);
    const res = await onCall(pendingNumber);
    setBusy(false);
    if (!res.ok) toast.error(res.error || "Sayı söylenemedi.");
    onClearPending();
  };

  if (!myTurn) {
    return (
      <div className="rounded-2xl bg-card/50 border border-border px-4 py-3 text-center">
        <p className="text-sm text-muted-foreground">
          Sıra <span className="font-bold text-foreground">{currentTurnName || "..."}</span>{" "}
          oyuncusunda
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl bg-primary/15 border border-primary/40 px-4 py-3 text-center glow-pulse">
        <p className="text-sm font-bold text-primary">Sıra sende!</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Tahtadan bir sayı seç (kendi gizli sayını söyleyemezsin)
        </p>
      </div>

      <AlertDialog
        open={pendingNumber != null}
        onOpenChange={(o) => !o && onClearPending()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingNumber} sayısını söyle</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{pendingNumber}</strong> sayısını söylemek istediğine emin misin? Bu sayı
              bir oyuncuda varsa o oyuncu kurtulur (oyundan çıkar); kimsede yoksa sıra geçer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={handleCall}>
              {busy ? "Söyleniyor..." : "Söyle"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
