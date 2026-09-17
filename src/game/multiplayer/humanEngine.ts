import type { AttrKey, Card, Position, RoundLog, Trap } from "../types";
import { POSITIONS, attrsForPosition } from "../types";
import { canPlayTrap } from "../engine";
import { trapConcreteEffect } from "../hooks/useGameEngine";

// ============================================================================
// Human-vs-Human deterministic reducer.
//
// Both clients subscribe to match_moves and apply events in seq order to their
// own copy of this state. State is fully derived from the ordered event log,
// which makes reconnection safe (fetch all past moves and replay).
// ============================================================================

export type MPSide = "HOST" | "GUEST";
export type Parity = "PAR" | "IMPAR";

export type MPPhase =
  | "WAITING"        // waiting for guest to join
  | "POS_INTRO"      // transient — autoAdvance moves it to PARITY
  | "PARITY"         // par-ou-ímpar minigame (only round 0 of each position)
  | "PARITY_REVEAL"  // reveal who won par-ou-ímpar, both press CONTINUE
  | "SELECT_CARD"    // both pick their card
  | "PICK_ATTR"      // chooser picks attribute
  | "ANNOUNCE_ATTR"  // attribute announced, players can play/skip trap
  | "TRAP_ANNOUNCE"  // transient announce of played trap
  | "PENALTY"        // penalty shootout (kicker vs goalie)
  | "PENALTY_RESULT" // reveal penalty outcome
  | "REVEAL"         // duel resolved, both continue to advance
  | "POS_END"        // both continue to advance to next position
  | "GAME_END";

export type MPPositionResult = {
  position: Position;
  hostScore: number;
  guestScore: number;
  winner: MPSide | "DRAW";
  rounds: RoundLog[];
};

export type MPReaction = {
  id: string;
  side: MPSide;
  emoji: string;
  timestamp: number;
};

const TRAP_POOL: Trap[] = ["AMARELO", "IMPEDIMENTO", "PENALTI"];
const TRAP_CAP = 5;

function randomTrapFromSeed(seed: number, offset: number): Trap {
  const pseudo = ((seed + offset) * 9301 + 49297) % 233280;
  const idx = Math.floor((pseudo / 233280) * TRAP_POOL.length);
  return TRAP_POOL[idx % TRAP_POOL.length];
}

function removeOne<T>(list: T[], item: T): T[] {
  const i = list.indexOf(item);
  if (i < 0) return list;
  return [...list.slice(0, i), ...list.slice(i + 1)];
}

export type MPState = {
  seed: number;
  posIdx: number;
  roundIdx: number;
  phase: MPPhase;
  hostGoals: number;
  guestGoals: number;
  hostPosScore: number;
  guestPosScore: number;
  chooser: MPSide;
  // Traps hand
  hostTraps: Trap[];
  guestTraps: Trap[];
  hostTrapPlayed: Trap | null;
  guestTrapPlayed: Trap | null;
  hostTrapSkipped: boolean;
  guestTrapSkipped: boolean;
  trapAnnounceFor: MPSide | null;
  // Penalty minigame
  hostPenaltyDir: number | null;
  guestPenaltyDir: number | null;
  penaltyResult: { kickerDir: number; goalieDir: number; result: "GOL" | "DEFENDEU" } | null;
  // Parity minigame (round 0 of each position)
  hostParityChoice: Parity | null;
  hostParityNumber: number | null;
  guestParityNumber: number | null;
  parityWinner: MPSide | null;
  paritySum: number | null;
  // Per-round transient
  hostSelectedCard: Card | null;
  guestSelectedCard: Card | null;
  hostUsedCardIds: string[];
  guestUsedCardIds: string[];
  chosenAttr: AttrKey | null;
  // Continue readiness
  hostReady: boolean;
  guestReady: boolean;
  // History & Rewards
  currentRounds: RoundLog[];
  positionResults: MPPositionResult[];
  lastLog: RoundLog | null;
  lastReward: { host: Trap | null; guest: Trap | null };
  reactions: MPReaction[];
};

