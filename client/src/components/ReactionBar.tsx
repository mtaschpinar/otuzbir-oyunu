import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { QUICK_CHATS, REACTION_EMOJIS } from "@shared/gameTypes";
import { MessageCircle, Smile } from "lucide-react";
import { useState } from "react";

interface ReactionBarProps {
  onReaction: (emoji: string) => void;
  onChat: (text: string) => void;
}

/** Oyun sırasında emoji ve hazır sohbet mesajı gönderme barı */
export default function ReactionBar({ onReaction, onChat }: ReactionBarProps) {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      {/* Hızlı emojiler (ilk 4 doğrudan) */}
      <div className="flex items-center gap-1">
        {REACTION_EMOJIS.slice(0, 4).map((e) => (
          <button
            key={e}
            onClick={() => onReaction(e)}
            className="num-cell w-9 h-9 text-lg bg-amber-500/20 border border-amber-400/50 hover:bg-amber-500/40 active:scale-90"
            aria-label={`${e} gönder`}
          >
            {e}
          </button>
        ))}
      </div>

      {/* Tüm emojiler */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" className="h-9 w-9 bg-amber-500/20 border-amber-400/50 hover:bg-amber-500/40 shrink-0">
            <Smile className="h-4 w-4 text-amber-300" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="end">
          <div className="grid grid-cols-4 gap-1">
            {REACTION_EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => onReaction(e)}
                className="num-cell w-10 h-10 text-xl hover:bg-accent/20 active:scale-90"
              >
                {e}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Hazır sohbet mesajları */}
      <Popover open={chatOpen} onOpenChange={setChatOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" className="h-9 w-9 bg-emerald-500/20 border-emerald-400/50 hover:bg-emerald-500/40 shrink-0">
            <MessageCircle className="h-4 w-4 text-emerald-300" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="end">
          <div className="grid gap-1">
            {QUICK_CHATS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  onChat(c);
                  setChatOpen(false);
                }}
                className="text-left text-sm rounded-lg px-3 py-2 hover:bg-accent/20 active:scale-[0.98] transition"
              >
                {c}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
