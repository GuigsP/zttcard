import { useState, useEffect } from "react";
import type { AttrKey, Card, Position, Trap } from "../../types";
import { ATTR_LABELS, TRAP_LABELS } from "../../types";
import type { Action, GameState, Phase, Reward } from "../../hooks/useGameEngine";
import { trapGenericEffect } from "../../hooks/useGameEngine";
import { CaraOuCoroa } from "../CaraOuCoroa";
import { AttributeChoice } from "../AttributeChoice";
import { PenaltyMinigame } from "../PenaltyMinigame";
import { aiPenaltyChoice } from "../../engine";

export type DuelArenaProps = {
  state: GameState;
  pos: Position;
  pCard?: Card;
  aiCard?: Card;
  dispatch: React.Dispatch<Action>;
  onContinue: () => void;
  onPenaltyDone: (playerDir: number, aiDir: number, result: "GOL" | "DEFENDEU") => void;
  onOpenTrapsTutorial: () => void;
};

export function TrapSlot({
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
              className="w-4 h-4 flex items-center justify-center rounded-full bg-arcade-yellow text-arcade-dark font-arcade text-[8px] border border-arcade-dark hover:bg-arcade-cream cursor-pointer"
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

export function AnnounceAttrPanel({
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
                className="font-arcade text-[10px] px-3 py-2 bg-arcade-yellow text-arcade-dark border-2 border-arcade-dark hover:bg-arcade-red hover:text-arcade-cream disabled:opacity-40 cursor-pointer"
              >
                {TRAP_LABELS[t]}
              </button>
            ))}
            <button
              onClick={() => setPicking(false)}
              disabled={locked}
              className="font-arcade text-[10px] px-3 py-2 bg-arcade-cream text-arcade-dark border-2 border-arcade-dark hover:bg-arcade-yellow disabled:opacity-40 cursor-pointer"
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

export function ResultLabel({ winner }: { winner: "P" | "AI" | "DRAW" | "VOID" }) {
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

export function ContinueButton({
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

export function TrapAnnouncePanel({
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

export function PosEndPanel({
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

export function DuelActionArea({
  state,
  pos,
  pCard,
  aiCard,
  dispatch,
  onContinue,
  onPenaltyDone,
  activeTrap,
  playablePlayerTraps,
  canPlayerReactTrap,
  playerRoleInPenalty,
  aiRoleInPenalty,
}: {
  state: GameState;
  pos: Position;
  pCard?: Card;
  aiCard?: Card;
  dispatch: React.Dispatch<Action>;
  onContinue: () => void;
  onPenaltyDone: (playerDir: number, aiDir: number, result: "GOL" | "DEFENDEU") => void;
  activeTrap: Trap | null;
  playablePlayerTraps: Trap[];
  canPlayerReactTrap: boolean;
  playerRoleInPenalty: "BATEDOR" | "GOLEIRO";
  aiRoleInPenalty: "BATEDOR" | "GOLEIRO";
}) {
  return (
    <div className="w-full max-w-md flex flex-col items-center justify-center gap-2 sm:gap-3">
      {state.phase === "PAR_OU_IMPAR" && (
        <CaraOuCoroa onDone={(winner) => dispatch({ type: "PAR_DONE", winner })} />
      )}

      {state.phase === "SELECT_CARD" && (
        <div className="bg-slate-900/90 text-arcade-cream border border-arcade-yellow/50 rounded-lg px-3 py-1.5 shadow-lg backdrop-blur-md text-center animate-in fade-in flex items-center justify-center gap-2">
          <span className="text-xs animate-bounce">⚽</span>
          <span className="font-arcade text-[9px] sm:text-[10px] text-arcade-yellow font-bold uppercase tracking-wider">
            Sua vez: Selecione a carta
          </span>
          <span className="font-arcade text-[7.5px] sm:text-[8px] text-arcade-cream/70 bg-black/40 px-1.5 py-0.5 rounded border border-arcade-yellow/20">
            {state.chooser === "P" ? "Você escolhe lance" : "IA escolhe lance"}
          </span>
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
        <div className="text-center bg-arcade-dark/90 border-2 border-arcade-yellow rounded-xl px-3 py-2 sm:px-4 sm:py-3 w-full shadow-2xl backdrop-blur-md">
          <div className="font-arcade text-[9px] sm:text-[10px] text-arcade-yellow mb-0.5">
            {state.chooser === "P" ? "VOCÊ ESCOLHEU" : "IA ESCOLHEU"}{" "}
            {ATTR_LABELS[state.chosenAttr]}
          </div>
          {activeTrap && (
            <div className="font-arcade text-[8px] sm:text-[9px] text-arcade-yellow bg-arcade-red/60 border border-arcade-yellow px-1.5 py-0.5 mb-1.5 rounded">
              TRAP ATIVA: {TRAP_LABELS[activeTrap]}
            </div>
          )}
          <div className="font-display text-3xl sm:text-4xl text-arcade-cream leading-tight">
            {state.pendingResolve.log.pValue} × {state.pendingResolve.log.aiValue}
          </div>
          <div className="font-arcade text-[9px] sm:text-[10px] text-arcade-yellow mt-0.5">VOCÊ × IA</div>
          <ResultLabel winner={state.pendingResolve.log.winner} />
          {state.pendingResolve.log.trapEffect && (
            <div className="mt-1.5 font-body text-[10px] sm:text-[11px] text-arcade-cream bg-arcade-dark/70 border border-arcade-yellow/60 px-2 py-0.5 rounded">
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
        <div className="text-center bg-arcade-dark/90 border-2 border-arcade-yellow rounded-xl px-3 py-2 sm:px-4 sm:py-3 w-full shadow-2xl backdrop-blur-md">
          <div className="font-arcade text-[9px] sm:text-[10px] text-arcade-yellow mb-0.5">
            RESULTADO DO PÊNALTI
          </div>
          <div className="font-display text-2xl sm:text-3xl text-arcade-cream">
            {state.pendingResolve.log.penalty?.result}
          </div>
          <div className="font-body text-[10px] sm:text-[11px] text-arcade-cream mt-1.5 bg-arcade-dark/70 border border-arcade-yellow/60 px-2 py-0.5 rounded">
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
  );
}
