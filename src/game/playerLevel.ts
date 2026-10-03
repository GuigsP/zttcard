import { readJSON, writeJSON } from "./storage";
import { getPlayerWallet } from "./economy/economyService";

export type PlayerStats = {
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  matchesDrawn: number;
  totalXp: number;
};

const LS_PLAYER_STATS = "ztt.player.stats";

const INITIAL_STATS: PlayerStats = {
  matchesPlayed: 0,
  matchesWon: 0,
  matchesLost: 0,
  matchesDrawn: 0,
  totalXp: 50, // Começa no Nível 1 com 50 XP
};

export function getPlayerStats(): PlayerStats {
  const stored = readJSON<PlayerStats>(LS_PLAYER_STATS);
  if (!stored) {
    writeJSON(LS_PLAYER_STATS, INITIAL_STATS);
    return INITIAL_STATS;
  }
  return stored;
}

export type CareerStage = {
  phase: number;        // 1 a 30
  level: number;        // 1 a 6
  name: string;         // "Quintal de Casa"
  chapter: string;      // "I · Da Sala Para Várzea"
  category: string;     // "Sub-13"
  fullTitle: string;    // "Nível 1 | Fase 1 — Quintal de Casa"
  arenaImage?: string;
};

export const CAREER_STAGES: CareerStage[] = [
  // ─── NÍVEL 1: I · Da Sala Para Várzea (Sub-13) ───
  { phase: 1, level: 1, name: "Quintal de Casa", chapter: "I · Da Sala Para Várzea", category: "Sub-13", fullTitle: "Nível 1 | Fase 1 — Quintal de Casa", arenaImage: "/arenas/level-1-quintal-de-casa.jpg" },
  { phase: 2, level: 1, name: "Golzinho na Rua", chapter: "I · Da Sala Para Várzea", category: "Sub-13", fullTitle: "Nível 1 | Fase 2 — Golzinho na Rua" },
  { phase: 3, level: 1, name: "Pracinha do Bairro", chapter: "I · Da Sala Para Várzea", category: "Sub-13", fullTitle: "Nível 1 | Fase 3 — Pracinha do Bairro" },
  { phase: 4, level: 1, name: "Interclasse", chapter: "I · Da Sala Para Várzea", category: "Sub-13", fullTitle: "Nível 1 | Fase 4 — Interclasse" },
  { phase: 5, level: 1, name: "Peneira da Quebrada", chapter: "I · Da Sala Para Várzea", category: "Sub-13", fullTitle: "Nível 1 | Fase 5 — Peneira da Quebrada" },

  // ─── NÍVEL 2: II · Do Sub-13 Para Sub-15 (Sub-15) ───
  { phase: 6, level: 2, name: "Categoria de Base", chapter: "II · Do Sub-13 Para Sub-15", category: "Sub-15", fullTitle: "Nível 2 | Fase 6 — Categoria de Base" },
  { phase: 7, level: 2, name: "Primeiros Clássicos", chapter: "II · Do Sub-13 Para Sub-15", category: "Sub-15", fullTitle: "Nível 2 | Fase 7 — Primeiros Clássicos" },
  { phase: 8, level: 2, name: "Primeiro Banco", chapter: "II · Do Sub-13 Para Sub-15", category: "Sub-15", fullTitle: "Nível 2 | Fase 8 — Primeiro Banco" },
  { phase: 9, level: 2, name: "MVP da Categoria", chapter: "II · Do Sub-13 Para Sub-15", category: "Sub-15", fullTitle: "Nível 2 | Fase 9 — MVP da Categoria" },
  { phase: 10, level: 2, name: "Próximo Salto", chapter: "II · Do Sub-13 Para Sub-15", category: "Sub-15", fullTitle: "Nível 2 | Fase 10 — Próximo Salto" },

  // ─── NÍVEL 3: III · Do Sub-15 Para Copinha (Sub-17) ───
  { phase: 11, level: 3, name: "Seleção da Cidade", chapter: "III · Do Sub-15 Para Copinha", category: "Sub-17", fullTitle: "Nível 3 | Fase 11 — Seleção da Cidade" },
  { phase: 12, level: 3, name: "Fazendinha / CT", chapter: "III · Do Sub-15 Para Copinha", category: "Sub-17", fullTitle: "Nível 3 | Fase 12 — Fazendinha / CT" },
  { phase: 13, level: 3, name: "1ª Viagem Estadual", chapter: "III · Do Sub-15 Para Copinha", category: "Sub-17", fullTitle: "Nível 3 | Fase 13 — 1ª Viagem Estadual" },
  { phase: 14, level: 3, name: "Copinha", chapter: "III · Do Sub-15 Para Copinha", category: "Sub-17", fullTitle: "Nível 3 | Fase 14 — Copinha" },
  { phase: 15, level: 3, name: "1º Contrato Profissional", chapter: "III · Do Sub-15 Para Copinha", category: "Sub-17", fullTitle: "Nível 3 | Fase 15 — 1º Contrato Profissional" },

  // ─── NÍVEL 4: IV · Da Cidade Para Nacional (Profissional I) ───
  { phase: 16, level: 4, name: "Estreia Estadual", chapter: "IV · Da Cidade Para Nacional", category: "Profissional I", fullTitle: "Nível 4 | Fase 16 — Estreia Estadual" },
  { phase: 17, level: 4, name: "Primeiro Clássico Profissional", chapter: "IV · Da Cidade Para Nacional", category: "Profissional I", fullTitle: "Nível 4 | Fase 17 — Primeiro Clássico Profissional" },
  { phase: 18, level: 4, name: "XI Inicial", chapter: "IV · Da Cidade Para Nacional", category: "Profissional I", fullTitle: "Nível 4 | Fase 18 — XI Inicial" },
  { phase: 19, level: 4, name: "1ª Viagem Nacional", chapter: "IV · Da Cidade Para Nacional", category: "Profissional I", fullTitle: "Nível 4 | Fase 19 — 1ª Viagem Nacional" },
  { phase: 20, level: 4, name: "Estreia Nacional", chapter: "IV · Da Cidade Para Nacional", category: "Profissional I", fullTitle: "Nível 4 | Fase 20 — Estreia Nacional" },

  // ─── NÍVEL 5: V · Do Nacional Para Internacional (Profissional II) ───
  { phase: 21, level: 5, name: "Vaga Continental", chapter: "V · Do Nacional Para Internacional", category: "Profissional II", fullTitle: "Nível 5 | Fase 21 — Vaga Continental" },
  { phase: 22, level: 5, name: "Primeiro Passaporte", chapter: "V · Do Nacional Para Internacional", category: "Profissional II", fullTitle: "Nível 5 | Fase 22 — Primeiro Passaporte" },
  { phase: 23, level: 5, name: "1ª Convocação (Base)", chapter: "V · Do Nacional Para Internacional", category: "Profissional II", fullTitle: "Nível 5 | Fase 23 — 1ª Convocação (Base)" },
  { phase: 24, level: 5, name: "Estreia Seleção de Base", chapter: "V · Do Nacional Para Internacional", category: "Profissional II", fullTitle: "Nível 5 | Fase 24 — Estreia Seleção de Base" },
  { phase: 25, level: 5, name: "Estreia Continental", chapter: "V · Do Nacional Para Internacional", category: "Profissional II", fullTitle: "Nível 5 | Fase 25 — Estreia Continental" },

  // ─── NÍVEL 6: VI · Do Internacional Para Seleção Base (Profissional III) ───
  { phase: 26, level: 6, name: "Primeira Lesão Grave", chapter: "VI · Do Internacional Para Seleção Base", category: "Profissional III", fullTitle: "Nível 6 | Fase 26 — Primeira Lesão Grave" },
  { phase: 27, level: 6, name: "Retorno & Queda Nacional", chapter: "VI · Do Internacional Para Seleção Base", category: "Profissional III", fullTitle: "Nível 6 | Fase 27 — Retorno & Queda Nacional" },
  { phase: 28, level: 6, name: "Noite Mágica (Semifinal)", chapter: "VI · Do Internacional Para Seleção Base", category: "Profissional III", fullTitle: "Nível 6 | Fase 28 — Noite Mágica (Semifinal)" },
  { phase: 29, level: 6, name: "Final Continental B", chapter: "VI · Do Internacional Para Seleção Base", category: "Profissional III", fullTitle: "Nível 6 | Fase 29 — Final Continental B" },
  { phase: 30, level: 6, name: "MVP Continental B", chapter: "VI · Do Internacional Para Seleção Base", category: "Profissional III", fullTitle: "Nível 6 | Fase 30 — MVP Continental B" },
];

