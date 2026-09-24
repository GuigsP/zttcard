import type { AttrKey, Card } from "../types";
import { ATTR_LABELS, POSITION_LABELS, POSITION_SHORT, attrsForPosition } from "../types";
import { getPackTheme, type FrameStyle } from "../packThemes";

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
  const frameStyle: FrameStyle = theme.frameStyle || "waves";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      style={{
        borderColor: selected ? "#ffd60a" : theme.border,
      }}
      className={`${size} rounded-lg border-4 bg-arcade-cream text-arcade-dark flex flex-col relative overflow-hidden shadow-arcade transition-transform ${
        onClick ? "hover:-translate-y-1 cursor-pointer" : "cursor-default"
      } ${dim ? "opacity-50" : ""}`}
    >
      {/* 1. DESENHOS DE MOLDURA: CAMADA DECORATIVA ESPECÍFICA DE CADA MODELO */}
      <FrameOrnaments
        style={frameStyle}
        border={theme.border}
        accent={theme.accent}
        small={small}
      />

      {/* 2. CABEÇALHO DO CARD COM DESENHO INTEGRADO */}
      <div
        className={`relative z-10 flex items-start justify-between pt-1 ${small ? "px-1.5" : "px-2"}`}
        style={{ backgroundColor: theme.topBg, color: theme.topFg }}
      >
        <div className="font-arcade text-[8px] leading-tight min-w-0 truncate flex-shrink flex items-center gap-1">
          {card.clubBadgeUrl && (
            <span
              className="inline-flex items-center justify-center flex-shrink-0"
              title="Escudo do Clube"
            >
              {typeof card.clubBadgeUrl === "string" && (card.clubBadgeUrl.startsWith("http") || card.clubBadgeUrl.startsWith("/")) ? (
                <img
                  src={card.clubBadgeUrl}
                  alt="Escudo"
                  className={`${small ? "w-3.5 h-3.5" : "w-4.5 h-4.5"} object-contain rounded-xs drop-shadow-xs`}
                  loading="lazy"
                />
              ) : (
                <span className={small ? "text-xs" : "text-sm"}>{String(card.clubBadgeUrl || "")}</span>
              )}
            </span>
          )}
          <span>{small ? (POSITION_SHORT[card.position] ?? card.position ?? "JOG") : (POSITION_LABELS[card.position] ?? card.position ?? "JOGADOR")}</span>
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

      {/* 3. DIVISÓRIA ESTILIZADA DE ACORDO COM A MOLDURA */}
      <FrameDivider
        style={frameStyle}
        topBg={theme.topBg}
        accent={theme.accent}
        small={small}
      />

      {/* 4. RETRATO DO JOGADOR + NOME (OU NOME EM DESTAQUE) */}
      {card.imageUrl ? (
        <div className={`flex-1 flex flex-col items-center justify-center min-w-0 relative z-10 ${small ? "px-1.5 py-0.5" : "px-2 py-1"}`}>
          {/* Portrait Container */}
          <div
            className={`w-full relative overflow-hidden rounded-md border-2 border-arcade-dark/30 shadow-inner flex items-center justify-center bg-arcade-dark/10 ${
              small ? "h-[54px]" : "h-[90px]"
            }`}
          >
            <img
              src={card.imageUrl}
              alt={card.name}
              className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          </div>

          {/* Nome do Jogador */}
          <div className="w-full text-center mt-1">
            <div
              className="uppercase tracking-wider font-bold truncate text-arcade-dark drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]"
              style={{
                fontFamily: theme.nameFont,
                fontSize: small ? 11 : 14,
                lineHeight: 1.1,
              }}
              title={card.name || ""}
            >
              {(card.name || "").toUpperCase()}
            </div>
          </div>
        </div>
      ) : (
        <div className={`flex-1 flex items-center justify-center text-center min-w-0 relative z-10 ${small ? "px-1" : "px-2"}`}>
          {small ? (
            <svg
              viewBox="0 0 100 20"
              preserveAspectRatio="xMidYMid meet"
              className="w-full"
              style={{ height: 28 }}
              aria-label={card.name || ""}
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
                {(card.name || "").toUpperCase()}
              </text>
            </svg>
          ) : (
            <div
              className="uppercase tracking-wider break-words hyphens-auto w-full text-xl leading-tight"
              style={{ fontFamily: theme.nameFont }}
            >
              {(card.name || "").toUpperCase()}
            </div>
          )}
        </div>
      )}

      {/* 5. ATRIBUTOS TÁTICOS */}
      <div className="px-2 pb-2 space-y-1 relative z-10">
        {(attrsForPosition(card.position || "ATA") || []).map((k) => {
          const v = card.attrs?.[k] ?? 0;
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

      {/* 6. FRASE DA CARTA */}
      {!small && (
        <div className="px-2 pb-1 text-[9px] italic font-body text-arcade-dark/70 text-center relative z-10">
          "{card.quote}"
        </div>
      )}
    </button>
  );
}

/**
 * Renderizador de Ornamentos Visuais e Cantoneiras de cada Modelo de Moldura
 */
function FrameOrnaments({
  style,
  border,
  accent,
  small,
}: {
  style: FrameStyle;
  border: string;
  accent: string;
  small?: boolean;
}) {
  const iconSize = small ? 14 : 20;

  if (style === "waves") {
    // 🌊 MODELO 1: ONDAS RETRÔ
    // Cantos arredondados fluidos com ondas concêntricas decorativas
    return (
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* Onda ornamental canto inferior esquerdo */}
        <svg
          className="absolute bottom-0 left-0 opacity-40"
          width={iconSize * 2}
          height={iconSize * 2}
          viewBox="0 0 40 40"
          fill="none"
        >
          <path
            d="M0 40 C15 35, 20 20, 25 0"
            stroke={accent}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M0 30 C10 27, 15 15, 18 0"
            stroke={border}
            strokeWidth="1.5"
            strokeDasharray="2 2"
          />
        </svg>

        {/* Onda ornamental canto inferior direito */}
        <svg
          className="absolute bottom-0 right-0 opacity-40 scale-x-[-1]"
          width={iconSize * 2}
          height={iconSize * 2}
          viewBox="0 0 40 40"
          fill="none"
        >
          <path
            d="M0 40 C15 35, 20 20, 25 0"
            stroke={accent}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M0 30 C10 27, 15 15, 18 0"
            stroke={border}
            strokeWidth="1.5"
            strokeDasharray="2 2"
          />
        </svg>
      </div>
    );
  }

  if (style === "geometric") {
    // ⬛ MODELO 2: QUADRADA GEOMÉTRICA
    // Rebites industriais nos 4 cantos e placas angulares
    const bolt = (
      <svg width={iconSize} height={iconSize} viewBox="0 0 20 20" fill="none">
        <rect x="2" y="2" width="16" height="16" rx="2" fill={border} />
        <circle cx="10" cy="10" r="4.5" fill="#f6f2e7" stroke={accent} strokeWidth="1.5" />
        <line x1="8" y1="10" x2="12" y2="10" stroke={border} strokeWidth="1.5" />
        <line x1="10" y1="8" x2="10" y2="12" stroke={border} strokeWidth="1.5" />
      </svg>
    );

    return (
      <div className="absolute inset-0 pointer-events-none z-20">
        <div className="absolute top-1 left-1">{bolt}</div>
        <div className="absolute top-1 right-1">{bolt}</div>
        <div className="absolute bottom-1 left-1">{bolt}</div>
        <div className="absolute bottom-1 right-1">{bolt}</div>
      </div>
    );
  }

  if (style === "arcade_neon") {
    // 🕹️ MODELO 3: ARCADE NEON 90S
    // Cantos em degraus pixel 8-bit e cantoneiras pixeladas
    return (
      <div className="absolute inset-0 pointer-events-none z-10">
        {/* Cantoneira Pixel Superior Esquerda */}
        <div
          className="absolute top-0.5 left-0.5 w-3 h-3 border-t-2 border-l-2"
          style={{ borderColor: accent }}
        >
          <div className="w-1 h-1" style={{ backgroundColor: accent }} />
        </div>
        {/* Cantoneira Pixel Superior Direita */}
        <div
          className="absolute top-0.5 right-0.5 w-3 h-3 border-t-2 border-r-2"
          style={{ borderColor: accent }}
        >
          <div className="w-1 h-1 ml-auto" style={{ backgroundColor: accent }} />
        </div>
        {/* Cantoneira Pixel Inferior Esquerda */}
        <div
          className="absolute bottom-0.5 left-0.5 w-3 h-3 border-b-2 border-l-2"
          style={{ borderColor: accent }}
        >
          <div className="w-1 h-1 mt-1.5" style={{ backgroundColor: accent }} />
        </div>
        {/* Cantoneira Pixel Inferior Direita */}
        <div
          className="absolute bottom-0.5 right-0.5 w-3 h-3 border-b-2 border-r-2"
          style={{ borderColor: accent }}
        >
          <div className="w-1 h-1 mt-1.5 ml-auto" style={{ backgroundColor: accent }} />
        </div>
      </div>
    );
  }

  if (style === "shield") {
    // 🛡️ MODELO 4: BRASÃO IMPERIAL
    // Cantoneiras nobres estilo flâmula de clube lendário
    return (
      <div className="absolute inset-0 pointer-events-none z-10">
        {/* Flâmula Nobre Canto Inferior Esquerdo */}
        <svg
          className="absolute bottom-0 left-0"
          width={iconSize * 1.5}
          height={iconSize * 1.5}
          viewBox="0 0 30 30"
          fill="none"
        >
          <polygon points="0,30 0,10 10,20 20,10 30,0 30,30" fill={border} opacity="0.15" />
          <path d="M0,25 L25,0" stroke={accent} strokeWidth="2" />
          <circle cx="6" cy="24" r="2.5" fill={accent} />
        </svg>

        {/* Flâmula Nobre Canto Inferior Direito */}
        <svg
          className="absolute bottom-0 right-0 scale-x-[-1]"
          width={iconSize * 1.5}
          height={iconSize * 1.5}
          viewBox="0 0 30 30"
          fill="none"
        >
          <polygon points="0,30 0,10 10,20 20,10 30,0 30,30" fill={border} opacity="0.15" />
          <path d="M0,25 L25,0" stroke={accent} strokeWidth="2" />
          <circle cx="6" cy="24" r="2.5" fill={accent} />
        </svg>
      </div>
    );
  }

  if (style === "cyber_tech") {
    // ⚡ MODELO 5: CYBER TECH / ARMOR
    // Miras HUD nos 4 vértices e linhas cibernéticas
    return (
      <div className="absolute inset-0 pointer-events-none z-10">
        {/* Mira HUD Superior Esquerda */}
        <div className="absolute top-1 left-1 flex items-center gap-0.5">
          <div className="w-2.5 h-0.5" style={{ backgroundColor: accent }} />
          <div className="w-0.5 h-2.5" style={{ backgroundColor: accent }} />
        </div>
        {/* Mira HUD Superior Direita */}
        <div className="absolute top-1 right-1 flex items-center gap-0.5">
          <div className="w-0.5 h-2.5" style={{ backgroundColor: accent }} />
          <div className="w-2.5 h-0.5" style={{ backgroundColor: accent }} />
        </div>
        {/* Mira HUD Inferior Esquerda */}
        <div className="absolute bottom-1 left-1 flex items-end gap-0.5">
          <div className="w-2.5 h-0.5" style={{ backgroundColor: accent }} />
          <div className="w-0.5 h-2.5" style={{ backgroundColor: accent }} />
        </div>
        {/* Mira HUD Inferior Direita */}
        <div className="absolute bottom-1 right-1 flex items-end gap-0.5">
          <div className="w-0.5 h-2.5" style={{ backgroundColor: accent }} />
          <div className="w-2.5 h-0.5" style={{ backgroundColor: accent }} />
        </div>
      </div>
    );
  }

  return null;
}

