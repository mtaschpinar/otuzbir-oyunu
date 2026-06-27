import type { ChatEvent } from "@shared/gameTypes";
import { useEffect, useState } from "react";

interface ChatBubblesProps {
  lastChat: ChatEvent | null;
  myId: string;
}

interface VisibleChat extends ChatEvent {
  mine: boolean;
}

/** Sağ altta beliren, birkaç saniye sonra kaybolan sohbet baloncukları */
export default function ChatBubbles({ lastChat, myId }: ChatBubblesProps) {
  const [bubbles, setBubbles] = useState<VisibleChat[]>([]);

  useEffect(() => {
    if (!lastChat) return;
    const item: VisibleChat = { ...lastChat, mine: lastChat.fromId === myId };
    setBubbles((prev) => [...prev.slice(-4), item]);
    const t = setTimeout(() => {
      setBubbles((prev) => prev.filter((b) => b.id !== item.id));
    }, 4500);
    return () => clearTimeout(t);
  }, [lastChat, myId]);

  if (bubbles.length === 0) return null;

  return (
    <div className="fixed bottom-24 right-3 z-[58] flex flex-col items-end gap-2 max-w-[75vw] pointer-events-none">
      {bubbles.map((b) => (
        <div
          key={b.id}
          className={`chat-bubble-in rounded-2xl px-3.5 py-2 shadow-lg border text-sm max-w-full ${
            b.mine
              ? "bg-emerald-500 text-white border-emerald-400 rounded-br-sm"
              : "bg-amber-500 text-white border-amber-400 rounded-bl-sm"
          }`}
        >
          <span className="block text-[10px] font-bold opacity-70 leading-none mb-0.5">
            {b.fromName}
          </span>
          <span className="font-medium break-words">{b.text}</span>
        </div>
      ))}
    </div>
  );
}
