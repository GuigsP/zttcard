import type { AttrKey, Card, Position } from "../types";
import { POSITION_LABELS } from "../types";
import type { Phase } from "../hooks/useGameEngine";
import { CardView } from "./CardView";

type Props = {
  pos: Position;
  pHand: Card[];
  phase: Phase;
  pUsedCardIds: string[];
  pSelectedCardId: string | null;
  chosenAttr: AttrKey | null;
  onSelectCard: (card: Card) => void;
};

export function PlayerHand({
  pos,
  pHand,
  phase,
  pUsedCardIds,
  pSelectedCardId,
  chosenAttr,
  onSelectCard,
}: Props) {
  return (
    <div className="w-full max-w-4xl mx-auto mt-2 bg-gradient-to-b from-slate-900/90 via-slate-950/95 to-slate-900/90 border-2 border-arcade-yellow/50 p-3 sm:p-4 rounded-2xl shadow-2xl backdrop-blur-md relative overflow-hidden">
      {/* Luz ambiente na bandeja de cartas */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-arcade-yellow to-transparent opacity-70" />
      <div className="font-arcade text-[10px] sm:text-xs text-arcade-cream text-center mb-3 flex items-center justify-center gap-2 relative z-10">
        <span>🃏</span>
        <span className="text-arcade-yellow font-bold uppercase tracking-wider">SUA MÃO — {POSITION_LABELS[pos]}</span>
        {phase === "SELECT_CARD" && (
          <span className="text-arcade-dark bg-arcade-yellow px-2.5 py-0.5 rounded font-black text-[9px] shadow-[0_0_8px_rgba(255,214,10,0.8)] animate-pulse">
            ESCOLHA SEU CRAQUE
          </span>
        )}
      </div>
      <div className="flex gap-3 sm:gap-5 justify-center items-center flex-wrap relative z-10">
        {pHand.map((c) => {
          const used = pUsedCardIds.includes(c.id);
          const isCurrent = pSelectedCardId === c.id;
          const isSelectable = phase === "SELECT_CARD" && !used;
          return (
            <div
              key={c.id}
              className={`transition-all duration-200 ${
                used ? "opacity-35 scale-95 grayscale" : isSelectable ? "hover:-translate-y-2 cursor-pointer hover:scale-105" : ""
              } ${
                isSelectable ? "ring-4 ring-arcade-yellow rounded-md animate-pulse" : ""
              }`}
            >
              <CardView
                card={c}
                small
                selected={isCurrent}
                highlightAttr={isCurrent ? chosenAttr : null}
                onClick={isSelectable ? () => onSelectCard(c) : undefined}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
