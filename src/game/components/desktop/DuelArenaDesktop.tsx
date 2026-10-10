import type { Trap } from "../../types";
import { canPlayTrap } from "../../engine";
import { CardView } from "../CardView";
import {
  type DuelArenaProps,
  TrapSlot,
  DuelActionArea,
} from "../duel/DuelArenaShared";

/**
 * 💻 DUEL ARENA DESKTOP (Exclusivo para PC / Monitores Widescreen >= 768px)
 * Blindado contra qualquer alteração feita no layout Mobile.
 */
export function DuelArenaDesktop({
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
    <div className="w-full max-w-5xl mx-auto px-4 py-2">
      <div className="grid grid-cols-[220px_1fr_220px] items-start justify-items-center gap-6">
        {/* IA lado esquerdo */}
        <div className="flex flex-col items-center gap-2 w-full">
          <div className="flex flex-col items-center gap-0.5">
            <div className="font-arcade text-[10px] text-arcade-red flex items-center gap-1">
              <span>🤖</span>
              <span>ADVERSÁRIO (IA)</span>
            </div>
            <span className="font-arcade text-[8px] px-1.5 py-0.5 bg-red-950/80 text-red-300 border border-red-700/60 rounded">
              {state.playerLevel <= 5
                ? "MODO TREINO (LV. 1-5)"
                : state.playerLevel <= 15
                  ? `TÁTICA ADAPTATIVA (LV. ${state.playerLevel})`
                  : state.playerLevel <= 25
                    ? `PREDIÇÃO AVANÇADA (LV. ${state.playerLevel})`
                    : `🔥 MODO MESTRE (LV. ${state.playerLevel})`}
            </span>
          </div>

          {state.aiSpeech && (
            <div className="w-full max-w-[220px] bg-arcade-dark/95 border-2 border-arcade-red text-arcade-cream rounded px-2.5 py-1.5 shadow-arcade text-center relative animate-fade-in">
              <div className="font-arcade text-[8px] text-arcade-red/90 uppercase tracking-wider mb-0.5 flex items-center justify-center gap-1">
                <span>💬</span>
                <span>IA PROVOCADORA</span>
              </div>
              <div className="font-body text-[11px] leading-tight text-arcade-cream font-medium">
                "{state.aiSpeech}"
              </div>
            </div>
          )}

          <div className="relative group p-2 rounded-2xl bg-black/50 border-2 border-red-500/40 shadow-2xl backdrop-blur-xs flex flex-col items-center">
            <div className="absolute -inset-1 bg-red-600/10 rounded-2xl blur-lg pointer-events-none" />
            <CardView
              card={aiCard}
              faceDown={aiFaceDown || !aiCard}
              highlightAttr={state.chosenAttr}
              dim={state.phase === "PENALTY"}
            />
          </div>
          <TrapSlot side="AI" hand={state.aiTraps} played={state.aiTrapPlayed} />
        </div>

        {/* Centro de Ação Desktop */}
        <div className="min-w-[260px] max-w-md flex flex-col items-center justify-center gap-3">
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

        {/* Jogador lado direito */}
        <div className="flex flex-col items-center gap-2 w-full">
          <div className="flex flex-col items-center gap-0.5">
            <div className="font-arcade text-[10px] text-arcade-yellow flex items-center gap-1">
              <span>⭐</span>
              <span>SUA CARTA (VOCÊ)</span>
            </div>
            <span className="font-arcade text-[8px] px-1.5 py-0.5 bg-yellow-950/80 text-arcade-yellow border border-yellow-700/60 rounded">
              SEU NÍVEL: {state.playerLevel}
            </span>
          </div>
          <div className="relative group p-2 rounded-2xl bg-black/50 border-2 border-arcade-yellow/40 shadow-2xl backdrop-blur-xs flex flex-col items-center">
            <div className="absolute -inset-1 bg-arcade-yellow/15 rounded-2xl blur-lg pointer-events-none" />
            <CardView
              card={pCard}
              faceDown={!pCard}
              highlightAttr={state.chosenAttr}
              dim={state.phase === "PENALTY"}
            />
          </div>
          <TrapSlot
            side="P"
            hand={state.pTraps}
            played={state.pTrapPlayed}
            onOpenTutorial={onOpenTrapsTutorial}
          />
        </div>
      </div>
    </div>
  );
}