/**
 * Divisória Estilizada do Cabeçalho para cada Modelo de Moldura
 */
function FrameDivider({
  style,
  topBg,
  accent,
  small,
}: {
  style: FrameStyle;
  topBg: string;
  accent: string;
  small?: boolean;
}) {
  const h = small ? 6 : 9;

  if (style === "waves") {
    // Divisória Ondulada Suave
    return (
      <div className="w-full relative z-10" style={{ height: h }}>
        <svg
          viewBox="0 0 100 12"
          preserveAspectRatio="none"
          className="w-full h-full block"
        >
          <path
            d="M 0 0 L 100 0 L 100 3 Q 75 12 50 3 Q 25 12 0 3 Z"
            fill={topBg}
          />
          <path
            d="M 0 3 Q 25 12 50 3 Q 75 12 100 3"
            fill="none"
            stroke={accent}
            strokeWidth="1.8"
          />
        </svg>
      </div>
    );
  }

  if (style === "geometric") {
    // Divisória Chanfrada Angular 45°
    return (
      <div className="w-full relative z-10" style={{ height: h }}>
        <svg
          viewBox="0 0 100 10"
          preserveAspectRatio="none"
          className="w-full h-full block"
        >
          <polygon points="0,0 100,0 95,10 5,10" fill={topBg} />
          <polyline points="0,0 5,10 95,10 100,0" fill="none" stroke={accent} strokeWidth="1.8" />
        </svg>
      </div>
    );
  }

  if (style === "arcade_neon") {
    // Divisória Denteada Pixel 8-bit
    return (
      <div className="w-full relative z-10 flex flex-col items-center">
        <div className="w-full h-0.5" style={{ backgroundColor: accent }} />
        <div
          className="w-full h-1.5 opacity-80"
          style={{
            backgroundImage: `repeating-linear-gradient(90deg, ${topBg}, ${topBg} 4px, transparent 4px, transparent 8px)`,
          }}
        />
      </div>
    );
  }

  if (style === "shield") {
    // Divisória em Ponta de Escudo / Brasão
    return (
      <div className="w-full relative z-10" style={{ height: h }}>
        <svg
          viewBox="0 0 100 12"
          preserveAspectRatio="none"
          className="w-full h-full block"
        >
          <polygon points="0,0 100,0 100,2 50,12 0,2" fill={topBg} />
          <polyline points="0,2 50,12 100,2" fill="none" stroke={accent} strokeWidth="2" />
        </svg>
      </div>
    );
  }

  if (style === "cyber_tech") {
    // Divisória com Cortes Futuristas e Linhas HUD
    return (
      <div className="w-full relative z-10" style={{ height: h }}>
        <svg
          viewBox="0 0 100 10"
          preserveAspectRatio="none"
          className="w-full h-full block"
        >
          <polygon points="0,0 100,0 88,10 65,10 60,4 40,4 35,10 12,10" fill={topBg} />
          <polyline points="12,10 35,10 40,4 60,4 65,10 88,10" fill="none" stroke={accent} strokeWidth="1.8" />
        </svg>
      </div>
    );
  }

  return <div className="w-full h-1" style={{ backgroundColor: accent }} />;
}