export function getCareerStage(phase: number): CareerStage {
  const bounded = Math.max(1, Math.min(30, phase));
  return CAREER_STAGES.find((s) => s.phase === bounded) ?? CAREER_STAGES[0];
}

// Compatibilidade retroativa
export type CareerLevel = CareerStage;
export const CAREER_LEVELS = CAREER_STAGES;
export function getCareerLevel(levelOrPhase: number): CareerStage {
  return getCareerStage(levelOrPhase);
}

const LS_CAREER_PHASE = "ztt.career.phase";

export function getPlayerCareerPhase(): number {
  const stored = readJSON<number>(LS_CAREER_PHASE);
  if (typeof stored === "number" && stored >= 1 && stored <= 30) {
    return stored;
  }
  return 1;
}

export function setPlayerCareerPhase(phase: number): void {
  const bounded = Math.max(1, Math.min(30, phase));
  writeJSON(LS_CAREER_PHASE, bounded);
}

/**
 * Retorna a imagem oficial da arena da fase ou o cenário desbloqueado mais recente como fallback
 */
export function getArenaImageForPhase(phase: number): string {
  const bounded = Math.max(1, Math.min(30, phase));
  const exact = CAREER_STAGES.find((s) => s.phase === bounded);
  if (exact?.arenaImage) return exact.arenaImage;

  // Busca retroativa da arena mais próxima desbloqueada
  for (let p = bounded; p >= 1; p--) {
    const prev = CAREER_STAGES.find((s) => s.phase === p);
    if (prev?.arenaImage) return prev.arenaImage;
  }
  return "/arenas/level-1-quintal-de-casa.jpg";
}

