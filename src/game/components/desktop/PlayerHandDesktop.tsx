import type { AttrKey, Card, Position } from "../../types";
import { POSITION_LABELS } from "../../types";
import type { Phase } from "../../hooks/useGameEngine";
import { CardView } from "../CardView";
import type { PlayerHandProps } from "../mobile/PlayerHandMobile";

/**
 * 💻 PLAYER HAND DESKTOP (Exclusivo para PC / Monitores Widescreen >= 768px)
 * Blindado contra qualquer alteração feita no layout Mobile.
 */
export function PlayerHandDesktop({
  pos,
  pHand,
  phase,
  pUsedCardIds,
  pSelectedCardId,
  chosenAttr,
  onSelectCard,
}: PlayerHandProps) {
  return (
    <div className="w-full max-w-4xl mx-auto mt-2 bg-gradient-to-b from-slate-900/90 via-slate-950/95 to-slate-900/90 border-2 border-arcade-yellow/50 p-4 rounded-2xl shadow-2xl backdrop-blur-md relative overflow-hidden">
      {/* Luz ambiente na bandeja de cartas */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-arcade-yellow to-transparent opacity-70" />

      {/* Cabeçalho Desktop com Posição */}
      <div className="font-arcade text-xs text-center mb-2.5 flex items-center justify-center gap-2 relative z-10">
        <span className="text-sm">🃏</span>
        <span className="text-arcade-yellow font-bold uppercase tracking-wider">
          {POSITION_LABELS[pos]}
        </span>
      </div>

      {/* Cartas em formato Small com espaçamento confortável e efeito de elevação no hover */}
      <div className="flex gap-4 justify-center items-center flex-nowrap relative z-10 overflow-x-auto pb-1">
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
                    ? "hover:-translate-y-2 cursor-pointer hover:scale-105"
                    : ""
              } ${
                isSelectable ? "ring-4 ring-arcade-yellow rounded-lg animate-pulse" : ""
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
