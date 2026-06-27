import { cn } from "@/lib/utils";
import type { Announcement } from "@shared/gameTypes";
import { PartyPopper, Skull, Volume2, Swords } from "lucide-react";
import { useEffect, useState } from "react";

interface AnnouncementBannerProps {
  announcement: Announcement | null;
}

/** Son anonsu birkaç saniye gösteren üst bant */
export default function AnnouncementBanner({ announcement }: AnnouncementBannerProps) {
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState<Announcement | null>(null);

  useEffect(() => {
    if (!announcement) return;
    setCurrent(announcement);
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 3200);
    return () => clearTimeout(t);
  }, [announcement]);

  if (!current || !visible) return null;

  const type = current.type;
  const styleByType: Record<string, string> = {
    saved: "bg-emerald-500/90 border-emerald-400 text-white",
    loser: "bg-destructive/90 border-destructive text-destructive-foreground",
    turn: "bg-primary/90 border-primary text-primary-foreground",
    "no-match": "bg-card/90 border-border text-foreground",
  };

  const Icon =
    type === "saved"
      ? PartyPopper
      : type === "loser"
      ? Skull
      : type === "turn"
      ? Swords
      : Volume2;

  return (
    <div className="fixed inset-x-0 top-3 z-50 flex justify-center px-4 pointer-events-none">
      <div
        className={cn(
          "announce-in pointer-events-auto flex items-center gap-2.5 rounded-2xl px-5 py-3 shadow-xl border backdrop-blur max-w-[92vw]",
          styleByType[type] || styleByType["no-match"]
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className="font-bold text-sm sm:text-base">
          {current.text}
          {current.number != null && (
            <span className="ml-2 opacity-80 font-normal">({current.number})</span>
          )}
        </span>
      </div>
    </div>
  );
}
