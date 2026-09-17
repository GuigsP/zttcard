import type { AttrKey, Position } from "@/game/types";
import { attrsForPosition } from "@/game/types";

export type SquadRole = "TITULAR" | "RESERVA_1" | "RESERVA_2" | "RESERVA_3";

export type CompetitionTier = "COPA_DO_MUNDO" | "CONTINENTAL" | "LIGA_NACIONAL" | "ESTADUAL";

export type CardRarity = "comum" | "rara" | "epica" | "lendaria";

export interface CardScale {
  athlete: string;        // Ex: "Ronaldinho Gaúcho"
  parodyName: string;     // Ex: "Ronaldinho dos Rolês"
  team: string;           // Ex: "Brasil"
  year: number;           // Ex: 2002
  competition: CompetitionTier;
  role: SquadRole;
  baseScore: number;      // 40 a 90 (Qualidade intrínseca da carreira)
  overall: number;        // Calculado automaticamente (40 a 99)
  rarity: CardRarity;     // Derivado do overall final
  attrs: Record<string, number>;
}

export const ROLE_MODIFIERS: Record<SquadRole, number> = {
  TITULAR: 4,     // Titular Absoluto / Protagonista
  RESERVA_1: 1,   // 1º Reserva (12º jogador / entra sempre)
  RESERVA_2: -2,  // 2º Reserva (rotação secundária)
  RESERVA_3: -5,  // 3º Reserva (convocado de composição)
};

export const ROLE_LABELS: Record<SquadRole, string> = {
  TITULAR: "Titular Absoluto (+4)",
  RESERVA_1: "1º Reserva / 12º Jogador (+1)",
  RESERVA_2: "2º Reserva (-2)",
  RESERVA_3: "3º Reserva / Composição (-5)",
};

export const COMPETITION_MODIFIERS: Record<CompetitionTier, number> = {
  COPA_DO_MUNDO: 5,   // Título / Reta final de Copa do Mundo
  CONTINENTAL: 3,     // Champions League / Libertadores (Fase Final)
  LIGA_NACIONAL: 0,   // Brasileirão / LaLiga / Temporada de Adaptação
  ESTADUAL: -3,       // Estadual / Início de Carreira
};

export const COMPETITION_LABELS: Record<CompetitionTier, string> = {
  COPA_DO_MUNDO: "Copa do Mundo (+5)",
  CONTINENTAL: "Continental / Libertadores / Champions (+3)",
  LIGA_NACIONAL: "Liga Nacional / Brasileirão / LaLiga (0)",
  ESTADUAL: "Estadual / Início de Carreira (-3)",
};

/**
 * Fórmula Ponderada de Poder da Carta:
 * Overall = Base do Atleta + Modificador de Competição + Modificador de Status no Elenco
 * Travado estritamente entre 40 e 99.
 */
export function calculateCardOverall(
  baseScore: number,
  competition: CompetitionTier,
  role: SquadRole
): number {
  const score = baseScore + COMPETITION_MODIFIERS[competition] + ROLE_MODIFIERS[role];
  return Math.min(99, Math.max(40, score));
}

/**
 * Retorna a faixa de raridade oficial do jogo com base no Overall.
 */
export function getRarityFromOverall(overall: number): CardRarity {
  if (overall >= 90) return "lendaria";
  if (overall >= 80) return "epica";
  if (overall >= 63) return "rara";
  return "comum";
}

/**
 * Distribui os 3 atributos da posição para que a média resulte exatamente no Overall final desejado.
 */
export function distributeAttributesForOverall(
  position: Position,
  overall: number,
  skew: { primary?: number; secondary?: number; tertiary?: number } = {}
): Record<string, number> {
  const keys = attrsForPosition(position);
  const pDelta = skew.primary ?? 2;
  const sDelta = skew.secondary ?? 0;
  const tDelta = skew.tertiary ?? -2;

  const deltas = [pDelta, sDelta, tDelta];
  const result: Record<string, number> = {};

  keys.forEach((key, index) => {
    const delta = deltas[index] ?? 0;
    const value = Math.min(99, Math.max(40, overall + delta));
    result[key] = value;
  });

  return result;
}
