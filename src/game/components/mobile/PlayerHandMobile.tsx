import type { AttrKey, Card, Position } from "../../types";
import { POSITION_LABELS } from "../../types";
import type { Phase } from "../../hooks/useGameEngine";
import { CardView } from "../CardView";

export type PlayerHandProps = {
  pos: Position;
  pHand: Card[];
  phase: Phase;
  pUsedCardIds: string[];
  pSelectedCardId: string | null;
  chosenAttr: AttrKey | null;
  onSelectCard: (card: Card) => void;
};

/**
 * 📱 PLAYER HAND MOBILE (Exclusivo para Smartphone / Telas Verticais < 768px)
 * Blindado contra qualquer alteração feita no layout Desktop / PC.
 */
export function PlayerHandMobile({
  pos,
  pHand,
  phase,
  pUsedCardIds,
  pSelectedCardId,
  chosenAttr,
  onSelectCard,
}: PlayerHandProps) {
  return (
    <div className="w-full max-w-sm mx-auto mt-1 bg-gradient-to-b from-slate-900/90 via-slate-950/95 to-slate-900/90 border-2 border-arcade-yellow/50 p-2 rounded-xl shadow-2xl backdrop-blur-md relative overflow-hidden">
      {/* Luz ambiente na bandeja de cartas */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-arcade-yellow to-transparent opacity-70" />

      {/* Cabeçalho enxuto */}
      <div className="font-arcade text-[9.5px] text-center mb-1.5 flex items-center justify-center gap-1.5 relative z-10">
        <span className="text-xs">🃏</span>
        <span className="text-arcade-yellow font-bold uppercase tracking-wider">
          {POSITION_LABELS[pos]}
        </span>
      </div>

      {/* Cartas em formato Compact para caberem perfeitamente na tela vertical */}
      <div className="flex gap-1.5 justify-center items-center flex-nowrap relative z-10 overflow-x-auto pb-0.5">
        {pHand.map((c) => {
          const used = pUsedCardIds.includes(c.id);
          const isCurrent = pSelectedCardId === c.id;
          const isSelectable = phase === "SELECT_CARD" && !used;

          return (
            <div
              key={c.id}
              className={`transition-all duration-200 shrink-0 ${
                used
                  ? "opacity-35 scale-95 grayscale"
                  : isSelectable
                    ? "cursor-pointer active:scale-95"
                    : ""
              } ${
                isSelectable ? "ring-2 ring-arcade-yellow rounded-lg animate-pulse" : ""
              }`}
            >
              <CardView
                card={c}
                compact
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
