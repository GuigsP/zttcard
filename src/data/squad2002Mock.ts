import {
  calculateCardOverall,
  distributeAttributesForOverall,
  getRarityFromOverall,
  type CardScale,
} from "@/types/cardScale";

/**
 * Mock de Validação Prática: Seleção Brasileira 2002 vs Início Barcelona 2003
 * Demonstra como a fórmula ponderada de overall resolve a hierarquia de elenco
 * e as variações de ano/competição do mesmo atleta matematicamente.
 */

// 1. Ronaldinho - Brasil 2002 (Auge em Copa do Mundo, Titular Absoluto)
// Base (88) + Copa do Mundo (+5) + Titular (+4) = 97 (Lendária)
const ronaldinho2002Ovr = calculateCardOverall(88, "COPA_DO_MUNDO", "TITULAR");

export const ronaldinho2002: CardScale = {
  athlete: "Ronaldinho Gaúcho",
  parodyName: "Ronaldinho dos Rolês 2002",
  team: "Brasil",
  year: 2002,
  competition: "COPA_DO_MUNDO",
  role: "TITULAR",
  baseScore: 88,
  overall: ronaldinho2002Ovr, // 97
  rarity: getRarityFromOverall(ronaldinho2002Ovr), // 'lendaria'
  attrs: distributeAttributesForOverall("M10", ronaldinho2002Ovr, { primary: 2, secondary: 0, tertiary: -2 }),
  // criacao: 99, passe: 97, defesa: 95
};

// 2. Ronaldinho - Barcelona 2003 (Início de ciclo / adaptação na LaLiga, Titular)
// Base (88) + LaLiga (0) + Titular (+4) = 92 (Lendária)
const ronaldinho2003Ovr = calculateCardOverall(88, "LIGA_NACIONAL", "TITULAR");

export const ronaldinho2003: CardScale = {
  athlete: "Ronaldinho Gaúcho",
  parodyName: "Ronaldinho Bruxo Barça 2003",
  team: "Barcelona",
  year: 2003,
  competition: "LIGA_NACIONAL",
  role: "TITULAR",
  baseScore: 88,
  overall: ronaldinho2003Ovr, // 92
  rarity: getRarityFromOverall(ronaldinho2003Ovr), // 'lendaria'
  attrs: distributeAttributesForOverall("PE", ronaldinho2003Ovr, { primary: 3, secondary: 1, tertiary: -4 }),
  // finalizacao: 95, drible: 93, velocidade: 88
};

// 3. Juninho Paulista - Brasil 2002 (Coadjuvante de Alto Nível / 1º Reserva / 12º Jogador)
// Base (76) + Copa do Mundo (+5) + 1º Reserva (+1) = 82 (Épica)
const juninho2002Ovr = calculateCardOverall(76, "COPA_DO_MUNDO", "RESERVA_1");

export const juninhoPaulista2002: CardScale = {
  athlete: "Juninho Paulista",
  parodyName: "Juninho do Drible Curto",
  team: "Brasil",
  year: 2002,
  competition: "COPA_DO_MUNDO",
  role: "RESERVA_1",
  baseScore: 76,
  overall: juninho2002Ovr, // 82
  rarity: getRarityFromOverall(juninho2002Ovr), // 'epica'
  attrs: distributeAttributesForOverall("M8", juninho2002Ovr, { primary: 3, secondary: 0, tertiary: -3 }),
  // criacao: 85, passe: 82, defesa: 79
};

// 4. Vampeta - Brasil 2002 (Operário / Composição de Elenco / 3º Reserva)
// Base (71) + Copa do Mundo (+5) + 3º Reserva (-5) = 71 (Rara)
const vampeta2002Ovr = calculateCardOverall(71, "COPA_DO_MUNDO", "RESERVA_3");

export const vampeta2002: CardScale = {
  athlete: "Vampeta",
  parodyName: "Vampeta da Cambalhota",
  team: "Brasil",
  year: 2002,
  competition: "COPA_DO_MUNDO",
  role: "RESERVA_3",
  baseScore: 71,
  overall: vampeta2002Ovr, // 71
  rarity: getRarityFromOverall(vampeta2002Ovr), // 'rara'
  attrs: distributeAttributesForOverall("VOL", vampeta2002Ovr, { primary: 2, secondary: 0, tertiary: -2 }),
  // criacao: 73, passe: 71, defesa: 69
};

export const SQUAD_2002_MOCK: CardScale[] = [
  ronaldinho2002,
  ronaldinho2003,
  juninhoPaulista2002,
  vampeta2002,
];
