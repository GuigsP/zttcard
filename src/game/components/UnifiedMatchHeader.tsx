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
    <header className="w-full bg-arcade-dark border-b-4 border-arcade-yellow px-4 py-2.5 flex items-center justify-between gap-4 shadow-arcade z-20">
      {/* Esquerda: Botão Sair + Placar Geral de Gols */}
      <div className="flex items-center gap-3">
        <button
          onClick={onExit}
          className="font-arcade text-[9px] px-2.5 py-1.5 bg-arcade-red text-arcade-cream border border-arcade-cream hover:bg-arcade-yellow hover:text-arcade-dark transition-colors"
          title="Sair da partida"
        >
          ← SAIR
        </button>

        <div className="flex items-center gap-2 bg-arcade-blue/70 px-3 py-1 border border-arcade-yellow/60 rounded-sm">
          <span className="font-arcade text-[9px] text-arcade-yellow">VOCÊ</span>
          <span className="font-display text-2xl text-arcade-cream leading-none">{pGoals}</span>
          <span className="font-arcade text-xs text-arcade-yellow/80">×</span>
          <span className="font-display text-2xl text-arcade-cream leading-none">{aiGoals}</span>
          <span className="font-arcade text-[9px] text-arcade-red">IA</span>
        </div>
      </div>

      {/* Centro: Posição Atual + Dica da Fase */}
      <div className="flex flex-col items-center text-center">
        <div className="font-arcade text-[9px] text-arcade-cream/80">
          POSIÇÃO {posNumber}/11 · <b className="text-arcade-yellow">{POSITION_LABELS[position]}</b> (CARTA {roundIdx + 1}/3)
        </div>
        <div className="font-arcade text-[10px] text-arcade-yellow mt-0.5 tracking-wider">
          {phaseHint}
        </div>
      </div>

      {/* Direita: Placar da Posição + Dificuldade + Som */}
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-1.5 bg-arcade-dark/80 px-2.5 py-1 border border-arcade-yellow/40 font-arcade text-[9px] text-arcade-cream">
          <span className="text-arcade-yellow">POS:</span>
          <span>{posScore.p} × {posScore.ai}</span>
        </div>

        <div className="hidden md:block font-arcade text-[9px] bg-arcade-cream text-arcade-dark px-2 py-1 border border-arcade-dark">
          {DIFFICULTY_LABELS[difficulty]}
        </div>

        <button
          type="button"
          onClick={toggleSound}
          className="font-arcade text-[9px] px-2 py-1 bg-arcade-cream text-arcade-dark border border-arcade-dark hover:bg-arcade-yellow transition-colors"
          title={muted ? "Ativar som" : "Desativar som"}
        >
          {muted ? "🔇" : "🔊"}
        </button>
      </div>
    </header>
  );
}
