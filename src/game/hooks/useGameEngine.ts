import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import type {
  AttrKey,
  Card,
  Difficulty,
  LastResult,
  Position,
  PositionResult,
  RoundLog,
  Trap,
} from "../types";
import { ATTR_LABELS, POSITIONS, TRAP_LABELS } from "../types";
import {
  aiPenaltyChoice,
  aiReactTrap,
  canPlayTrap,
  pickAttrAI,
  pickCardAI,
  resolveDuel,
} from "../engine";
import { buildDeck } from "../data";
import { sound } from "../audio";

export type Phase =
  | "POS_INTRO"
  | "PAR_OU_IMPAR"
  | "SELECT_CARD"
  | "TRAP_ANNOUNCE"
  | "PICK_ATTR"
  | "ANNOUNCE_ATTR"
  | "REVEAL"
  | "PENALTY"
  | "PENALTY_RESULT"
  | "POS_END"
  | "GAME_END";

export type PendingResolve = { log: RoundLog; playerDir?: number | null } | null;

const TRAP_POOL: Trap[] = ["AMARELO", "IMPEDIMENTO", "PENALTI"];
const TRAP_CAP = 5;

export type Reward = { p: Trap | null; ai: Trap | null };

export type GameState = {
  pDeck: Card[];
  aiDeck: Card[];
  difficulty: Difficulty;
  posIdx: number;
  roundIdx: number;
  posScore: { p: number; ai: number };
  goals: { p: number; ai: number };
  pTraps: Trap[];
  aiTraps: Trap[];
  pTrapPlayed: Trap | null;
  aiTrapPlayed: Trap | null;
  chooser: "P" | "AI";
  phase: Phase;
  chosenAttr: AttrKey | null;
  toast: { text: string; color?: "green" | "yellow" | "red" | "blue" } | null;
  lastRoundLoser: "P" | "AI" | null;
  playerLastPenaltyDir: number | null;
  positionResults: PositionResult[];
  pSelectedCardId: string | null;
  aiSelectedCardId: string | null;
  pUsedCardIds: string[];
  aiUsedCardIds: string[];
  currentRounds: RoundLog[];
  trapAnnounceFor: "P" | "AI" | null;
  pendingResolve: PendingResolve;
  lastReward: Reward;
};

type InitArgs = { difficulty: Difficulty; decks?: { P: Card[]; AI: Card[] } | null };

function initState({ difficulty, decks }: InitArgs): GameState {
  return {
    pDeck: decks?.P ?? buildDeck("P"),
    aiDeck: decks?.AI ?? buildDeck("AI"),
    difficulty,
    posIdx: 0,
    roundIdx: 0,
    posScore: { p: 0, ai: 0 },
    goals: { p: 0, ai: 0 },
    pTraps: ["AMARELO", "IMPEDIMENTO", "PENALTI"],
    aiTraps: ["AMARELO", "IMPEDIMENTO", "PENALTI"],
    pTrapPlayed: null,
    aiTrapPlayed: null,
    chooser: "P",
    phase: "POS_INTRO",
    chosenAttr: null,
    toast: null,
    lastRoundLoser: null,
    playerLastPenaltyDir: null,
    positionResults: [],
    pSelectedCardId: null,
    aiSelectedCardId: null,
    pUsedCardIds: [],
    aiUsedCardIds: [],
    currentRounds: [],
    trapAnnounceFor: null,
    pendingResolve: null,
    lastReward: { p: null, ai: null },
  };
}

function removeOne<T>(list: T[], item: T): T[] {
  const i = list.indexOf(item);
  if (i < 0) return list;
  return [...list.slice(0, i), ...list.slice(i + 1)];
}

function randomTrap(): Trap {
  return TRAP_POOL[Math.floor(Math.random() * TRAP_POOL.length)];
}

export type Action =
  | { type: "START_POS" }
  | { type: "PAR_DONE"; winner: "P" | "AI" }
  | { type: "SELECT_CARDS"; pId: string; aiId: string }
  | { type: "PLAY_TRAP_P"; trap: Trap }
  | { type: "PLAY_TRAP_AI"; trap: Trap }
  | { type: "TRAP_ANNOUNCED" }
  | { type: "SET_PHASE"; phase: Phase }
  | { type: "PICK_ATTR"; attr: AttrKey }
  | { type: "SET_PENDING"; pending: PendingResolve; phase: Phase }
  | { type: "CONSUME_PENDING" }
  | { type: "ADVANCE_ROUND" }
  | { type: "END_POS" }
  | { type: "NEXT_POS" }
  | { type: "TOAST"; toast: GameState["toast"] };

