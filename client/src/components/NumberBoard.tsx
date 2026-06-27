import { cn } from "@/lib/utils";
import type { BoardCell } from "@shared/gameTypes";
import { X } from "lucide-react";

interface NumberBoardProps {
  board: BoardCell[];
  /** Sayıya tıklanabilir mi (sıra bende ve oyun aşamasında) */
  selectable?: boolean;
  /** Söylenemez sayı (kendi gizli sayısı) */
  disabledNumber?: number | null;
  onPick?: (n: number) => void;
}

export default function NumberBoard({
  board,
  selectable = false,
  disabledNumber = null,
  onPick,
}: NumberBoardProps) {
  return (
    <div className="grid grid-cols-6 gap-1.5 sm:gap-2 sm:grid-cols-8">
      {board.map((cell) => {
        const used = cell.mark !== "none";
        const isOwnSecret = disabledNumber === cell.number;
        const clickable = selectable && !used && !isOwnSecret;
        return (
          <button
            key={cell.number}
            type="button"
            disabled={!clickable}
            onClick={(e) => {
              if (!clickable) return;
              const el = e.currentTarget;
              el.classList.remove("num-pop");
              // reflow ile animasyonu yeniden tetikle
              void el.offsetWidth;
              el.classList.add("num-pop");
              onPick?.(cell.number);
            }}
            onAnimationEnd={(e) => e.currentTarget.classList.remove("num-pop")}
            title={
              cell.mark === "green"
                ? `${cell.saidByName} söyledi → ${cell.eliminatedName} kurtuldu`
                : cell.mark === "red"
                ? `${cell.saidByName} söyledi → kimse çıkmadı`
                : undefined
            }
            style={
              clickable
                ? { animationDelay: `${(cell.number % 8) * 90}ms` }
                : undefined
            }
            className={cn(
              "num-cell text-base sm:text-lg border",
              cell.mark === "none" &&
                "bg-secondary/60 border-border text-foreground",
              cell.mark === "red" &&
                "bg-destructive/15 border-destructive/40 text-destructive",
              cell.mark === "green" &&
                "bg-emerald-500/15 border-emerald-500/40 text-emerald-400",
              clickable &&
                "hover:bg-primary/30 hover:border-primary cursor-pointer attention-glow",
              isOwnSecret && !used && "opacity-30 cursor-not-allowed",
              !clickable && !used && "cursor-default"
            )}
          >
            <span className={cn(used && "opacity-70")}>{cell.number}</span>
            {used && (
              <X
                className={cn(
                  "absolute inset-0 m-auto h-7 w-7 sm:h-8 sm:w-8",
                  cell.mark === "red" && "text-destructive",
                  cell.mark === "green" && "text-emerald-400"
                )}
                strokeWidth={3}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
