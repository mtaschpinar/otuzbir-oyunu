import type { ChatEvent } from "@shared/gameTypes";
import { useEffect, useState } from "react";

interface ChatBubblesProps {
  lastChat: ChatEvent | null;
  myId: string;
}

interface VisibleChat extends ChatEvent {
  mine: boolean;
}

/** Ekranın alt ortasında kısa süre belirip kaybolan sohbet baloncuğu (toast tarzı) */
export default function ChatBubbles({ lastChat, myId }: ChatBubblesProps) {
  const [bubble, setBubble] = useState<VisibleChat | null>(null);

  useEffect(() => {
    if (!lastChat) return;
    const item: VisibleChat = { ...lastChat, mine: lastChat.fromId === myId };
    setBubble(item);
    const t = setTimeout(() => {
      setBubble((prev) => (prev?.id === item.id ? null : prev));
    }, 2500);
    return () => clearTimeout(t);
  }, [lastChat, myId]);

  if (!bubble) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[58] pointer-events-none">
      <div
        className={`chat-bubble-in rounded-full px-4 py-2 shadow-lg border text-sm whitespace-nowrap ${
          bubble.mine
            ? "bg-emerald-500 text-white border-emerald-400"
            : "bg-amber-500 text-white border-amber-400"
        }`}
      >
        <span className="font-bold text-[11px] opacity-80">{bubble.fromName}: </span>
        <span className="font-medium">{bubble.text}</span>
      </div>
    </div>
  );
}
