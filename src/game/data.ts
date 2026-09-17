import type { Card, Position } from "./types";
import { attrsForPosition, POSITIONS } from "./types";

// Funny fictional retro names, 3 per position per side = 66 total.
const NAMES: Record<Position, [string[], string[]]> = {
  GOL: [
    ["Tafferalho", "Dida Boladão", "Marcosvaldo"],
    ["Buffonildo", "Chilaverto", "Casillinhas"],
  ],
  LD: [
    ["Cafuzinho", "Maiconel", "Zé Roberval"],
    ["Cafuringa", "Serginhão", "Daniel Alvim"],
  ],
  ZAD: [
    ["Roberto Larcos", "Lucinho", "Aldair Jr"],
    ["Nestinho", "Kanavaro", "Puyolinho"],
  ],
  ZAE: [
    ["Juninho Baiano", "Émersão", "Zaguinho"],
    ["Ramoslândia", "Pikê", "Terry Boladão"],
  ],
  LE: [
    ["Roberto Carlinhos", "Junior Boy", "Branco 2000"],
    ["Zambrottinho", "Cole Frio", "Evrada"],
  ],
  VOL: [
    ["Dunguinha", "Emerson Frita", "Gilbertinho"],
    ["Vieirão", "Kanteca", "Makelelê Jr"],
  ],
  M8: [
    ["Kaká Bolada", "Zé Elias", "Rivardo"],
    ["Xavizinho", "Iniestol", "Pirlinho"],
  ],
  M10: [
    ["Dinho", "Zinedinho", "Riquelmar"],
    ["Zizuca", "Totônio", "Maradonildo"],
  ],
  PD: [
    ["Ronieldo", "Robinhoso", "Gárrinchinha"],
    ["Beckhamzão", "Figueiroa", "Salahzinho"],
  ],
  PE: [
    ["Reymar", "Denilsãozinho", "Overmarso"],
    ["Ribéryco", "Mbappinho", "Bale Boladão"],
  ],
  ATA: [
    ["Romarinho", "Adrianoel", "Gabiol"],
    ["Batistuta Jr", "Allejo", "Van Nistelbão"],
  ],
};

const QUOTES: Record<Position, string[]> = {
  GOL: [
    "Pega até bola de canhão.",
    "Voa mais que pipa em julho.",
    "Só toma gol de bicicleta.",
  ],
  LD: ["Sobe e desce a lateral o jogo todo.", "Cruza de olhos fechados.", "Marca até a sombra."],
  ZAD: ["Não passa nem o vento.", "Cabeceio de touro premiado.", "Corta tudo, até papo."],
  ZAE: ["Divide até com poste.", "Cabeça de martelo.", "Xerife da área."],
  LE: ["Chute forte igual bomba.", "Cruza no bico do chuteiro.", "Corre o jogo inteiro."],
  VOL: ["Rouba bola até em treino.", "Sola de ferro fundido.", "Marca dois de uma vez."],
  M8: ["Toca de primeira sem olhar.", "Passe milimétrico.", "Motor do time."],
  M10: ["Faz o time jogar bonito.", "Drible desconcertante.", "Cabeça pensante do time."],
  PD: ["Elástico, pedalada, gol.", "Rápido igual moto.", "Chute com veneno."],
  PE: ["Drible curto e chute torto.", "Faz o zagueiro chorar.", "Perna de borracha."],
  ATA: ["Faz gol até dormindo.", "Cheirador de área nato.", "Chuta de qualquer ângulo."],
};

function rand(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function statInRange(r: () => number, min: number, max: number) {
  return Math.round(min + r() * (max - min));
}

function buildCard(
  side: "P" | "AI",
  pos: Position,
  idx: number,
  name: string,
  seed: number,
): Card {
  const r = rand(seed);
  const keys = attrsForPosition(pos);
  const attrs: Card["attrs"] = {};
  const vals: number[] = [];
  // Bias: tier by idx (0 highest)
  const tierMax = idx === 0 ? 99 : idx === 1 ? 90 : 82;
  const tierMin = idx === 0 ? 82 : idx === 1 ? 70 : 55;
  for (const k of keys) {
    const v = statInRange(r, tierMin, tierMax);
    attrs[k] = v;
    vals.push(v);
  }
  const ovr = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  return {
    id: `${side}-${pos}-${idx}`,
    name,
    position: pos,
    ovr,
    attrs,
    quote: QUOTES[pos][idx] ?? "",
  };
}

export function buildDeck(side: "P" | "AI"): Card[] {
  const cards: Card[] = [];
  let seed = side === "P" ? 42 : 1337;
  for (const pos of POSITIONS) {
    const names = NAMES[pos][side === "P" ? 0 : 1];
    for (let i = 0; i < 3; i++) {
      cards.push(buildCard(side, pos, i, names[i], seed));
      seed += 97;
    }
  }
  return cards;
}