function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "START_POS": {
      return {
        ...state,
        posScore: { p: 0, ai: 0 },
        roundIdx: 0,
        chooser: "P",
        pTrapPlayed: null,
        aiTrapPlayed: null,
        chosenAttr: null,
        lastRoundLoser: null,
        pSelectedCardId: null,
        aiSelectedCardId: null,
        pUsedCardIds: [],
        aiUsedCardIds: [],
        currentRounds: [],
        trapAnnounceFor: null,
        pendingResolve: null,
        lastReward: { p: null, ai: null },
        phase: "PAR_OU_IMPAR",
      };
    }
    case "PAR_DONE":
      return { ...state, chooser: action.winner, phase: "SELECT_CARD" };
    case "SELECT_CARDS":
      return {
        ...state,
        pSelectedCardId: action.pId,
        aiSelectedCardId: action.aiId,
        phase: "PICK_ATTR",
      };
    case "PLAY_TRAP_P":
      return {
        ...state,
        pTrapPlayed: action.trap,
        pTraps: removeOne(state.pTraps, action.trap),
        trapAnnounceFor: "P",
        phase: "TRAP_ANNOUNCE",
      };
    case "PLAY_TRAP_AI":
      return {
        ...state,
        aiTrapPlayed: action.trap,
        aiTraps: removeOne(state.aiTraps, action.trap),
        trapAnnounceFor: "AI",
        phase: "TRAP_ANNOUNCE",
      };
    case "TRAP_ANNOUNCED":
      return { ...state, trapAnnounceFor: null, phase: "ANNOUNCE_ATTR" };
    case "SET_PHASE":
      return { ...state, phase: action.phase };
    case "PICK_ATTR":
      return { ...state, chosenAttr: action.attr, phase: "ANNOUNCE_ATTR" };
    case "SET_PENDING":
      return { ...state, pendingResolve: action.pending, phase: action.phase };
    case "CONSUME_PENDING": {
      const p = state.pendingResolve;
      if (!p) return state;
      const posScore = { ...state.posScore };
      if (p.log.winner === "P") posScore.p += 1;
      else if (p.log.winner === "AI") posScore.ai += 1;
      const chooser: "P" | "AI" =
        p.log.winner === "P" ? "AI" : p.log.winner === "AI" ? "P" : state.chooser;
      const lastRoundLoser: "P" | "AI" | null =
        p.log.winner === "P"
          ? "AI"
          : p.log.winner === "AI"
            ? "P"
            : state.lastRoundLoser;
      return {
        ...state,
        posScore,
        chooser,
        lastRoundLoser,
        playerLastPenaltyDir: p.playerDir ?? state.playerLastPenaltyDir,
        currentRounds: [...state.currentRounds, p.log],
        pendingResolve: null,
      };
    }
    case "ADVANCE_ROUND": {
      const nextRound = state.roundIdx + 1;
      const pUsed = state.pSelectedCardId
        ? [...state.pUsedCardIds, state.pSelectedCardId]
        : state.pUsedCardIds;
      const aiUsed = state.aiSelectedCardId
        ? [...state.aiUsedCardIds, state.aiSelectedCardId]
        : state.aiUsedCardIds;
      if (nextRound >= 3) {
        const reward: Reward = { p: null, ai: null };
        let pTraps = state.pTraps;
        let aiTraps = state.aiTraps;
        if (state.posScore.p === 2 && state.posScore.ai === 0 && pTraps.length < TRAP_CAP) {
          reward.p = randomTrap();
          pTraps = [...pTraps, reward.p];
        }
        if (state.posScore.ai === 2 && state.posScore.p === 0 && aiTraps.length < TRAP_CAP) {
          reward.ai = randomTrap();
          aiTraps = [...aiTraps, reward.ai];
        }
        return {
          ...state,
          pUsedCardIds: pUsed,
          aiUsedCardIds: aiUsed,
          pTraps,
          aiTraps,
          lastReward: reward,
          phase: "POS_END",
        };
      }
      return {
        ...state,
        roundIdx: nextRound,
        chosenAttr: null,
        pTrapPlayed: null,
        aiTrapPlayed: null,
        pSelectedCardId: null,
        aiSelectedCardId: null,
        pUsedCardIds: pUsed,
        aiUsedCardIds: aiUsed,
        phase: "SELECT_CARD",
      };
    }
    case "END_POS": {
      const goals = { ...state.goals };
      const winner: "P" | "AI" | "DRAW" =
        state.posScore.p > state.posScore.ai
          ? "P"
          : state.posScore.ai > state.posScore.p
            ? "AI"
            : "DRAW";
      if (winner === "P") goals.p += 1;
      else if (winner === "AI") goals.ai += 1;
      const positionResults: PositionResult[] = [
        ...state.positionResults,
        {
          position: POSITIONS[state.posIdx],
          pScore: state.posScore.p,
          aiScore: state.posScore.ai,
          winner,
          rounds: state.currentRounds,
        },
      ];
      return { ...state, goals, positionResults };
    }
    case "NEXT_POS": {
      const posIdx = state.posIdx + 1;
      if (posIdx >= 11) return { ...state, phase: "GAME_END" };
      return {
        ...state,
        posIdx,
        roundIdx: 0,
        chosenAttr: null,
        posScore: { p: 0, ai: 0 },
        pTrapPlayed: null,
        aiTrapPlayed: null,
        pSelectedCardId: null,
        aiSelectedCardId: null,
        pUsedCardIds: [],
        aiUsedCardIds: [],
        currentRounds: [],
        trapAnnounceFor: null,
        pendingResolve: null,
        lastReward: { p: null, ai: null },
        phase: "POS_INTRO",
      };
    }
    case "TOAST":
      return { ...state, toast: action.toast };
    default:
      return state;
  }
}

