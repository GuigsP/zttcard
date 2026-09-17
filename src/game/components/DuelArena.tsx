import { useState, useEffect } from "react";
import type { AttrKey, Card, Position, Trap } from "../types";
import { ATTR_LABELS, TRAP_LABELS } from "../types";
import type { Action, GameState, Phase, Reward } from "../hooks/useGameEngine";
import { trapGenericEffect } from "../hooks/useGameEngine";
import { CardView } from "./CardView";
import { CaraOuCoroa } from "./CaraOuCoroa";
import { AttributeChoice } from "./AttributeChoice";
import { PenaltyMinigame } from "./PenaltyMinigame";
import { aiPenaltyChoice, canPlayTrap } from "../engine";

type Props = {
  state: GameState;
  pos: Position;
  pCard?: Card;
  aiCard?: Card;
  dispatch: React.Dispatch<Action>;
  onContinue: () => void;
  onPenaltyDone: (playerDir: number, aiDir: number, result: "GOL" | "DEFENDEU") => void;
  onOpenTrapsTutorial: () => void;
};

export function DuelArena({
  state,
  pos,
  pCard,
  aiCard,
  dispatch,
  onContinue,
  onPenaltyDone,
  onOpenTrapsTutorial,
}: Props) {
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
    <div className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-[220px_1fr_220px] items-start justify-items-center gap-4 md:gap-6 px-4 py-2">
      {/* AI side (Left) */}
      <div className="flex flex-col items-center gap-2 w-full">
        <div className="font-arcade text-[10px] text-arcade-red flex items-center gap-1">
          <span>🤖</span>
          <span>ADVERSÁRIO (IA)</span>
        </div>
        <CardView
          card={aiCard}
          faceDown={aiFaceDown || !aiCard}
          highlightAttr={state.chosenAttr}
          dim={state.phase === "PENALTY"}
        />
        <TrapSlot side="AI" hand={state.aiTraps} played={state.aiTrapPlayed} />
      </div>

      {/* Center action area */}
      <div className="min-w-[260px] max-w-md flex flex-col items-center justify-center gap-3">
        {state.phase === "PAR_OU_IMPAR" && (
          <CaraOuCoroa onDone={(winner) => dispatch({ type: "PAR_DONE", winner })} />
        )}

        {state.phase === "SELECT_CARD" && (
          <div className="bg-arcade-cream text-arcade-dark border-4 border-arcade-dark rounded-md p-3 shadow-arcade text-center">
            <div className="font-arcade text-[10px] text-arcade-red mb-2">
              ESCOLHA UMA CARTA DA MÃO
            </div>
            <div className="font-body text-xs">
              Toque em uma das suas cartas abaixo para colocar em campo.
            </div>
            <div className="font-arcade text-[9px] text-arcade-dark/70 mt-2">
              {state.chooser === "P"
                ? "Você vai escolher o atributo"
                : "A IA vai escolher o atributo"}
            </div>
          </div>
        )}

        {state.phase === "TRAP_ANNOUNCE" && state.trapAnnounceFor && (
          <TrapAnnouncePanel
            by={state.trapAnnounceFor}
            trap={state.trapAnnounceFor === "P" ? state.pTrapPlayed! : state.aiTrapPlayed!}
            onContinue={onContinue}
          />
        )}

        {state.phase === "PICK_ATTR" && (
          <AttributeChoice
            position={pos}
            chooser={state.chooser}
            onPick={(a) => dispatch({ type: "PICK_ATTR", attr: a })}
          />
        )}

        {state.phase === "ANNOUNCE_ATTR" && state.chosenAttr && pCard && aiCard && (
          <AnnounceAttrPanel
            attr={state.chosenAttr}
            chooser={state.chooser}
            activeTrap={activeTrap}
            activeTrapBy={state.pTrapPlayed ? "P" : state.aiTrapPlayed ? "AI" : null}
            canReact={canPlayerReactTrap}
            playerTraps={playablePlayerTraps}
            onPlayTrap={(t) => dispatch({ type: "PLAY_TRAP_P", trap: t })}
            onContinue={onContinue}
          />
        )}

        {state.phase === "REVEAL" && state.chosenAttr && state.pendingResolve && (
          <div className="text-center bg-arcade-dark/80 border-2 border-arcade-yellow rounded-md px-4 py-3 w-full">
            <div className="font-arcade text-[10px] text-arcade-yellow mb-1">
              {state.chooser === "P" ? "VOCÊ ESCOLHEU" : "IA ESCOLHEU"}{" "}
              {ATTR_LABELS[state.chosenAttr]}
            </div>
            {activeTrap && (
              <div className="font-arcade text-[9px] text-arcade-yellow bg-arcade-red/60 border border-arcade-yellow px-2 py-1 mb-2">
                TRAP ATIVA: {TRAP_LABELS[activeTrap]}
              </div>
            )}
            <div className="font-display text-4xl text-arcade-cream">
              {state.pendingResolve.log.pValue} × {state.pendingResolve.log.aiValue}
            </div>
            <div className="font-arcade text-[10px] text-arcade-yellow mt-1">VOCÊ × IA</div>
            <ResultLabel winner={state.pendingResolve.log.winner} />
            {state.pendingResolve.log.trapEffect && (
              <div className="mt-2 font-body text-[11px] text-arcade-cream bg-arcade-dark/60 border border-arcade-yellow px-2 py-1">
                {state.pendingResolve.log.trapEffect}
              </div>
            )}
            <ContinueButton phase={state.phase} onClick={onContinue} />
          </div>
        )}

        {state.phase === "PENALTY" && (
          <PenaltyMinigame
            role={playerRoleInPenalty}
            aiChoice={() =>
              aiPenaltyChoice(
                state.difficulty,
                state.playerLastPenaltyDir,
                aiRoleInPenalty,
              )
            }
            onDone={onPenaltyDone}
          />
        )}

        {state.phase === "PENALTY_RESULT" && state.pendingResolve && (
          <div className="text-center bg-arcade-dark/80 border-2 border-arcade-yellow rounded-md px-4 py-3 w-full">
            <div className="font-arcade text-[10px] text-arcade-yellow mb-1">
              RESULTADO DO PÊNALTI
            </div>
            <div className="font-display text-3xl text-arcade-cream">
              {state.pendingResolve.log.penalty?.result}
            </div>
            <div className="font-body text-[11px] text-arcade-cream mt-2 bg-arcade-dark/60 border border-arcade-yellow px-2 py-1">
              {state.pendingResolve.log.trapEffect}
            </div>
            <ResultLabel winner={state.pendingResolve.log.winner} />
            <ContinueButton phase={state.phase} onClick={onContinue} />
          </div>
        )}

        {state.phase === "POS_END" && (
          <PosEndPanel
            pScore={state.posScore.p}
            aiScore={state.posScore.ai}
            reward={state.lastReward}
            onContinue={onContinue}
            isLast={state.posIdx >= 10}
          />
        )}
      </div>

      {/* Player side (Right) */}
      <div className="flex flex-col items-center gap-2 w-full">
        <div className="font-arcade text-[10px] text-arcade-yellow flex items-center gap-1">
          <span>⭐</span>
          <span>SUA CARTA (VOCÊ)</span>
        </div>
        <CardView
          card={pCard}
          faceDown={!pCard}
          highlightAttr={state.chosenAttr}
          dim={state.phase === "PENALTY"}
        />
        <TrapSlot
          side="P"
          hand={state.pTraps}
          played={state.pTrapPlayed}
          onOpenTutorial={onOpenTrapsTutorial}
        />
      </div>
    </div>
  );
}