export function initialMPState(seed: number): MPState {
  return {
    seed,
    posIdx: 0,
    roundIdx: 0,
    phase: "WAITING",
    hostGoals: 0,
    guestGoals: 0,
    hostPosScore: 0,
    guestPosScore: 0,
    chooser: "HOST",
    hostTraps: ["AMARELO", "IMPEDIMENTO", "PENALTI"],
    guestTraps: ["AMARELO", "IMPEDIMENTO", "PENALTI"],
    hostTrapPlayed: null,
    guestTrapPlayed: null,
    hostTrapSkipped: false,
    guestTrapSkipped: false,
    trapAnnounceFor: null,
    hostPenaltyDir: null,
    guestPenaltyDir: null,
    penaltyResult: null,
    hostParityChoice: null,
    hostParityNumber: null,
    guestParityNumber: null,
    parityWinner: null,
    paritySum: null,
    hostSelectedCard: null,
    guestSelectedCard: null,
    hostUsedCardIds: [],
    guestUsedCardIds: [],
    chosenAttr: null,
    hostReady: false,
    guestReady: false,
    currentRounds: [],
    positionResults: [],
    lastLog: null,
    lastReward: { host: null, guest: null },
    reactions: [],
  };
}

function resetPositionTransients(): Partial<MPState> {
  return {
    hostParityChoice: null,
    hostParityNumber: null,
    guestParityNumber: null,
    parityWinner: null,
    paritySum: null,
    hostSelectedCard: null,
    guestSelectedCard: null,
    hostUsedCardIds: [],
    guestUsedCardIds: [],
    chosenAttr: null,
    hostTrapPlayed: null,
    guestTrapPlayed: null,
    hostTrapSkipped: false,
    guestTrapSkipped: false,
    trapAnnounceFor: null,
    hostPenaltyDir: null,
    guestPenaltyDir: null,
    penaltyResult: null,
    hostReady: false,
    guestReady: false,
    currentRounds: [],
    hostPosScore: 0,
    guestPosScore: 0,
    chooser: "HOST",
    roundIdx: 0,
    lastReward: { host: null, guest: null },
  };
}

// ============================================================================
// Events (payloads persisted in match_moves.payload as JSONB)
// ============================================================================

export type MPEvent =
  | { kind: "MATCH_START" }
  | { kind: "PICK_PARITY_CHOICE"; side: MPSide; parity: Parity }
  | { kind: "PICK_PARITY_NUMBER"; side: MPSide; number: number }
  | { kind: "SELECT_CARD"; side: MPSide; card: Card }
  | { kind: "PICK_ATTR"; side: MPSide; attr: AttrKey }
  | { kind: "PLAY_TRAP"; side: MPSide; trap: Trap }
  | { kind: "SKIP_TRAP"; side: MPSide }
  | { kind: "PICK_PENALTY_DIR"; side: MPSide; dir: number }
  | { kind: "SEND_REACTION"; side: MPSide; emoji: string }
  | { kind: "READY_CONTINUE"; side: MPSide };

// ============================================================================
// Reducer
// ============================================================================