export function handFor(deck: Card[], pos: Position): Card[] {
  return deck.filter((c) => c.position === pos);
}

export function trapGenericEffect(trap: Trap, by: "P" | "AI"): string {
  const who = by === "P" ? "VOCÊ" : "IA";
  if (trap === "AMARELO")
    return `CARTÃO AMARELO (${who}) — o adversário perde 15 pontos no atributo desta rodada.`;
  if (trap === "IMPEDIMENTO")
    return `IMPEDIMENTO (${who}) — a rodada de ataque será anulada.`;
  return `PÊNALTI (${who}) — a rodada vai para o minigame de chute vs defesa.`;
}

export function trapConcreteEffect(
  trap: Trap,
  by: "P" | "AI",
  attr: AttrKey | null,
  preP: number,
  preAI: number,
  postP: number,
  postAI: number,
  winner: "P" | "AI" | "DRAW" | "VOID",
  penalty?: { playerDir: number; aiDir: number; result: "GOL" | "DEFENDEU" },
): string {
  const who = by === "P" ? "VOCÊ" : "IA";
  const target = by === "P" ? "IA" : "VOCÊ";
  if (trap === "AMARELO" && attr) {
    const preTarget = by === "P" ? preAI : preP;
    const postTarget = by === "P" ? postAI : postP;
    return `CARTÃO AMARELO (${who}) — ${target} perdeu 15 em ${ATTR_LABELS[attr]} (${preTarget} → ${postTarget}).`;
  }
  if (trap === "IMPEDIMENTO") {
    if (winner === "VOID")
      return `IMPEDIMENTO (${who}) — rodada anulada, ninguém pontuou.`;
    return `IMPEDIMENTO (${who}) — sem efeito nesta posição.`;
  }
  if (trap === "PENALTI" && penalty) {
    return `PÊNALTI (${who}) — Você ${penalty.playerDir}, IA ${penalty.aiDir} → ${penalty.result}.`;
  }
  return `${TRAP_LABELS[trap]} (${who}).`;
}

type UseGameEngineProps = {
  difficulty: Difficulty;
  decks: { P: Card[]; AI: Card[] } | null;
  onEnd: (result: LastResult) => void;
};

