import { useEffect, useState } from "react";
import type { LastResult, PositionResult, RoundLog } from "../types";
import { ATTR_LABELS, DIFFICULTY_LABELS, POSITION_LABELS, TRAP_LABELS } from "../types";
import { getPackTheme } from "../packThemes";
import { sound } from "../audio";
import { toast } from "sonner";

type Props = {
  result: LastResult;
  cupPackSlug?: string;
  onReplay: () => void;
  onChangeDifficulty: () => void;
};

export function EndScreen({ result, cupPackSlug, onReplay, onChangeDifficulty }: Props) {
  const { goals, difficulty, positions } = result;
  const win = goals.p > goals.ai;
  const draw = goals.p === goals.ai;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (win) {
      sound.playVictory();
    }
  }, [win]);

  const gameUrl = typeof window !== "undefined" ? window.location.origin : "https://zttcard.pages.dev";
  const shareText = win
    ? `🏆 Meti ${goals.p} x ${goals.ai} na IA no Zero To Top Card! Consegue bater meu placar? Joga aí: ${gameUrl}`
    : draw
      ? `⚔️ Empatei em ${goals.p} x ${goals.ai} contra a IA no Zero To Top Card! Consegue vencer? Joga aí: ${gameUrl}`
      : `⚽ Joguei contra a IA no Zero To Top Card e o placar foi ${goals.p} x ${goals.ai}! Consegue vencer a máquina? Joga aí: ${gameUrl}`;

  const handleShareWhatsApp = () => {
    sound.playCardFlip();
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  const handleCopyLink = () => {
    sound.playCardFlip();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(shareText).then(() => {
        setCopied(true);
        toast.success("Placar e link copiados! Cole no WhatsApp ou redes sociais.");
        setTimeout(() => setCopied(false), 2500);
      }).catch(() => {});
    }
  };

  const theme = getPackTheme(cupPackSlug);
  const cupLine = draw
    ? `${theme.label} — EMPATE`
    : win
      ? `${theme.label} — CAMPEÃO`
      : `${theme.label} — DERROTA`;
  const title = draw ? "EMPATE!" : win ? "VOCÊ VENCEU!" : "A IA VENCEU!";
  const color = draw ? "text-arcade-yellow" : win ? "text-arcade-green" : "text-arcade-red";
  return (
    <div className="min-h-screen bg-arcade-blue flex items-center justify-center px-4 py-8">
      <div
        className="bg-arcade-cream text-arcade-dark border-4 shadow-arcade w-full max-w-3xl p-6 rounded-md"
        style={{ borderColor: theme.border }}
      >
        <div className="text-center">
          <div
            className="font-arcade text-[10px] px-2 py-1 inline-block mb-2"
            style={{ backgroundColor: theme.topBg, color: theme.topFg }}
          >
            {cupLine}
          </div>
          <div className="font-arcade text-xs text-arcade-red mb-2">
            FIM DE JOGO · {DIFFICULTY_LABELS[difficulty]}
          </div>
          <div className="font-arcade text-5xl md:text-6xl text-arcade-dark mb-2">
            {goals.p} × {goals.ai}
          </div>
          <div className={`font-display text-3xl ${color}`}>{title}</div>
        </div>

        {/* 🚀 BANNER DE COMPARTILHAMENTO VIRAL (WHATSAPP + LINK) */}
        <div className="mt-5 bg-gradient-to-r from-emerald-950/15 via-emerald-800/10 to-emerald-950/15 border-2 border-emerald-600/50 rounded-xl p-3.5 text-center">
          <div className="font-arcade text-[9px] sm:text-[10px] text-emerald-900 font-bold mb-1 uppercase tracking-wider flex items-center justify-center gap-1.5">
            <span>🔥</span>
            <span>DESAFIE SEUS AMIGOS</span>
          </div>
          <div className="font-body text-xs sm:text-sm text-slate-800 font-semibold mb-3">
            {win
              ? `Você meteu ${goals.p} × ${goals.ai} na IA! Mande para a galera tentar bater o seu placar.`
              : `Compartilhe o resultado e veja se seus amigos conseguem vencer a máquina!`}
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="w-full sm:w-auto font-arcade text-xs px-4 py-2.5 bg-[#25D366] hover:bg-[#1ebd59] text-white border-2 border-slate-900 rounded-lg shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
            >
              <span>📲</span>
              <span>DESAFIAR NO WHATSAPP</span>
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="w-full sm:w-auto font-arcade text-xs px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-arcade-yellow border-2 border-slate-900 rounded-lg shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
            >
              <span>{copied ? "✓" : "📋"}</span>
              <span>{copied ? "COPIADO!" : "COPIAR LINK & PLACAR"}</span>
            </button>
          </div>
        </div>

        <div className="mt-6 border-2 border-arcade-dark bg-arcade-blue/5 p-3 max-h-[420px] overflow-auto">
          <div className="font-arcade text-[10px] text-arcade-dark mb-3">
            RESUMO DETALHADO POR POSIÇÃO
          </div>
          <ul className="space-y-2">
            {positions.map((p) => (
              <PositionCard key={p.position} p={p} />
            ))}
          </ul>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={onReplay}
            className="font-arcade text-xs py-4 bg-arcade-green text-arcade-cream border-4 border-arcade-dark hover:bg-arcade-red shadow-arcade"
          >
            JOGAR NOVAMENTE
          </button>
          <button
            onClick={onChangeDifficulty}
            className="font-arcade text-xs py-4 bg-arcade-yellow text-arcade-dark border-4 border-arcade-dark hover:bg-arcade-cream shadow-arcade"
          >
            TROCAR DIFICULDADE
          </button>
        </div>
      </div>
    </div>
  );
}

