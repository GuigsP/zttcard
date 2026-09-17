import type { AttrKey, Card } from "../types";
import { ATTR_LABELS, POSITION_LABELS, POSITION_SHORT, attrsForPosition } from "../types";
import { getPackTheme } from "../packThemes";

type Props = {
  card?: Card;
  faceDown?: boolean;
  small?: boolean;
  highlightAttr?: AttrKey | null;
  selected?: boolean;
  onClick?: () => void;
  dim?: boolean;
};

export function CardView({
  card,
  faceDown,
  small,
  highlightAttr,
  selected,
  onClick,
  dim,
}: Props) {
  const size = small
    ? "w-[140px] h-[200px]"
    : "w-[200px] h-[290px]";

  if (faceDown || !card) {
    return (
      <div
        className={`${size} rounded-md border-4 border-arcade-yellow bg-arcade-blue flex items-center justify-center shadow-arcade`}
      >
        <div className="text-arcade-yellow font-arcade text-xs text-center leading-relaxed p-2">
          ZERO TO TOP<br />CARD
        </div>
      </div>
    );
  }

  const theme = getPackTheme(card.packSlug);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      style={{
        borderColor: selected ? "#ffd60a" : theme.border,
      }}
      className={`${size} rounded-md border-4 bg-arcade-cream text-arcade-dark flex flex-col relative overflow-hidden shadow-arcade transition-transform ${
        onClick ? "hover:-translate-y-1 cursor-pointer" : "cursor-default"
      } ${dim ? "opacity-50" : ""}`}
    >
      <div
        className={`flex items-start justify-between pt-1 ${small ? "px-1.5" : "px-2"}`}
        style={{ backgroundColor: theme.topBg, color: theme.topFg }}
      >
        <div className="font-arcade text-[8px] leading-tight min-w-0 truncate flex-shrink">
          {small ? POSITION_SHORT[card.position] : POSITION_LABELS[card.position]}
        </div>
        <div className={`flex items-center flex-shrink-0 ${small ? "gap-1" : "gap-1.5"}`}>
          {theme.badge && (
            <div
              className="font-arcade text-[8px] leading-none px-1.5 py-0.5 rounded border"
              style={{
                backgroundColor: theme.topFg,
                color: theme.border,
                borderColor: theme.border,
              }}
              title={theme.label}
            >
              {theme.badge}
            </div>
          )}
          {typeof card.cardNumber === "number" && (
            <div className="font-arcade text-[8px] leading-none bg-arcade-cream text-arcade-dark px-1.5 py-0.5 rounded border border-arcade-dark/40">
              #{String(card.cardNumber).padStart(3, "0")}
            </div>
          )}
          <div className="font-arcade text-lg leading-none">{card.ovr}</div>
        </div>
      </div>
      <div className={`flex-1 flex items-center justify-center text-center min-w-0 ${small ? "px-1" : "px-2"}`}>
        {small ? (
          <svg
            viewBox="0 0 100 20"
            preserveAspectRatio="xMidYMid meet"
            className="w-full"
            style={{ height: 28 }}
            aria-label={card.name}
          >
            <text
              x="50"
              y="15"
              textAnchor="middle"
              textLength="96"
              lengthAdjust="spacingAndGlyphs"
              style={{
                fontFamily: theme.nameFont,
                fontSize: 16,
                fill: "currentColor",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {card.name.toUpperCase()}
            </text>
          </svg>
        ) : (
          <div
            className="uppercase tracking-wider break-words hyphens-auto w-full text-xl leading-tight"
            style={{ fontFamily: theme.nameFont }}
          >
            {card.name}
          </div>
        )}
      </div>
      <div className="px-2 pb-2 space-y-1">
        {attrsForPosition(card.position).map((k) => {
          const v = card.attrs[k] ?? 0;
          return (
            <div
              key={k}
              className={`flex justify-between items-center px-2 py-0.5 rounded ${
                highlightAttr === k
                  ? "bg-arcade-yellow text-arcade-dark shadow-[0_0_10px_var(--arcade-yellow)]"
                  : "bg-arcade-dark/10"
              }`}
            >
              <span className="font-arcade text-[8px]">{ATTR_LABELS[k]}</span>
              <span className="font-display text-lg leading-none">{v}</span>
            </div>
          );
        })}
      </div>
      {!small && (
        <div className="px-2 pb-1 text-[9px] italic font-body text-arcade-dark/70 text-center">
          "{card.quote}"
        </div>
      )}
    </button>
  );
}