export function useGameEngine({ difficulty, decks, onEnd }: UseGameEngineProps) {
  const [state, dispatch] = useReducer(gameReducer, { difficulty, decks }, initState);
  const pos = POSITIONS[state.posIdx];
  const pHand = useMemo(() => handFor(state.pDeck, pos), [state.pDeck, pos]);
  const aiHand = useMemo(() => handFor(state.aiDeck, pos), [state.aiDeck, pos]);

  const pCard = state.pSelectedCardId
    ? pHand.find((c) => c.id === state.pSelectedCardId)
    : undefined;
  const aiCard = state.aiSelectedCardId
    ? aiHand.find((c) => c.id === state.aiSelectedCardId)
    : undefined;

  const endedRef = useRef(false);
  const aiReactRef = useRef<string | null>(null);
  const revealComputedRef = useRef<string | null>(null);

  // Toast auto-clear
  useEffect(() => {
    if (!state.toast) return;
    const t = setTimeout(() => dispatch({ type: "TOAST", toast: null }), 1200);
    return () => clearTimeout(t);
  }, [state.toast]);

  // POS_INTRO -> start position immediately
  useEffect(() => {
    if (state.phase === "POS_INTRO") {
      dispatch({ type: "START_POS" });
    }
  }, [state.phase]);

  // AI auto-pick attribute
  useEffect(() => {
    if (state.phase === "PICK_ATTR" && state.chooser === "AI" && aiCard) {
      const t = setTimeout(() => {
        const remainingP = pHand.filter((c) => !state.pUsedCardIds.includes(c.id));
        const attr = pickAttrAI(aiCard, remainingP, state.difficulty);
        dispatch({ type: "PICK_ATTR", attr });
      }, 700);
      return () => clearTimeout(t);
    }
  }, [state.phase, state.chooser, aiCard, state.difficulty, pHand, state.pUsedCardIds]);

  // AI reactive trap
  useEffect(() => {
    if (state.phase !== "ANNOUNCE_ATTR") return;
    if (state.pTrapPlayed || state.aiTrapPlayed) return;
    if (!state.chosenAttr || !pCard || !aiCard) return;
    if (state.aiTraps.length === 0) return;
    const key = `${state.posIdx}-${state.roundIdx}-${state.chosenAttr}`;
    if (aiReactRef.current === key) return;
    aiReactRef.current = key;
    const decision = aiReactTrap(
      state.aiTraps,
      pos,
      state.chosenAttr,
      pCard,
      aiCard,
      state.posScore,
      state.roundIdx,
      state.difficulty,
    );
    if (decision && canPlayTrap(decision, pos)) {
      const t = setTimeout(() => {
        dispatch({
          type: "TOAST",
          toast: { text: "IA BAIXOU UMA TRAP!", color: "blue" },
        });
        dispatch({ type: "PLAY_TRAP_AI", trap: decision });
      }, 500);
      return () => clearTimeout(t);
    }
  }, [
    state.phase,
    state.chosenAttr,
    state.pTrapPlayed,
    state.aiTrapPlayed,
    state.aiTraps,
    state.posScore,
    state.roundIdx,
    state.difficulty,
    state.posIdx,
    pos,
    pCard,
    aiCard,
  ]);

  // REVEAL entry
  useEffect(() => {
    if (state.phase !== "REVEAL" || !state.chosenAttr || !pCard || !aiCard) return;
    const key = `${state.posIdx}-${state.roundIdx}-${state.chosenAttr}`;
    if (revealComputedRef.current === key) return;
    revealComputedRef.current = key;

    const activeTrap = state.pTrapPlayed
      ? { trap: state.pTrapPlayed, bySide: "P" as const }
      : state.aiTrapPlayed
        ? { trap: state.aiTrapPlayed, bySide: "AI" as const }
        : null;
    const res = resolveDuel(pCard, aiCard, state.chosenAttr, activeTrap);

    let toastText = "";
    let color: "green" | "yellow" | "red" | "blue" = "green";
    if (activeTrap?.trap === "AMARELO") {
      toastText = "CARTÃO AMARELO!";
      color = "yellow";
      sound.playYellowCard();
    } else if (res.winner === "VOID") {
      toastText = "IMPEDIMENTO!";
      color = "red";
      sound.playWhistle();
    } else if (res.winner === "P") {
      toastText = "PONTO SEU!";
      color = "green";
      sound.playPointWon();
    } else if (res.winner === "AI") {
      toastText = "PONTO DA IA!";
      color = "red";
      sound.playPointLost();
    } else {
      toastText = "EMPATE!";
      color = "blue";
    }
    dispatch({ type: "TOAST", toast: { text: toastText, color } });

    const prePVal = pCard.attrs[state.chosenAttr] ?? 0;
    const preAIVal = aiCard.attrs[state.chosenAttr] ?? 0;
    const trapEffect = activeTrap
      ? trapConcreteEffect(
          activeTrap.trap,
          activeTrap.bySide,
          res.winner === "VOID" ? null : state.chosenAttr,
          prePVal,
          preAIVal,
          res.pVal,
          res.aiVal,
          res.winner,
        )
      : undefined;

    const log: RoundLog = {
      pCardName: pCard.name,
      aiCardName: aiCard.name,
      chooser: state.chooser,
      attr: res.winner === "VOID" ? null : state.chosenAttr,
      pValue: res.pVal,
      aiValue: res.aiVal,
      trap: activeTrap ? { by: activeTrap.bySide, type: activeTrap.trap } : null,
      trapEffect,
      winner: res.winner,
    };
    dispatch({ type: "SET_PENDING", pending: { log }, phase: "REVEAL" });
  }, [
    state.phase,
    state.chosenAttr,
    state.pTrapPlayed,
    state.aiTrapPlayed,
    state.chooser,
    state.posIdx,
    state.roundIdx,
    pCard,
    aiCard,
  ]);

  // Game End callback
  useEffect(() => {
    if (state.phase === "GAME_END" && !endedRef.current) {
      endedRef.current = true;
      if (state.goals.p > state.goals.ai) {
        sound.playVictory();
      }
      onEnd({
        goals: state.goals,
        difficulty: state.difficulty,
        positions: state.positionResults,
        at: Date.now(),
      });
    }
  }, [state.phase, state.goals, state.difficulty, state.positionResults, onEnd]);

  const selectCard = useCallback(
    (c: Card) => {
      if (state.phase !== "SELECT_CARD") return;
      if (state.pUsedCardIds.includes(c.id)) return;
      sound.playCardFlip();
      const aiPick = pickCardAI(aiHand, state.aiUsedCardIds, state.difficulty);
      dispatch({ type: "SELECT_CARDS", pId: c.id, aiId: aiPick.id });
    },
    [state.phase, state.pUsedCardIds, state.aiUsedCardIds, state.difficulty, aiHand],
  );

  const handlePenalty = useCallback(
    (playerDir: number, aiDir: number, result: "GOL" | "DEFENDEU") => {
      const playerBated = !!state.pTrapPlayed;
      const winner: "P" | "AI" = playerBated
        ? result === "GOL"
          ? "P"
          : "AI"
        : result === "DEFENDEU"
          ? "P"
          : "AI";

      sound.playPenaltyKick();
      if (result === "GOL") {
        setTimeout(() => sound.playGoal(), 200);
      } else {
        setTimeout(() => sound.playPenaltySave(), 200);
      }

      dispatch({
        type: "TOAST",
        toast: {
          text: result === "GOL" ? "GOOOL!" : "DEFENDEU!",
          color: result === "GOL" ? "green" : "yellow",
        },
      });
      const trapEffect = trapConcreteEffect(
        "PENALTI",
        playerBated ? "P" : "AI",
        state.chosenAttr,
        0,
        0,
        0,
        0,
        winner,
        { playerDir, aiDir, result },
      );
      const log: RoundLog = {
        pCardName: pCard?.name ?? "",
        aiCardName: aiCard?.name ?? "",
        chooser: state.chooser,
        attr: state.chosenAttr,
        pValue: 0,
        aiValue: 0,
        trap: { by: playerBated ? "P" : "AI", type: "PENALTI" },
        trapEffect,
        winner,
        penalty: { playerDir, aiDir, result },
      };
      dispatch({
        type: "SET_PENDING",
        pending: { log, playerDir },
        phase: "PENALTY_RESULT",
      });
    },
    [state.pTrapPlayed, state.chosenAttr, state.chooser, pCard?.name, aiCard?.name],
  );

  const advancePhase = useCallback(() => {
    if (state.phase === "TRAP_ANNOUNCE") {
      dispatch({ type: "TRAP_ANNOUNCED" });
      return;
    }
    if (state.phase === "ANNOUNCE_ATTR") {
      const activeTrap = state.pTrapPlayed ?? state.aiTrapPlayed;
      if (activeTrap === "PENALTI") {
        sound.playWhistle();
        dispatch({ type: "SET_PHASE", phase: "PENALTY" });
      } else {
        dispatch({ type: "SET_PHASE", phase: "REVEAL" });
      }
      return;
    }
    if (state.phase === "REVEAL" || state.phase === "PENALTY_RESULT") {
      dispatch({ type: "CONSUME_PENDING" });
      dispatch({ type: "ADVANCE_ROUND" });
      return;
    }
    if (state.phase === "POS_END") {
      if (state.posScore.p > state.posScore.ai) {
        sound.playGoal();
      }
      dispatch({ type: "END_POS" });
      dispatch({ type: "NEXT_POS" });
      return;
    }
  }, [state.phase, state.pTrapPlayed, state.aiTrapPlayed, state.posScore]);

  return {
    state,
    dispatch,
    pos,
    pHand,
    aiHand,
    pCard,
    aiCard,
    selectCard,
    handlePenalty,
    advancePhase,
  };
}