export const getArenaImageForLevel = getArenaImageForPhase;

export type PlayerLevelInfo = {
  phase: number;          // 1 a 30
  level: number;          // 1 a 6
  phaseName: string;      // "Quintal de Casa"
  title: string;          // "Quintal de Casa"
  chapter: string;        // "I · Da Sala Para Várzea"
  category: string;       // "Sub-13"
  stageBadge: string;     // "Nível 1 | Fase 1"
  fullTitle: string;      // "Nível 1 | Fase 1 — Quintal de Casa"
  arenaImage: string;
  xp: number;
  nextLevelXp: number;
  progressPercent: number;
};

// Título da Arena / Patamar da Carreira
export function getLevelTitle(phase: number = 1): string {
  return getCareerStage(phase).name;
}

/**
 * Calcula o progresso de Carreira e Nível do jogador
 */
export function getPlayerLevel(): PlayerLevelInfo {
  const stats = getPlayerStats();
  const currentPhase = getPlayerCareerPhase();
  const stage = getCareerStage(currentPhase);

  // XP total por partidas jogadas
  const totalXp = Math.max(50, stats.totalXp);
  const xpPerPhase = 100;
  const currentPhaseBaseXp = (stage.phase - 1) * xpPerPhase;
  const nextPhaseXp = stage.phase * xpPerPhase;
  const currentProgressXp = Math.max(0, totalXp - currentPhaseBaseXp);
  const progressPercent = Math.min(100, Math.round((currentProgressXp / xpPerPhase) * 100));

  return {
    phase: stage.phase,
    level: stage.level,
    phaseName: stage.name,
    title: stage.name,
    chapter: stage.chapter,
    category: stage.category,
    stageBadge: `Nível ${stage.level} | Fase ${stage.phase}`,
    fullTitle: `Nível ${stage.level} | Fase ${stage.phase} — ${stage.name}`,
    arenaImage: getArenaImageForPhase(stage.phase),
    xp: totalXp,
    nextLevelXp: nextPhaseXp,
    progressPercent,
  };
}

export function recordMatchResult(won: boolean, draw: boolean): PlayerLevelInfo {
  const current = getPlayerStats();
  const xpGain = won ? 50 : draw ? 25 : 15;

  // Ao vencer uma partida, avança para a próxima Fase da Carreira!
  const currentPhase = getPlayerCareerPhase();
  if (won && currentPhase < 30) {
    setPlayerCareerPhase(currentPhase + 1);
  }

  const updated: PlayerStats = {
    matchesPlayed: current.matchesPlayed + 1,
    matchesWon: current.matchesWon + (won ? 1 : 0),
    matchesLost: current.matchesLost + (!won && !draw ? 1 : 0),
    matchesDrawn: current.matchesDrawn + (draw ? 1 : 0),
    totalXp: current.totalXp + xpGain,
  };

  writeJSON(LS_PLAYER_STATS, updated);
  return getPlayerLevel();
}
