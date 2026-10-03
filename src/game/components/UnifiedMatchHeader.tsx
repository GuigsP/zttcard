import { useState } from "react";
import type { Phase } from "../hooks/useGameEngine";
import { DIFFICULTY_LABELS, POSITION_LABELS, POSITIONS, type Difficulty, type Position } from "../types";
import { sound } from "../audio";

type Props = {
  pGoals: number;
  aiGoals: number;
  position: Position;
  posScore: { p: number; ai: number };
  roundIdx: number;
  phase: Phase;
  chooser: "P" | "AI";
  difficulty: Difficulty;
  onExit: () => void;
  arenaTitle?: string;
};

export function UnifiedMatchHeader({
  pGoals,
  aiGoals,
  position,
  posScore,
  roundIdx,
  phase,
  chooser,
  difficulty,
  onExit,
  arenaTitle,
}: Props) {
  const [muted, setMuted] = useState(() => sound.isMuted());

  const toggleSound = () => {
    const next = sound.toggleMute();
    setMuted(next);
    if (!next) sound.playCardFlip();
  };

  const posNumber = POSITIONS.indexOf(position) + 1;

  const phaseHint = (() => {
    if (phase === "PAR_OU_IMPAR") return "🪙 CARA OU COROA — SORTEIO DO JUIZ";
    if (phase === "SELECT_CARD") return "👇 ESCOLHA UMA CARTA DA SUA MÃO";
    if (phase === "TRAP_ANNOUNCE") return "⚡ TRAP ATIVADA!";
    if (phase === "PICK_ATTR")
      return chooser === "P" ? "🎯 SUA VEZ DE ESCOLHER O ATRIBUTO" : "🤖 IA ESCOLHENDO ATRIBUTO...";
    if (phase === "ANNOUNCE_ATTR") return "⚔️ CONFRONTO DE ATRIBUTOS!";
    if (phase === "REVEAL") return "🏆 RESULTADO DO DUELO";
    if (phase === "PENALTY") return "⚽ DISPUTA DE PÊNALTI!";
    if (phase === "PENALTY_RESULT") return "🧤 RESULTADO DO PÊNALTI";
    if (phase === "POS_END") return "🏁 FIM DA POSIÇÃO";
    return "";
  })();

  return (
    <header className="w-full bg-slate-950/95 border-b-2 sm:border-b-4 border-arcade-yellow px-2 sm:px-4 py-1.5 sm:py-2.5 flex items-center justify-between gap-1.5 sm:gap-4 shadow-2xl backdrop-blur-md relative z-20">
      {/* Esquerda: Botão Sair + Placar Geral de Gols */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        <button
          type="button"
          onClick={onExit}
          className="font-arcade text-[8px] sm:text-[9px] px-2 py-1 sm:px-2.5 sm:py-1.5 bg-arcade-red/90 hover:bg-arcade-red text-arcade-cream border border-arcade-cream/80 hover:border-arcade-yellow rounded-sm transition-colors cursor-pointer active:scale-95 shadow-sm"
          title="Sair da partida"
        >
          ← SAIR
        </button>

        <div className="flex items-center gap-1 sm:gap-2 bg-slate-900/90 px-2 sm:px-3 py-0.5 sm:py-1 border border-arcade-yellow/60 rounded-md shadow-inner">
          <span className="font-arcade text-[7.5px] sm:text-[9px] text-arcade-yellow font-bold">VOCÊ</span>
          <span className="font-display text-lg sm:text-2xl text-arcade-cream leading-none font-black">{pGoals}</span>
          <span className="font-arcade text-[9px] sm:text-xs text-arcade-yellow/80">×</span>
          <span className="font-display text-lg sm:text-2xl text-arcade-cream leading-none font-black">{aiGoals}</span>
          <span className="font-arcade text-[7.5px] sm:text-[9px] text-arcade-red font-bold">IA</span>
        </div>
      </div>

      {/* Centro: Posição Atual + Dica da Fase (Tratamento para não quebrar feio no mobile) */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-1 min-w-0">
        <div className="font-arcade text-[7.5px] sm:text-[9.5px] text-arcade-cream/90 truncate max-w-full leading-tight">
          <span className="text-arcade-cream/60">POS {posNumber}/11 · </span>
          <b className="text-arcade-yellow font-black">{POSITION_LABELS[position]}</b>
          <span className="text-arcade-cream/60 hidden xs:inline"> ({roundIdx + 1}/3)</span>
        </div>
        <div className="font-arcade text-[8px] sm:text-[10px] text-arcade-yellow mt-0.5 tracking-wider truncate max-w-full leading-tight drop-shadow-sm">
          {phaseHint}
        </div>
      </div>

      {/* Direita: Placar da Posição + Arena + Dificuldade + Som */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <div className="hidden sm:flex items-center gap-1.5 bg-black/60 px-2 sm:px-2.5 py-1 border border-arcade-yellow/40 rounded font-arcade text-[8.5px] sm:text-[9px] text-arcade-cream">
          <span className="text-arcade-yellow">POS:</span>
          <span className="font-bold">{posScore.p} × {posScore.ai}</span>
        </div>

        {arenaTitle && (
          <div className="hidden md:flex items-center gap-1 font-arcade text-[8px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 px-2 py-0.5 rounded shadow-xs shrink-0">
            <span>📍</span>
            <span className="uppercase truncate max-w-[110px]">{arenaTitle}</span>
          </div>
        )}

        <div className="hidden lg:block font-arcade text-[8.5px] bg-arcade-cream text-arcade-dark px-2 py-1 rounded border border-arcade-dark font-bold">
          {DIFFICULTY_LABELS[difficulty]}
        </div>

        <button
          type="button"
          onClick={toggleSound}
          className="w-7 h-7 sm:w-auto sm:h-auto flex items-center justify-center font-arcade text-[9px] sm:px-2 sm:py-1 bg-arcade-blue/70 hover:bg-arcade-yellow hover:text-arcade-dark text-arcade-cream border border-arcade-yellow/40 rounded transition-colors cursor-pointer active:scale-95 shadow-sm"
          title={muted ? "Ativar som" : "Desativar som"}
          aria-label={muted ? "Ativar som" : "Desativar som"}
        >
          {muted ? "🔇" : "🔊"}
        </button>
      </div>
    </header>
  );
}
