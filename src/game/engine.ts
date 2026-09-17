import type { AttrKey, Card, Difficulty, Position, Trap } from "./types";
import { attrsForPosition } from "./types";

export function pickCardAI(
  hand: Card[],
  usedIds: string[],
  difficulty: Difficulty,
): Card {
  const remaining = hand.filter((c) => !usedIds.includes(c.id));
  if (remaining.length === 0) return hand[0];
  if (difficulty === "HARD") {
    // Play strongest card first (highest single attribute)
    return [...remaining].sort((a, b) => {
      const maxA = Math.max(...Object.values(a.attrs).map((v) => v ?? 0));
      const maxB = Math.max(...Object.values(b.attrs).map((v) => v ?? 0));
      return maxB - maxA;
    })[0];
  }
  return remaining[0];
}

export type TrapEffect = { trap: Trap; bySide: "P" | "AI" };

export function pickAttrAI(
  card: Card,
  opponentHand: Card[] | null,
  difficulty: Difficulty,
): AttrKey {
  const entries = Object.entries(card.attrs) as [AttrKey, number][];
  if (difficulty === "EASY") {
    return entries[Math.floor(Math.random() * entries.length)][0];
  }
  if (difficulty === "NORMAL" || !opponentHand || !opponentHand.length) {
    return entries.sort((a, b) => b[1] - a[1])[0][0];
  }
  // HARD — pick attribute where AI value beats opponent's average by the most
  let best: [AttrKey, number] = [entries[0][0], -Infinity];
  for (const [k, v] of entries) {
    const oppAvg =
      opponentHand.reduce((sum, c) => sum + (c.attrs[k] ?? 0), 0) /
      opponentHand.length;
    const diff = v - oppAvg;
    if (diff > best[1]) best = [k, diff];
  }
  return best[0];
}

export function resolveDuel(
  playerCard: Card,
  aiCard: Card,
  attr: AttrKey,
  trap: TrapEffect | null,
): {
  winner: "P" | "AI" | "DRAW" | "VOID";
  pVal: number;
  aiVal: number;
} {
  if (trap?.trap === "IMPEDIMENTO") {
    return { winner: "VOID", pVal: 0, aiVal: 0 };
  }
  let pVal = playerCard.attrs[attr] ?? 0;
  let aiVal = aiCard.attrs[attr] ?? 0;
  if (trap?.trap === "AMARELO") {
    if (trap.bySide === "P") aiVal -= 15;
    else pVal -= 15;
  }
  if (pVal > aiVal) return { winner: "P", pVal, aiVal };
  if (aiVal > pVal) return { winner: "AI", pVal, aiVal };
  return { winner: "DRAW", pVal, aiVal };
}

export function canPlayTrap(trap: Trap, pos: Position): boolean {
  if (trap === "IMPEDIMENTO") return ["PD", "PE", "ATA"].includes(pos);
  return true;
}

// Reactive trap decision: called AFTER the attribute is announced,
// with both cards visible. AI now sees the actual matchup before playing.
export function aiReactTrap(
  hand: Trap[],
  pos: Position,
  chosenAttr: AttrKey,
  pCard: Card,
  aiCard: Card,
  posScore: { p: number; ai: number },
  roundIdx: number,
  difficulty: Difficulty,
): Trap | null {
  if (!hand.length) return null;
  const has = (t: Trap) => hand.includes(t);
  const canImp = ["PD", "PE", "ATA"].includes(pos);
  const pVal = pCard.attrs[chosenAttr] ?? 0;
  const aiVal = aiCard.attrs[chosenAttr] ?? 0;
  const diff = pVal - aiVal; // >0 means AI is losing this round
  const behind = posScore.ai < posScore.p;
  const mustReact = roundIdx === 2 && behind;

  if (difficulty === "EASY") {
    if (has("AMARELO") && diff >= 10 && Math.random() < 0.5) return "AMARELO";
    return null;
  }

  if (difficulty === "NORMAL") {
    if (has("AMARELO") && diff >= 5) return "AMARELO";
    if (canImp && has("IMPEDIMENTO") && diff >= 8 && behind) return "IMPEDIMENTO";
    if (has("PENALTI") && mustReact) return "PENALTI";
    return null;
  }

  // HARD — aggressive
  if (canImp && has("IMPEDIMENTO") && diff >= 8) return "IMPEDIMENTO";
  if (has("AMARELO") && diff >= 3) return "AMARELO";
  if (has("PENALTI") && (mustReact || (behind && roundIdx >= 1 && diff >= 0)))
    return "PENALTI";
  if (has("AMARELO") && behind) return "AMARELO";
  return null;
}

export function aiPenaltyChoice(
  difficulty: Difficulty,
  playerLastDir: number | null,
  aiRole: "BATEDOR" | "GOLEIRO",
): number {
  if (difficulty === "HARD" && playerLastDir != null) {
    if (aiRole === "GOLEIRO") return playerLastDir; // mimic
    // batedor: pick the one player used least
    return ((playerLastDir % 3) + 1);
  }
  return 1 + Math.floor(Math.random() * 3);
}

export function aiParOuImpar(): { num: number; choice: "PAR" | "IMPAR" } {
  return {
    num: Math.floor(Math.random() * 6),
    choice: Math.random() < 0.5 ? "PAR" : "IMPAR",
  };
}

export function attrsFor(pos: Position): AttrKey[] {
  return attrsForPosition(pos);
}
