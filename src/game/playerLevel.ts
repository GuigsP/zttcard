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

export type PlayerLevelInfo = {
  level: number;
  title: string;
  xp: number;
  nextLevelXp: number;
  progressPercent: number;
};

// Títulos retrô arcade por faixa de nível
export function getLevelTitle(level: number): string {
  if (level <= 2) return "Peladeiro de Fim de Semana";
  if (level <= 5) return "Destaque do Bairro";
  if (level <= 10) return "Craque da Várzea";
  if (level <= 15) return "Revelação da Copa";
  if (level <= 20) return "Profissional de Série A";
  if (level <= 25) return "Camisa 10 Nato";
  if (level <= 30) return "Seleção Canarinho";
  return "Lenda Imortal do Card";
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
  // 35 XP por vitória, 15 XP por empate, 10 XP por partida
  // 15 XP por carta única colecionada
  // 20 XP por pacote aberto
  const baseMatchXp = stats.totalXp;
  const albumXp = uniqueCardsCount * 15;
  const packXp = (wallet.packsOpened ?? 0) * 20;

  const totalXp = Math.max(50, baseMatchXp + albumXp + packXp);

  // Cada nível exige progressivamente 120 XP (fórmula suave e gratificante)
  const xpPerLevel = 120;
  const level = Math.max(1, Math.min(50, Math.floor(totalXp / xpPerLevel) + 1));
  const currentLevelBaseXp = (level - 1) * xpPerLevel;
  const nextLevelXp = level * xpPerLevel;
  const currentProgressXp = totalXp - currentLevelBaseXp;
  const progressPercent = Math.min(100, Math.round((currentProgressXp / xpPerLevel) * 100));

  return {
    level,
    title: getLevelTitle(level),
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