export function applyEvent(state: MPState, event: MPEvent): MPState {
  switch (event.kind) {
    case "MATCH_START":
      return { ...state, phase: "POS_INTRO" };

    case "SEND_REACTION": {
      const nextReaction: MPReaction = {
        id: `${event.side}-${Date.now()}-${Math.random()}`,
        side: event.side,
        emoji: event.emoji,
        timestamp: Date.now(),
      };
      return {
        ...state,
        reactions: [...state.reactions.slice(-15), nextReaction],
      };
    }

    case "PICK_PARITY_CHOICE": {
      if (state.phase !== "PARITY") return state;
      if (event.side !== "HOST") return state;
      if (state.hostParityChoice) return state;
      return { ...state, hostParityChoice: event.parity };
    }

    case "PICK_PARITY_NUMBER": {
      if (state.phase !== "PARITY") return state;
      if (!state.hostParityChoice) return state;
      const hostNum = event.side === "HOST" ? event.number : state.hostParityNumber;
      const guestNum = event.side === "GUEST" ? event.number : state.guestParityNumber;
      if (hostNum != null && event.side === "HOST" && state.hostParityNumber != null) return state;
      if (guestNum != null && event.side === "GUEST" && state.guestParityNumber != null) return state;
      const nextHost = event.side === "HOST" ? event.number : state.hostParityNumber;
      const nextGuest = event.side === "GUEST" ? event.number : state.guestParityNumber;
      if (nextHost != null && nextGuest != null) {
        const sum = nextHost + nextGuest;
        const isEven = sum % 2 === 0;
        const actual: Parity = isEven ? "PAR" : "IMPAR";
        const hostWon = state.hostParityChoice === actual;
        const winner: MPSide = hostWon ? "HOST" : "GUEST";
        return {
          ...state,
          hostParityNumber: nextHost,
          guestParityNumber: nextGuest,
          parityWinner: winner,
          paritySum: sum,
          chooser: winner,
          phase: "PARITY_REVEAL",
        };
      }
      return {
        ...state,
        hostParityNumber: nextHost,
        guestParityNumber: nextGuest,
      };
    }

    case "SELECT_CARD": {
      if (state.phase !== "SELECT_CARD") return state;
      let hostSel = state.hostSelectedCard;
      let guestSel = state.guestSelectedCard;
      if (event.side === "HOST") hostSel = event.card;
      else guestSel = event.card;
      if (hostSel && guestSel) {
        return {
          ...state,
          hostSelectedCard: hostSel,
          guestSelectedCard: guestSel,
          phase: "PICK_ATTR",
        };
      }
      return { ...state, hostSelectedCard: hostSel, guestSelectedCard: guestSel };
    }

    case "PICK_ATTR": {
      if (state.phase !== "PICK_ATTR") return state;
      if (event.side !== state.chooser) return state;
      return {
        ...state,
        chosenAttr: event.attr,
        phase: "ANNOUNCE_ATTR",
        hostTrapPlayed: null,
        guestTrapPlayed: null,
        hostTrapSkipped: false,
        guestTrapSkipped: false,
      };
    }

    case "PLAY_TRAP": {
      if (state.phase !== "ANNOUNCE_ATTR") return state;
      const isHost = event.side === "HOST";
      const hand = isHost ? state.hostTraps : state.guestTraps;
      if (!hand.includes(event.trap)) return state;

      const pos = POSITIONS[state.posIdx];
      if (!canPlayTrap(event.trap, pos)) return state;

      const nextHostTraps = isHost ? removeOne(state.hostTraps, event.trap) : state.hostTraps;
      const nextGuestTraps = !isHost ? removeOne(state.guestTraps, event.trap) : state.guestTraps;
      const hostTrapPlayed = isHost ? event.trap : state.hostTrapPlayed;
      const guestTrapPlayed = !isHost ? event.trap : state.guestTrapPlayed;

      return {
        ...state,
        hostTraps: nextHostTraps,
        guestTraps: nextGuestTraps,
        hostTrapPlayed,
        guestTrapPlayed,
        trapAnnounceFor: event.side,
        phase: "TRAP_ANNOUNCE",
      };
    }

    case "SKIP_TRAP": {
      if (state.phase !== "ANNOUNCE_ATTR") return state;
      const hostSkipped = event.side === "HOST" ? true : state.hostTrapSkipped;
      const guestSkipped = event.side === "GUEST" ? true : state.guestTrapSkipped;

      // When both ready/skipped or continue is pressed
      if (hostSkipped && guestSkipped) {
        return resolveDuelState({
          ...state,
          hostTrapSkipped: hostSkipped,
          guestTrapSkipped: guestSkipped,
        });
      }
      return {
        ...state,
        hostTrapSkipped: hostSkipped,
        guestTrapSkipped: guestSkipped,
      };
    }

    case "PICK_PENALTY_DIR": {
      if (state.phase !== "PENALTY") return state;
      const nextHostDir = event.side === "HOST" ? event.dir : state.hostPenaltyDir;
      const nextGuestDir = event.side === "GUEST" ? event.dir : state.guestPenaltyDir;

      if (nextHostDir != null && nextGuestDir != null) {
        const kickerIsHost = state.hostTrapPlayed === "PENALTI";
        const kickerDir = kickerIsHost ? nextHostDir : nextGuestDir;
        const goalieDir = kickerIsHost ? nextGuestDir : nextHostDir;
        const defended = kickerDir === goalieDir;
        const result: "GOL" | "DEFENDEU" = defended ? "DEFENDEU" : "GOL";

        const winnerSide: MPSide = kickerIsHost
          ? result === "GOL" ? "HOST" : "GUEST"
          : result === "GOL" ? "GUEST" : "HOST";

        const hostCard = state.hostSelectedCard;
        const guestCard = state.guestSelectedCard;

        const log: RoundLog = {
          pCardName: hostCard?.name ?? "",
          aiCardName: guestCard?.name ?? "",
          chooser: state.chooser === "HOST" ? "P" : "AI",
          attr: state.chosenAttr,
          pValue: 0,
          aiValue: 0,
          trap: { by: kickerIsHost ? "P" : "AI", type: "PENALTI" },
          trapEffect: `PÊNALTI (${kickerIsHost ? "HOST" : "GUEST"}) — Chute ${kickerDir} × Defesa ${goalieDir} → ${result}!`,
          winner: winnerSide === "HOST" ? "P" : "AI",
          penalty: { playerDir: nextHostDir, aiDir: nextGuestDir, result },
        };

        const hostPosScore = state.hostPosScore + (winnerSide === "HOST" ? 1 : 0);
        const guestPosScore = state.guestPosScore + (winnerSide === "GUEST" ? 1 : 0);
        const nextChooser: MPSide = winnerSide === "HOST" ? "GUEST" : "HOST";

        return {
          ...state,
          hostPenaltyDir: nextHostDir,
          guestPenaltyDir: nextGuestDir,
          penaltyResult: { kickerDir, goalieDir, result },
          hostPosScore,
          guestPosScore,
          chooser: nextChooser,
          currentRounds: [...state.currentRounds, log],
          lastLog: log,
          phase: "PENALTY_RESULT",
        };
      }
      return {
        ...state,
        hostPenaltyDir: nextHostDir,
        guestPenaltyDir: nextGuestDir,
      };
    }

    case "READY_CONTINUE": {
      const hostReady = event.side === "HOST" ? true : state.hostReady;
      const guestReady = event.side === "GUEST" ? true : state.guestReady;
      if (!hostReady || !guestReady) {
        return { ...state, hostReady, guestReady };
      }
      const cleared: Partial<MPState> = {
        hostReady: false,
        guestReady: false,
      };

      if (state.phase === "PARITY_REVEAL") {
        return { ...state, ...cleared, phase: "SELECT_CARD" };
      }

      if (state.phase === "TRAP_ANNOUNCE") {
        const penaltyActive = state.hostTrapPlayed === "PENALTI" || state.guestTrapPlayed === "PENALTI";
        if (penaltyActive) {
          return { ...state, ...cleared, phase: "PENALTY", hostPenaltyDir: null, guestPenaltyDir: null };
        }
        return resolveDuelState({ ...state, ...cleared });
      }

      if (state.phase === "REVEAL" || state.phase === "PENALTY_RESULT") {
        const nextRound = state.roundIdx + 1;
        const hostUsed = state.hostSelectedCard
          ? [...state.hostUsedCardIds, state.hostSelectedCard.id]
          : state.hostUsedCardIds;
        const guestUsed = state.guestSelectedCard
          ? [...state.guestUsedCardIds, state.guestSelectedCard.id]
          : state.guestUsedCardIds;

        if (nextRound >= 3) {
          // Calculate trap rewards on sweep (2x0)
          const reward: { host: Trap | null; guest: Trap | null } = { host: null, guest: null };
          let hostTraps = state.hostTraps;
          let guestTraps = state.guestTraps;

          if (state.hostPosScore === 2 && state.guestPosScore === 0 && hostTraps.length < TRAP_CAP) {
            reward.host = randomTrapFromSeed(state.seed, state.posIdx * 7 + 1);
            hostTraps = [...hostTraps, reward.host];
          }
          if (state.guestPosScore === 2 && state.hostPosScore === 0 && guestTraps.length < TRAP_CAP) {
            reward.guest = randomTrapFromSeed(state.seed, state.posIdx * 7 + 2);
            guestTraps = [...guestTraps, reward.guest];
          }

          return {
            ...state,
            ...cleared,
            hostUsedCardIds: hostUsed,
            guestUsedCardIds: guestUsed,
            hostSelectedCard: null,
            guestSelectedCard: null,
            chosenAttr: null,
            hostTrapPlayed: null,
            guestTrapPlayed: null,
            hostTraps,
            guestTraps,
            lastReward: reward,
            phase: "POS_END",
          };
        }

        return {
          ...state,
          ...cleared,
          roundIdx: nextRound,
          hostUsedCardIds: hostUsed,
          guestUsedCardIds: guestUsed,
          hostSelectedCard: null,
          guestSelectedCard: null,
          chosenAttr: null,
          hostTrapPlayed: null,
          guestTrapPlayed: null,
          hostTrapSkipped: false,
          guestTrapSkipped: false,
          phase: "SELECT_CARD",
        };
      }

      if (state.phase === "POS_END") {
        const posWinner: MPSide | "DRAW" =
          state.hostPosScore > state.guestPosScore
            ? "HOST"
            : state.guestPosScore > state.hostPosScore
              ? "GUEST"
              : "DRAW";
        const hostGoals = state.hostGoals + (posWinner === "HOST" ? 1 : 0);
        const guestGoals = state.guestGoals + (posWinner === "GUEST" ? 1 : 0);
        const positionResults: MPPositionResult[] = [
          ...state.positionResults,
          {
            position: POSITIONS[state.posIdx],
            hostScore: state.hostPosScore,
            guestScore: state.guestPosScore,
            winner: posWinner,
            rounds: state.currentRounds,
          },
        ];
        const nextPos = state.posIdx + 1;
        if (nextPos >= POSITIONS.length) {
          return {
            ...state,
            ...cleared,
            hostGoals,
            guestGoals,
            positionResults,
            phase: "GAME_END",
          };
        }
        return {
          ...state,
          ...resetPositionTransients(),
          hostGoals,
          guestGoals,
          positionResults,
          posIdx: nextPos,
          phase: "POS_INTRO",
        };
      }
      return { ...state, hostReady, guestReady };
    }

    default:
      return state;
  }
}

