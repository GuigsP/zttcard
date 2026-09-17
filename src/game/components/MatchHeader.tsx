import { useState } from "react";
import type { Phase } from "../hooks/useGameEngine";
import { DIFFICULTY_LABELS, type Difficulty } from "../types";
import { sound } from "../audio";

type Props = {
  posScore: { p: number; ai: number };
  roundIdx: number;
  phase: Phase;
  chooser: "P" | "AI";
  difficulty: Difficulty;
  onExit: () => void;
};

export function MatchHeader({
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

  const phaseHint = (() => {
    if (phase === "PAR_OU_IMPAR") return "PAR OU ÍMPAR — DEFINA QUEM COMEÇA";
    if (phase === "SELECT_CARD") return "ESCOLHA A CARTA DESTA RODADA";
    if (phase === "TRAP_ANNOUNCE") return "TRAP ATIVADA";
    if (phase === "PICK_ATTR")
      return chooser === "P" ? "SUA VEZ DE ESCOLHER" : "IA PENSANDO...";
    if (phase === "ANNOUNCE_ATTR") return "ATRIBUTO ESCOLHIDO";
    if (phase === "REVEAL") return "RESULTADO DO DUELO";
    if (phase === "PENALTY") return "MINIGAME DE PÊNALTI";
    if (phase === "PENALTY_RESULT") return "RESULTADO DO PÊNALTI";
    if (phase === "POS_END") return "FIM DA POSIÇÃO";
    return "";
  })();

  return (
    <div className="bg-arcade-green py-2 border-b-4 border-arcade-dark flex items-center justify-between px-4 gap-3 flex-wrap">
      <div className="font-arcade text-arcade-cream text-[10px]">
        POSIÇÃO {posScore.p} × {posScore.ai} · CARTA {roundIdx + 1}/3
      </div>
      <div className="font-arcade text-arcade-yellow text-[10px]">{phaseHint}</div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleSound}
          className="font-arcade text-[9px] px-2 py-1 bg-arcade-cream text-arcade-dark border border-arcade-dark hover:bg-arcade-yellow"
          title={muted ? "Ativar som" : "Desativar som"}
        >
          {muted ? "🔇 SOM: OFF" : "🔊 SOM: ON"}
        </button>
        <button
          onClick={onExit}
          className="font-arcade text-[9px] px-2 py-1 bg-arcade-dark text-arcade-cream border border-arcade-yellow hover:bg-arcade-red"
        >
          MUDAR DIFICULDADE · {DIFFICULTY_LABELS[difficulty]}
        </button>
      </div>
    </div>
  );
}
