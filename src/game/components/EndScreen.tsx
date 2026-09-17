import { useEffect, useState } from "react";
import type { LastResult, PositionResult, RoundLog } from "../types";
import { ATTR_LABELS, DIFFICULTY_LABELS, POSITION_LABELS, TRAP_LABELS } from "../types";
import { getPackTheme } from "../packThemes";
import { sound } from "../audio";

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

  useEffect(() => {
    if (win) {
      sound.playVictory();
    }
  }, [win]);

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

