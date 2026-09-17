import { useEffect, useState } from "react";
import type { MPReaction, MPSide } from "./humanEngine";

const QUICK_EMOJIS = ["⚽", "🧤", "🟨", "🚩", "🔥", "👏", "😂", "👀"];

type Props = {
  myRole: MPSide;
  reactions: MPReaction[];
  onSendReaction: (emoji: string) => void;
};

export function EmojiReactions({ myRole, reactions, onSendReaction }: Props) {
  const [activeFloating, setActiveFloating] = useState<MPReaction[]>([]);

  useEffect(() => {
    if (reactions.length === 0) return;
    const latest = reactions[reactions.length - 1];
    if (Date.now() - latest.timestamp < 4000) {
      setActiveFloating((prev) => [...prev, latest]);
      const timer = setTimeout(() => {
        setActiveFloating((prev) => prev.filter((r) => r.id !== latest.id));
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [reactions]);

  return (
    <>
      {/* Floating animated reactions on screen */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {activeFloating.map((r) => {
          const isMe = r.side === myRole;
          return (
            <div
              key={r.id}
              className={`absolute bottom-28 ${
                isMe ? "right-8" : "left-8"
              } text-4xl md:text-5xl animate-bounce transform transition-all duration-1000 ease-out opacity-90`}
              style={{
                animation: "floatUp 2.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards",
              }}
            >
              {r.emoji}
            </div>
          );
        })}
      </div>

      {/* Quick reaction bar at the bottom */}
      <div className="fixed bottom-3 right-4 z-40 bg-arcade-dark/90 border-2 border-arcade-yellow rounded-md p-1.5 flex items-center gap-1.5 shadow-arcade">
        <span className="font-arcade text-[8px] text-arcade-yellow px-1 hidden sm:inline">
          REAÇÃO:
        </span>
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSendReaction(emoji)}
            className="w-7 h-7 flex items-center justify-center text-sm hover:scale-125 transition-transform bg-arcade-cream/10 rounded hover:bg-arcade-yellow/30"
            title={`Reagir com ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(0.6); opacity: 0; }
          20% { transform: translateY(-20px) scale(1.3); opacity: 1; }
          80% { transform: translateY(-120px) scale(1.1); opacity: 0.9; }
          100% { transform: translateY(-160px) scale(0.9); opacity: 0; }
        }
      `}</style>
    </>
  );
}