// Helper to resolve card clash with traps
function resolveDuelState(state: MPState): MPState {
  const hostCard = state.hostSelectedCard;
  const guestCard = state.guestSelectedCard;
  const attr = state.chosenAttr;
  if (!hostCard || !guestCard || !attr) return state;

  const activeTrap = state.hostTrapPlayed
    ? { trap: state.hostTrapPlayed, bySide: "HOST" as const }
    : state.guestTrapPlayed
      ? { trap: state.guestTrapPlayed, bySide: "GUEST" as const }
      : null;

  let hostVal = hostCard.attrs[attr] ?? 0;
  let guestVal = guestCard.attrs[attr] ?? 0;

  let winner: "P" | "AI" | "DRAW" | "VOID" = "DRAW";

  if (activeTrap?.trap === "IMPEDIMENTO") {
    winner = "VOID";
  } else {
    if (activeTrap?.trap === "AMARELO") {
      if (activeTrap.bySide === "HOST") guestVal -= 15;
      else hostVal -= 15;
    }
    winner = hostVal > guestVal ? "P" : guestVal > hostVal ? "AI" : "DRAW";
  }

  const hostPosScore = state.hostPosScore + (winner === "P" ? 1 : 0);
  const guestPosScore = state.guestPosScore + (winner === "AI" ? 1 : 0);
  const nextChooser: MPSide =
    winner === "P" ? "GUEST" : winner === "AI" ? "HOST" : state.chooser;

  const preHost = hostCard.attrs[attr] ?? 0;
  const preGuest = guestCard.attrs[attr] ?? 0;

  const trapEffect = activeTrap
    ? trapConcreteEffect(
        activeTrap.trap,
        activeTrap.bySide === "HOST" ? "P" : "AI",
        winner === "VOID" ? null : attr,
        preHost,
        preGuest,
        hostVal,
        guestVal,
        winner,
      )
    : undefined;

  const log: RoundLog = {
    pCardName: hostCard.name,
    aiCardName: guestCard.name,
    chooser: state.chooser === "HOST" ? "P" : "AI",
    attr: winner === "VOID" ? null : attr,
    pValue: hostVal,
    aiValue: guestVal,
    trap: activeTrap ? { by: activeTrap.bySide === "HOST" ? "P" : "AI", type: activeTrap.trap } : null,
    trapEffect,
    winner,
  };

  return {
    ...state,
    hostPosScore,
    guestPosScore,
    chooser: nextChooser,
    currentRounds: [...state.currentRounds, log],
    lastLog: log,
    phase: "REVEAL",
  };
}

