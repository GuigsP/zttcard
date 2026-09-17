export function readJSON<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJSON(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export const LS_KEYS = {
  tutorialDone: "bombacard.tutorial.done",
  trapsTutorialDone: "bombacard.trapsTutorial.done",
  lastResult: "bombacard.lastResult",
  difficulty: "bombacard.difficulty",
  selectedCupPack: "ztt.selectedCupPack",
  // Multiplayer identity (persisted, no login)
  playerId: "ztt.mp.playerId",
  nickname: "ztt.mp.nickname",
  avatar: "ztt.mp.avatar",
};

function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback (should not be reached in modern browsers/SSR)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export type PlayerIdentity = {
  playerId: string;
  nickname: string;
  avatar: string; // avatar key: "av1" .. "av8"
};

export function readIdentity(): PlayerIdentity | null {
  const playerId = readJSON<string>(LS_KEYS.playerId);
  const nickname = readJSON<string>(LS_KEYS.nickname);
  const avatar = readJSON<string>(LS_KEYS.avatar);
  if (!playerId || !nickname || !avatar) return null;
  return { playerId, nickname, avatar };
}

export function ensurePlayerId(): string {
  const existing = readJSON<string>(LS_KEYS.playerId);
  if (existing) return existing;
  const id = uuid();
  writeJSON(LS_KEYS.playerId, id);
  return id;
}

export function saveIdentity(nickname: string, avatar: string): PlayerIdentity {
  const playerId = ensurePlayerId();
  writeJSON(LS_KEYS.nickname, nickname);
  writeJSON(LS_KEYS.avatar, avatar);
  return { playerId, nickname, avatar };
}
