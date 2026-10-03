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

export type CareerLevel = {
  level: number;
  name: string;
  chapter: string;
  category: string;
  arenaImage?: string;
};

export const CAREER_LEVELS: CareerLevel[] = [
  // Capítulo I: Da Sala Para Várzea (Sub-13)
  { level: 1, name: "Quintal de Casa", chapter: "I · Da Sala Para Várzea", category: "Sub-13", arenaImage: "/arenas/level-1-quintal-de-casa.jpg" },
  { level: 2, name: "Golzinho na Rua", chapter: "I · Da Sala Para Várzea", category: "Sub-13" },
  { level: 3, name: "Pracinha do Bairro", chapter: "I · Da Sala Para Várzea", category: "Sub-13" },
  { level: 4, name: "Interclasse", chapter: "I · Da Sala Para Várzea", category: "Sub-13" },
  { level: 5, name: "Peneira da Quebrada", chapter: "I · Da Sala Para Várzea", category: "Sub-13" },

  // Capítulo II: Do Sub-13 Para Sub-15 (Sub-15)
  { level: 6, name: "Categoria de Base", chapter: "II · Do Sub-13 Para Sub-15", category: "Sub-15" },
  { level: 7, name: "Primeiros Clássicos", chapter: "II · Do Sub-13 Para Sub-15", category: "Sub-15" },
  { level: 8, name: "Primeiro Banco", chapter: "II · Do Sub-13 Para Sub-15", category: "Sub-15" },
  { level: 9, name: "MVP da Categoria", chapter: "II · Do Sub-13 Para Sub-15", category: "Sub-15" },
  { level: 10, name: "Próximo Salto", chapter: "II · Do Sub-13 Para Sub-15", category: "Sub-15" },

  // Capítulo III: Do Sub-15 Para Copinha (Sub-17)
  { level: 11, name: "Seleção da Cidade", chapter: "III · Do Sub-15 Para Copinha", category: "Sub-17" },
  { level: 12, name: "Fazendinha / CT", chapter: "III · Do Sub-15 Para Copinha", category: "Sub-17" },
  { level: 13, name: "1ª Viagem Estadual", chapter: "III · Do Sub-15 Para Copinha", category: "Sub-17" },
  { level: 14, name: "Copinha", chapter: "III · Do Sub-15 Para Copinha", category: "Sub-17" },
  { level: 15, name: "1º Contrato Profissional", chapter: "III · Do Sub-15 Para Copinha", category: "Sub-17" },

  // Capítulo IV: Da Cidade Para Nacional (Profissional I)
  { level: 16, name: "Estreia Estadual", chapter: "IV · Da Cidade Para Nacional", category: "Profissional I" },
  { level: 17, name: "Primeiro Clássico Profissional", chapter: "IV · Da Cidade Para Nacional", category: "Profissional I" },
  { level: 18, name: "XI Inicial", chapter: "IV · Da Cidade Para Nacional", category: "Profissional I" },
  { level: 19, name: "1ª Viagem Nacional", chapter: "IV · Da Cidade Para Nacional", category: "Profissional I" },
  { level: 20, name: "Estreia Nacional", chapter: "IV · Da Cidade Para Nacional", category: "Profissional I" },

  // Capítulo V: Do Nacional Para Internacional (Profissional II)
  { level: 21, name: "Vaga Continental", chapter: "V · Do Nacional Para Internacional", category: "Profissional II" },
  { level: 22, name: "Primeiro Passaporte", chapter: "V · Do Nacional Para Internacional", category: "Profissional II" },
  { level: 23, name: "1ª Convocação (Base)", chapter: "V · Do Nacional Para Internacional", category: "Profissional II" },
  { level: 24, name: "Estreia Seleção de Base", chapter: "V · Do Nacional Para Internacional", category: "Profissional II" },
  { level: 25, name: "Estreia Continental", chapter: "V · Do Nacional Para Internacional", category: "Profissional II" },

  // Capítulo VI: Do Internacional Para Seleção Base (Profissional III)
  { level: 26, name: "Primeira Lesão Grave", chapter: "VI · Do Internacional Para Seleção Base", category: "Profissional III" },
  { level: 27, name: "Retorno & Queda Nacional", chapter: "VI · Do Internacional Para Seleção Base", category: "Profissional III" },
  { level: 28, name: "Noite Mágica (Semifinal)", chapter: "VI · Do Internacional Para Seleção Base", category: "Profissional III" },
  { level: 29, name: "Final Continental B", chapter: "VI · Do Internacional Para Seleção Base", category: "Profissional III" },
  { level: 30, name: "MVP Continental B", chapter: "VI · Do Internacional Para Seleção Base", category: "Profissional III" },
];

export function getCareerLevel(level: number): CareerLevel {
  const bounded = Math.max(1, Math.min(30, level));
  return CAREER_LEVELS.find((c) => c.level === bounded) ?? CAREER_LEVELS[0];
}

export type PlayerLevelInfo = {
  level: number;
  title: string;
  chapter: string;
  category: string;
  arenaImage?: string;
  xp: number;
  nextLevelXp: number;
  progressPercent: number;
};

// Título da Arena / Patamar da Carreira
export function getLevelTitle(level: number): string {
  return getCareerLevel(level).name;
}

/**
 * Calcula o nível do jogador com base em:
 * - Vitórias / Partidas jogadas
 * - Pacotes abertos
 * - Cartas colecionadas no álbum
 */
export function getPlayerLevel(): PlayerLevelInfo {
  const stats = getPlayerStats();
  const wallet = getPlayerWallet();

  // Inventário de cartas do álbum
  const inv = readJSON<Record<string, number>>("ztt.economy.inventory") ?? {};
  const uniqueCardsCount = Object.keys(inv).length;

  // Cálculo de XP total dinâmico
  const baseMatchXp = stats.totalXp;
  const albumXp = uniqueCardsCount * 15;
  const packXp = (wallet.packsOpened ?? 0) * 20;

  const totalXp = Math.max(50, baseMatchXp + albumXp + packXp);

  // Cada nível exige progressivamente 120 XP
  const xpPerLevel = 120;
  const level = Math.max(1, Math.min(30, Math.floor(totalXp / xpPerLevel) + 1));
  const currentLevelBaseXp = (level - 1) * xpPerLevel;
  const nextLevelXp = level * xpPerLevel;
  const currentProgressXp = totalXp - currentLevelBaseXp;
  const progressPercent = Math.min(100, Math.round((currentProgressXp / xpPerLevel) * 100));

  const career = getCareerLevel(level);

  return {
    level,
    title: career.name,
    chapter: career.chapter,
    category: career.category,
    arenaImage: career.arenaImage,
    xp: totalXp,
    nextLevelXp,
    progressPercent,
  };
}

export function recordMatchResult(won: boolean, draw: boolean): PlayerLevelInfo {
  const current = getPlayerStats();
  const xpGain = won ? 50 : draw ? 25 : 15;

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
