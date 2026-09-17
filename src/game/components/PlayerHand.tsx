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
    <div className="w-full max-w-4xl mx-auto mt-2 bg-arcade-dark/60 border-2 border-arcade-yellow/40 p-3 rounded-md shadow-arcade">
      <div className="font-arcade text-[10px] text-arcade-cream text-center mb-2 flex items-center justify-center gap-2">
        <span>🃏</span>
        <span>SUA MÃO — {POSITION_LABELS[pos]}</span>
        {phase === "SELECT_CARD" && (
          <span className="text-arcade-yellow bg-arcade-dark px-2 py-0.5 border border-arcade-yellow text-[9px] animate-pulse">
            CLIQUE EM UMA CARTA PARA JOGAR
          </span>
        )}
      </div>
      <div className="flex gap-4 justify-center items-center flex-wrap">
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