function TrapSlot({
  side,
  hand,
  played,
  onOpenTutorial,
}: {
  side: "P" | "AI";
  hand: Trap[];
  played: Trap | null;
  onOpenTutorial?: () => void;
}) {
  const TRAP_ICON: Record<Trap, string> = {
    AMARELO: "🟨",
    IMPEDIMENTO: "🚩",
    PENALTI: "⚽",
  };
  return (
    <div className="min-h-[40px] flex flex-col items-center gap-1">
      {played ? (
        <div
          className={`font-arcade text-[9px] px-2 py-1 border-2 border-arcade-dark ${
            side === "P"
              ? "bg-arcade-yellow text-arcade-dark"
              : "bg-arcade-red text-arcade-cream"
          }`}
        >
          TRAP: {TRAP_LABELS[played]}
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <div className="font-arcade text-[9px] text-arcade-cream">
            {side === "P" ? "SUAS TRAPS" : "TRAPS IA"}
          </div>
          <div className="flex gap-1">
            {hand.length === 0 ? (
              <span className="font-arcade text-[9px] text-arcade-cream/50">—</span>
            ) : (
              hand.map((t, i) => (
                <span
                  key={i}
                  title={TRAP_LABELS[t]}
                  className="text-sm leading-none"
                  aria-label={TRAP_LABELS[t]}
                >
                  {TRAP_ICON[t]}
                </span>
              ))
            )}
          </div>
          {side === "P" && onOpenTutorial && (
            <button
              type="button"
              onClick={onOpenTutorial}
              className="w-4 h-4 flex items-center justify-center rounded-full bg-arcade-yellow text-arcade-dark font-arcade text-[8px] border border-arcade-dark hover:bg-arcade-cream"
              aria-label="Ver tutorial de traps"
              title="Ver tutorial de traps"
            >
              ?
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AnnounceAttrPanel({
  attr,
  chooser,
  activeTrap,
  activeTrapBy,
  canReact,
  playerTraps,
  onPlayTrap,
  onContinue,
}: {
  attr: AttrKey;
  chooser: "P" | "AI";
  activeTrap: Trap | null;
  activeTrapBy: "P" | "AI" | null;
  canReact: boolean;
  playerTraps: Trap[];
  onPlayTrap: (t: Trap) => void;
  onContinue: () => void;
}) {
  const [picking, setPicking] = useState(false);
  const [locked, setLocked] = useState(false);
  const play = (t: Trap) => {
    if (locked) return;
    setLocked(true);
    onPlayTrap(t);
  };
  return (
    <div className="text-center bg-arcade-dark/80 border-2 border-arcade-yellow rounded-md px-4 py-3 w-full">
      <div className="font-arcade text-[10px] text-arcade-yellow mb-1">
        {chooser === "P" ? "VOCÊ ESCOLHEU" : "IA ESCOLHEU"}
      </div>
      <div className="font-arcade text-lg text-arcade-cream mb-2">{ATTR_LABELS[attr]}</div>
      {activeTrap && (
        <div className="font-arcade text-[9px] text-arcade-yellow bg-arcade-red/60 border border-arcade-yellow px-2 py-1 mb-2">
          TRAP ATIVA ({activeTrapBy === "P" ? "SUA" : "DA IA"}): {TRAP_LABELS[activeTrap]}
        </div>
      )}
      {picking ? (
        <div className="mt-2">
          <div className="font-arcade text-[9px] text-arcade-cream mb-2">ESCOLHA UMA TRAP</div>
          <div className="flex gap-2 justify-center flex-wrap">
            {playerTraps.map((t, i) => (
              <button
                key={`${t}-${i}`}
                disabled={locked}
                onClick={() => play(t)}
                className="font-arcade text-[10px] px-3 py-2 bg-arcade-yellow text-arcade-dark border-2 border-arcade-dark hover:bg-arcade-red hover:text-arcade-cream disabled:opacity-40"
              >
                {TRAP_LABELS[t]}
              </button>
            ))}
            <button
              onClick={() => setPicking(false)}
              disabled={locked}
              className="font-arcade text-[10px] px-3 py-2 bg-arcade-cream text-arcade-dark border-2 border-arcade-dark hover:bg-arcade-yellow disabled:opacity-40"
            >
              CANCELAR
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 mt-2">
          <div className="font-body text-[11px] text-arcade-cream/80 italic">
            Carta da IA oculta! Jogue uma trap no escuro se desejar.
          </div>
          <div className="flex gap-2 justify-center flex-wrap">
            {canReact && (
              <button
                onClick={() => setPicking(true)}
                className="font-arcade text-[10px] px-3 py-2 bg-arcade-red text-arcade-cream border-2 border-arcade-dark hover:bg-arcade-yellow hover:text-arcade-dark shadow-arcade cursor-pointer"
              >
                USAR TRAP ({playerTraps.length}) ⚡
              </button>
            )}
            <ContinueButton
              phase={"ANNOUNCE_ATTR"}
              onClick={onContinue}
              label="REVELAR CARTAS ▶"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ResultLabel({ winner }: { winner: "P" | "AI" | "DRAW" | "VOID" }) {
  if (winner === "VOID")
    return <div className="font-arcade text-sm text-arcade-yellow mt-2">RODADA ANULADA</div>;
  if (winner === "DRAW")
    return <div className="font-arcade text-sm text-arcade-yellow mt-2">EMPATE</div>;
  return (
    <div
      className={`font-arcade text-sm mt-2 ${
        winner === "P" ? "text-arcade-green" : "text-arcade-red"
      }`}
    >
      {winner === "P" ? "PONTO SEU!" : "PONTO DA IA!"}
    </div>
  );
}

function ContinueButton({
  onClick,
  phase,
  label = "CONTINUAR ▶",
}: {
  onClick: () => void;
  phase: Phase;
  label?: string;
}) {
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    setLocked(false);
  }, [phase]);
  const handle = () => {
    if (locked) return;
    setLocked(true);
    onClick();
  };
  return (
    <button
      onClick={handle}
      disabled={locked}
      className="mt-1 font-arcade text-xs px-6 py-3 bg-arcade-yellow text-arcade-dark border-2 border-arcade-dark hover:bg-arcade-cream disabled:opacity-40 disabled:cursor-not-allowed shadow-arcade cursor-pointer"
    >
      {label}
    </button>
  );
}

function TrapAnnouncePanel({
  by,
  trap,
  onContinue,
}: {
  by: "P" | "AI";
  trap: Trap;
  onContinue: () => void;
}) {
  const title = by === "P" ? "VOCÊ BAIXOU UMA TRAP" : "IA BAIXOU UMA TRAP";
  const desc = trapGenericEffect(trap, by);
  return (
    <div className="text-center bg-arcade-dark/80 border-2 border-arcade-yellow rounded-md px-4 py-3 w-full">
      <div className="font-arcade text-[10px] text-arcade-yellow mb-1">{title}</div>
      <div className="font-arcade text-lg text-arcade-cream mb-2">{TRAP_LABELS[trap]}</div>
      <div className="font-body text-[11px] text-arcade-cream bg-arcade-dark/60 border border-arcade-yellow px-2 py-1">
        {desc}
      </div>
      <ContinueButton phase={"TRAP_ANNOUNCE"} onClick={onContinue} />
    </div>
  );
}

function PosEndPanel({
  pScore,
  aiScore,
  reward,
  onContinue,
  isLast,
}: {
  pScore: number;
  aiScore: number;
  reward: Reward;
  onContinue: () => void;
  isLast: boolean;
}) {
  const winner: "P" | "AI" | "DRAW" =
    pScore > aiScore ? "P" : aiScore > pScore ? "AI" : "DRAW";
  const text =
    winner === "P"
      ? "GOL SEU!"
      : winner === "AI"
        ? "GOL DA IA!"
        : "POSIÇÃO EMPATADA!";
  const color =
    winner === "P"
      ? "text-arcade-green"
      : winner === "AI"
        ? "text-arcade-red"
        : "text-arcade-yellow";
  return (
    <div className="text-center bg-arcade-dark/80 border-2 border-arcade-yellow rounded-md px-4 py-3 w-full">
      <div className="font-arcade text-[10px] text-arcade-yellow mb-1">FIM DA POSIÇÃO</div>
      <div className="font-display text-3xl text-arcade-cream">
        {pScore} × {aiScore}
      </div>
      <div className={`font-arcade text-lg mt-2 ${color}`}>{text}</div>
      {(reward.p || reward.ai) && (
        <div className="mt-3 space-y-1">
          {reward.p && (
            <div className="font-arcade text-[10px] text-arcade-dark bg-arcade-yellow border-2 border-arcade-dark px-2 py-1">
              TRAP RECEBIDA (VOCÊ): {TRAP_LABELS[reward.p]}
            </div>
          )}
          {reward.ai && (
            <div className="font-arcade text-[10px] text-arcade-cream bg-arcade-red border-2 border-arcade-dark px-2 py-1">
              TRAP RECEBIDA (IA): {TRAP_LABELS[reward.ai]}
            </div>
          )}
        </div>
      )}
      <ContinueButton phase={"POS_END"} onClick={onContinue} />
      <div className="font-arcade text-[9px] text-arcade-cream/60 mt-2">
        {isLast ? "VER RESULTADO FINAL" : "IR PARA A PRÓXIMA POSIÇÃO"}
      </div>
    </div>
  );
}