function PositionCard({ p }: { p: PositionResult }) {
  const [open, setOpen] = useState(false);
  const badgeClass =
    p.winner === "P"
      ? "bg-arcade-green text-arcade-cream border-arcade-dark"
      : p.winner === "AI"
        ? "bg-arcade-red text-arcade-cream border-arcade-dark"
        : "bg-arcade-yellow text-arcade-dark border-arcade-dark";
  const badgeText = p.winner === "P" ? "VOCÊ" : p.winner === "AI" ? "IA" : "—";
  return (
    <li className="bg-arcade-cream border border-arcade-dark/30">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center px-3 py-2 hover:bg-arcade-yellow/20"
      >
        <span className="font-arcade text-[10px] flex items-center gap-2">
          <span className="text-arcade-dark/60">{open ? "▼" : "▶"}</span>
          {POSITION_LABELS[p.position]}
        </span>
        <span className="flex items-center gap-2">
          <span className="font-display text-lg">
            {p.pScore} × {p.aiScore}
          </span>
          <span className={`font-arcade text-[9px] px-1 py-0.5 border ${badgeClass}`}>
            {badgeText}
          </span>
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 space-y-1 border-t border-arcade-dark/20 bg-arcade-blue/5">
          {p.rounds.length === 0 && (
            <div className="font-body text-xs text-arcade-dark/60">
              Sem detalhes registrados.
            </div>
          )}
          {p.rounds.map((r, i) => (
            <RoundLine key={i} idx={i + 1} r={r} />
          ))}
        </div>
      )}
    </li>
  );
}

function RoundLine({ idx, r }: { idx: number; r: RoundLog }) {
  const chooserLabel = r.chooser === "P" ? "VOCÊ ESCOLHEU" : "IA ESCOLHEU";
  const winnerLabel =
    r.winner === "P"
      ? "→ PONTO SEU"
      : r.winner === "AI"
        ? "→ PONTO IA"
        : r.winner === "VOID"
          ? "→ ANULADA"
          : "→ EMPATE";
  const winnerClass =
    r.winner === "P"
      ? "text-arcade-green"
      : r.winner === "AI"
        ? "text-arcade-red"
        : "text-arcade-dark/60";

  const main = r.penalty ? (
    <div className="font-body text-[11px] leading-snug py-1">
      <span className="font-arcade text-[9px] text-arcade-dark/70">R{idx}</span>{" "}
      <span className="font-arcade text-[9px] text-arcade-red">PÊNALTI</span> · Você direção{" "}
      <b>{r.penalty.playerDir}</b>, IA <b>{r.penalty.aiDir}</b> ·{" "}
      <b>{r.penalty.result}</b>{" "}
      <span className={`font-arcade text-[9px] ${winnerClass}`}>{winnerLabel}</span>
    </div>
  ) : (
    <div className="font-body text-[11px] leading-snug py-1">
      <span className="font-arcade text-[9px] text-arcade-dark/70">R{idx}</span>{" "}
      <span className="font-arcade text-[9px] text-arcade-yellow bg-arcade-dark/80 px-1">
        {chooserLabel}
      </span>{" "}
      {r.attr && (
        <span className="font-arcade text-[9px] text-arcade-dark">
          {ATTR_LABELS[r.attr]}
        </span>
      )}{" "}
      · <b>{r.pCardName}</b> {r.pValue} × {r.aiValue} <b>{r.aiCardName}</b>{" "}
      <span className={`font-arcade text-[9px] ${winnerClass}`}>{winnerLabel}</span>
    </div>
  );

  return (
    <div>
      {main}
      {r.trapEffect && (
        <div className="font-body text-[10px] leading-snug bg-arcade-yellow/40 border-l-2 border-arcade-dark px-2 py-1 mb-1 text-arcade-dark">
          {r.trapEffect}
        </div>
      )}
    </div>
  );
}