// Auto-advance from POS_INTRO to PARITY (both sides derive locally)
export function autoAdvance(state: MPState): MPState {
  if (state.phase === "POS_INTRO") return { ...state, phase: "PARITY" };
  return state;
}

// Perspective helpers
export function selfSide(myRole: MPSide): MPSide {
  return myRole;
}
export function oppSide(myRole: MPSide): MPSide {
  return myRole === "HOST" ? "GUEST" : "HOST";
}

export function selfCard(state: MPState, myRole: MPSide): Card | null {
  return myRole === "HOST" ? state.hostSelectedCard : state.guestSelectedCard;
}
export function oppCard(state: MPState, myRole: MPSide): Card | null {
  return myRole === "HOST" ? state.guestSelectedCard : state.hostSelectedCard;
}
export function selfUsedIds(state: MPState, myRole: MPSide): string[] {
  return myRole === "HOST" ? state.hostUsedCardIds : state.guestUsedCardIds;
}
export function selfPosScore(state: MPState, myRole: MPSide): number {
  return myRole === "HOST" ? state.hostPosScore : state.guestPosScore;
}
export function oppPosScore(state: MPState, myRole: MPSide): number {
  return myRole === "HOST" ? state.guestPosScore : state.hostPosScore;
}
export function selfGoals(state: MPState, myRole: MPSide): number {
  return myRole === "HOST" ? state.hostGoals : state.guestGoals;
}
export function oppGoals(state: MPState, myRole: MPSide): number {
  return myRole === "HOST" ? state.guestGoals : state.hostGoals;
}
export function selfReady(state: MPState, myRole: MPSide): boolean {
  return myRole === "HOST" ? state.hostReady : state.guestReady;
}
export function oppReady(state: MPState, myRole: MPSide): boolean {
  return myRole === "HOST" ? state.guestReady : state.hostReady;
}
export function selfTraps(state: MPState, myRole: MPSide): Trap[] {
  return myRole === "HOST" ? state.hostTraps : state.guestTraps;
}
export function oppTraps(state: MPState, myRole: MPSide): Trap[] {
  return myRole === "HOST" ? state.guestTraps : state.hostTraps;
}
export function selfTrapPlayed(state: MPState, myRole: MPSide): Trap | null {
  return myRole === "HOST" ? state.hostTrapPlayed : state.guestTrapPlayed;
}
export function oppTrapPlayed(state: MPState, myRole: MPSide): Trap | null {
  return myRole === "HOST" ? state.guestTrapPlayed : state.hostTrapPlayed;
}
export function selfParityNumber(state: MPState, myRole: MPSide): number | null {
  return myRole === "HOST" ? state.hostParityNumber : state.guestParityNumber;
}
export function oppParityNumber(state: MPState, myRole: MPSide): number | null {
  return myRole === "HOST" ? state.guestParityNumber : state.hostParityNumber;
}

export function attrsForCurrentPos(state: MPState): AttrKey[] {
  return attrsForPosition(POSITIONS[state.posIdx]);
}
