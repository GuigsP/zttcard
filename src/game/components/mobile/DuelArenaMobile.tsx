import type { Trap } from "../../types";
import { canPlayTrap } from "../../engine";
import { CardView } from "../CardView";
import {
  type DuelArenaProps,
  TrapSlot,
  DuelActionArea,
} from "../duel/DuelArenaShared";

/**
 * 📱 DUEL ARENA MOBILE (Exclusivo para Smartphone / Telas Verticais < 768px)
 * Blindado contra qualquer alteração feita no layout Desktop / PC.
 */
export function DuelArenaMobile({
  state,
  pos,
  pCard,
  aiCard,
  dispatch,
  onContinue,
  onPenaltyDone,
  onOpenTrapsTutorial,
}: DuelArenaProps) {
  const activeTrap: Trap | null = state.pTrapPlayed ?? state.aiTrapPlayed ?? null;
  const playablePlayerTraps = state.pTraps.filter((t) => canPlayTrap(t, pos));
  const canPlayerReactTrap =
    state.phase === "ANNOUNCE_ATTR" &&
    !state.pTrapPlayed &&
    !state.aiTrapPlayed &&
    playablePlayerTraps.length > 0;

  const aiFaceDown = !(
    state.phase === "REVEAL" ||
    state.phase === "PENALTY" ||
    state.phase === "PENALTY_RESULT" ||
    state.phase === "POS_END"
  );

  const aiRoleInPenalty: "BATEDOR" | "GOLEIRO" = state.pTrapPlayed ? "GOLEIRO" : "BATEDOR";
  const playerRoleInPenalty: "BATEDOR" | "GOLEIRO" =
    aiRoleInPenalty === "GOLEIRO" ? "BATEDOR" : "GOLEIRO";

  return (
    <div className="w-full max-w-sm mx-auto px-1 py-1 flex flex-col items-center gap-2">
      {/* Provocação da IA se houver */}
      {state.aiSpeech && (
        <div className="w-full max-w-[320px] bg-arcade-dark/95 border border-arcade-red text-arcade-cream rounded-lg px-2 py-1 shadow-md text-center animate-fade-in">
          <span className="font-body text-[10px] leading-tight text-arcade-cream font-medium">
            🤖 "{state.aiSpeech}"
          </span>
        </div>
      )}

      {/* Linha de Duelo: IA (Esquerda) vs VOCÊ (Direita) */}
      <div className="w-full flex items-center justify-between gap-2 max-w-[370px]">
        {/* Card IA */}
        <div className="flex flex-col items-center flex-1 min-w-0">
          <div className="font-arcade text-[8px] text-arcade-red flex items-center gap-0.5 mb-1 truncate">
            <span>🤖</span>
            <span>IA</span>
          </div>
          <div className="p-1 rounded-xl bg-black/60 border border-red-500/50 shadow-lg">
            <CardView
              card={aiCard}
              faceDown={aiFaceDown || !aiCard}
              highlightAttr={state.chosenAttr}
              dim={state.phase === "PENALTY"}
              compact
            />
          </div>
          <div className="mt-1">
            <TrapSlot side="AI" hand={state.aiTraps} played={state.aiTrapPlayed} />
          </div>
        </div>

        {/* Divisor VS */}
        <div className="flex flex-col items-center justify-center shrink-0 px-0.5">
          <span className="font-arcade text-[11px] text-arcade-yellow font-black animate-pulse drop-shadow">
            VS
          </span>
        </div>

        {/* Card Jogador */}
        <div className="flex flex-col items-center flex-1 min-w-0">
          <div className="font-arcade text-[8px] text-arcade-yellow flex items-center gap-0.5 mb-1 truncate">
            <span>⭐</span>
            <span>VOCÊ</span>
          </div>
          <div className="p-1 rounded-xl bg-black/60 border border-arcade-yellow/50 shadow-lg">
            <CardView
              card={pCard}
              faceDown={!pCard}
              highlightAttr={state.chosenAttr}
              dim={state.phase === "PENALTY"}
              compact
            />
          </div>
          <div className="mt-1">
            <TrapSlot
              side="P"
              hand={state.pTraps}
              played={state.pTrapPlayed}
              onOpenTutorial={onOpenTrapsTutorial}
            />
          </div>
        </div>
      </div>

      {/* Área de Ação e Interação Mobile */}
      <div className="w-full flex justify-center mt-1">
        <DuelActionArea
          state={state}
          pos={pos}
          pCard={pCard}
          aiCard={aiCard}
          dispatch={dispatch}
          onContinue={onContinue}
          onPenaltyDone={onPenaltyDone}
          activeTrap={activeTrap}
          playablePlayerTraps={playablePlayerTraps}
          canPlayerReactTrap={canPlayerReactTrap}
          playerRoleInPenalty={playerRoleInPenalty}
          aiRoleInPenalty={aiRoleInPenalty}
        />
      </div>
    </div>
  );
}
