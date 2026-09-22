import { supabase } from "@/integrations/supabase/client";
import { readJSON, writeJSON } from "./storage";
import type { AttrKey, Card, Difficulty, Position, Trap } from "./types";
import { attrsForPosition } from "./types";

export type TacticalMemoryEntry = {
  sample_count: number;
  weights: Record<string, number>;
};

export type TacticalMemory = Record<string, TacticalMemoryEntry>;

const LS_AI_MEMORY_KEY = "ztt.ai.tactical_memory";

// Memória padrão para inicialização rápida e offline imediato
const DEFAULT_MEMORY: TacticalMemory = {
  "pos_attr:GOL": { sample_count: 10, weights: { defesa: 7, fisico: 2, passe: 1 } },
  "pos_attr:ATA": { sample_count: 10, weights: { finalizacao: 8, velocidade: 1, drible: 1 } },
  "pos_attr:VOL": { sample_count: 10, weights: { defesa: 6, criacao: 2, passe: 2 } },
  "pos_attr:M10": { sample_count: 10, weights: { criacao: 7, passe: 2, defesa: 1 } },
  "round0_tier_choice": { sample_count: 10, weights: { tier_2: 6, tier_1: 3, tier_0: 1 } },
};

let cachedMemory: TacticalMemory | null = null;
let isFetchingMemory = false;

/**
 * Carrega a memória tática do Supabase com fallback no localStorage e valores padrão
 */
export async function loadTacticalMemory(): Promise<TacticalMemory> {
  if (cachedMemory) return cachedMemory;

  const local = readJSON<TacticalMemory>(LS_AI_MEMORY_KEY);
  if (local) {
    cachedMemory = local;
  } else {
    cachedMemory = { ...DEFAULT_MEMORY };
  }

  if (!isFetchingMemory) {
    isFetchingMemory = true;
    void (async () => {
      try {
        const { data, error } = await supabase
          .from("ai_tactical_memory")
          .select("stat_key, sample_count, weights")
          .limit(100);

        if (!error && data && data.length > 0) {
          const freshMemory: TacticalMemory = { ...cachedMemory };
          data.forEach((row: { stat_key: string; sample_count: number; weights: any }) => {
            freshMemory[row.stat_key] = {
              sample_count: row.sample_count,
              weights: (row.weights as Record<string, number>) ?? {},
            };
          });
          cachedMemory = freshMemory;
          writeJSON(LS_AI_MEMORY_KEY, freshMemory);
        }
      } catch (e) {
        console.warn("[AI Tactical Engine] Falha ao sincronizar memória com Supabase (usando local):", e);
      } finally {
        isFetchingMemory = false;
      }
    })();
  }

  return cachedMemory;
}

/**
 * Envia em segundo plano o aprendizado de uma rodada para o Supabase
 */
export async function recordTacticalStatBatch(
  stats: { statKey: string; attribute: string; increment?: number }[]
) {
  if (!stats || stats.length === 0) return;

  // Atualiza cache local instantaneamente
  if (!cachedMemory) cachedMemory = readJSON<TacticalMemory>(LS_AI_MEMORY_KEY) || { ...DEFAULT_MEMORY };
  for (const s of stats) {
    const inc = s.increment ?? 1;
    if (!cachedMemory[s.statKey]) {
      cachedMemory[s.statKey] = { sample_count: 0, weights: {} };
    }
    cachedMemory[s.statKey].sample_count += inc;
    cachedMemory[s.statKey].weights[s.attribute] =
      (cachedMemory[s.statKey].weights[s.attribute] || 0) + inc;
  }
  writeJSON(LS_AI_MEMORY_KEY, cachedMemory);

  // Envia assíncrono ao Supabase sem bloquear a interface
  try {
    for (const item of stats) {
      await supabase.rpc("record_tactical_stat", {
        p_stat_key: item.statKey,
        p_attribute: item.attribute,
        p_increment: item.increment ?? 1,
      });
    }
  } catch (err) {
    // Erros de rede são ignorados silenciosamente pois a memória local foi atualizada
    console.debug("[AI Tactical Engine] Falha no upload assíncrono:", err);
  }
}

/**
 * ESCOLHA ADAPTATIVA DA CARTA PELA IA:
 * Considera o nível do jogador (1 a 30+), rodada atual (0, 1 ou 2) e padrão tático
 */
export function pickCardAIAdaptive(
  aiHand: Card[],
  usedIds: string[],
  playerLevel: number,
  roundIdx: number,
  posScore: { p: number; ai: number },
  opponentHand?: Card[]
): Card {
  const remaining = aiHand.filter((c) => !usedIds.includes(c.id));
  if (remaining.length === 0) return aiHand[0];
  if (remaining.length === 1) return remaining[0];

  // Ordena cartas da IA por maior atributo individual
  const sortedByPower = [...remaining].sort((a, b) => {
    const maxA = Math.max(...Object.values(a.attrs).map((v) => v ?? 0));
    const maxB = Math.max(...Object.values(b.attrs).map((v) => v ?? 0));
    return maxB - maxA;
  });

  const bestCard = sortedByPower[0];
  const weakestCard = sortedByPower[sortedByPower.length - 1];
  const middleCard = sortedByPower.length > 2 ? sortedByPower[1] : sortedByPower[0];

  // NÍVEL 1 A 5: INICIANTE (IA permissiva e humanizada)
  // 35% de chance de jogar carta mais fraca ou aleatória para não pressionar novatos
  if (playerLevel <= 5) {
    if (Math.random() < 0.35) {
      return remaining[Math.floor(Math.random() * remaining.length)];
    }
    // Na rodada 0 joga médio, na última joga a melhor
    return roundIdx === 0 ? middleCard : bestCard;
  }

  // NÍVEL 6 A 15: INTERMEDIÁRIO (IA estratégica)
  // Aprendeu que no Round 0 muitos jogadores descartam carta fraca
  if (playerLevel <= 15) {
    // Se a IA está atrás na posição, joga o craque imediatamente
    if (posScore.ai < posScore.p) {
      return bestCard;
    }
    // Na rodada 1 (roundIdx === 0), poupa o craque e usa carta média
    if (roundIdx === 0) {
      return middleCard;
    }
    // No round 1 ou 2, joga com força máxima
    return bestCard;
  }

  // NÍVEL 16 A 25: AVANÇADO (IA lê tendências da comunidade)
  if (playerLevel <= 25) {
    // Verifica na memória estatística se a comunidade costuma gastar carta fraca no round 0
    const mem = cachedMemory || readJSON<TacticalMemory>(LS_AI_MEMORY_KEY) || DEFAULT_MEMORY;
    const round0Stats = mem["round0_tier_choice"]?.weights ?? {};
    const playerPrefersWeakOnRound0 = (round0Stats["tier_2"] ?? 0) > (round0Stats["tier_0"] ?? 0);

    if (roundIdx === 0) {
      if (playerPrefersWeakOnRound0) {
        // Se a maioria descarta fraca no round 0, a IA joga uma carta média suficiente para punir
        return middleCard;
      }
      return bestCard;
    }

    if (posScore.ai <= posScore.p) {
      return bestCard;
    }
    return sortedByPower[0];
  }

  // NÍVEL 26+: MODO MESTRE / LENDA (IA implacável e otimizada)
  // Analisa a mão restante do oponente se disponível
  if (opponentHand && opponentHand.length > 0) {
    // Calcula contra qual carta restante a IA tem melhor vantagem percentual
    let highestWinCard = remaining[0];
    let maxWins = -1;

    for (const card of remaining) {
      let winCount = 0;
      for (const opp of opponentHand) {
        for (const [attr, val] of Object.entries(card.attrs)) {
          if ((val ?? 0) > (opp.attrs[attr as AttrKey] ?? 0)) {
            winCount++;
          }
        }
      }
      if (winCount > maxWins) {
        maxWins = winCount;
        highestWinCard = card;
      }
    }
    return highestWinCard;
  }

  return bestCard;
}

/**
 * ESCOLHA ADAPTATIVA DO ATRIBUTO PELA IA
 */
export function pickAttrAIAdaptive(
  aiCard: Card,
  opponentHand: Card[] | null,
  pos: Position,
  playerLevel: number,
  difficulty: Difficulty
): AttrKey {
  const entries = Object.entries(aiCard.attrs) as [AttrKey, number][];
  if (entries.length === 0) {
    const valid = attrsForPosition(pos);
    return valid[0];
  }

  // Nível baixo (1 a 5) ou dificuldade EASY: escolha mais solta
  if (playerLevel <= 5 || difficulty === "EASY") {
    if (Math.random() < 0.3) {
      return entries[Math.floor(Math.random() * entries.length)][0];
    }
    // Escolhe o seu melhor atributo sem calcular a mão do adversário
    return [...entries].sort((a, b) => b[1] - a[1])[0][0];
  }

  // Nível 6 a 15: escolhe o melhor atributo da carta
  if (playerLevel <= 15 || !opponentHand || opponentHand.length === 0) {
    return [...entries].sort((a, b) => b[1] - a[1])[0][0];
  }

  // Nível 16+: Compara com a média do adversário e com a tendência da posição
  const mem = cachedMemory || readJSON<TacticalMemory>(LS_AI_MEMORY_KEY) || DEFAULT_MEMORY;
  const posKey = `pos_attr:${pos}`;
  const posWeights = mem[posKey]?.weights ?? {};

  let bestAttr: AttrKey = entries[0][0];
  let bestScore = -Infinity;

  for (const [attr, val] of entries) {
    const oppAvg =
      opponentHand.reduce((sum, c) => sum + (c.attrs[attr] ?? 0), 0) / opponentHand.length;
    let score = val - oppAvg;

    // Bônus tático se a comunidade costuma ser mais fraca ou previsível neste atributo
    const communityWeight = posWeights[attr] ?? 0;
    if (communityWeight > 0) {
      score += 2; // Leve viés estratégico baseado na memória coletiva
    }

    if (score > bestScore) {
      bestScore = score;
      bestAttr = attr;
    }
  }

  return bestAttr;
}

/**
 * REAÇÃO TÁTICA DE TRAP PELA IA (AMARELO, IMPEDIMENTO, PENALTI)
 */
export function aiReactTrapAdaptive(
  hand: Trap[],
  pos: Position,
  chosenAttr: AttrKey,
  pCard: Card,
  aiCard: Card,
  posScore: { p: number; ai: number },
  roundIdx: number,
  playerLevel: number,
  difficulty: Difficulty
): Trap | null {
  if (!hand.length) return null;
  const has = (t: Trap) => hand.includes(t);
  const canImp = ["PD", "PE", "ATA"].includes(pos);
  const pVal = pCard.attrs[chosenAttr] ?? 0;
  const aiVal = aiCard.attrs[chosenAttr] ?? 0;
  const diff = pVal - aiVal; // >0 significa que a IA está perdendo a rodada
  const behind = posScore.ai < posScore.p;
  const mustReact = roundIdx === 2 && behind;

  // Nível 1 a 5: raramente joga trap para não ser injusto
  if (playerLevel <= 5 || difficulty === "EASY") {
    if (has("AMARELO") && diff >= 10 && Math.random() < 0.4) return "AMARELO";
    return null;
  }

  // Nível 6 a 15: joga se estiver com risco real de perder a posição
  if (playerLevel <= 15 || difficulty === "NORMAL") {
    if (has("AMARELO") && diff >= 5) return "AMARELO";
    if (canImp && has("IMPEDIMENTO") && diff >= 8 && behind) return "IMPEDIMENTO";
    if (has("PENALTI") && mustReact) return "PENALTI";
    return null;
  }

  // Nível 16+: agressivo e preciso
  if (canImp && has("IMPEDIMENTO") && diff >= 8) return "IMPEDIMENTO";
  if (has("AMARELO") && diff >= 3) return "AMARELO";
  if (has("PENALTI") && (mustReact || (behind && roundIdx >= 1 && diff >= 0))) return "PENALTI";
  if (has("AMARELO") && behind) return "AMARELO";
  return null;
}

export type TauntContext = {
  event:
    | "MATCH_START"
    | "ROUND_START"
    | "PLAYER_CARD"
    | "AI_CARD"
    | "AI_WON_ROUND"
    | "PLAYER_WON_ROUND"
    | "ROUND_DRAW"
    | "AI_TRAP"
    | "PLAYER_TRAP"
    | "PENALTY_START";
  cardName?: string; // IMPORTANTE: SEMPRE o nome cadastrado na carta (ex: "Avô", "Ranoldo", "Calvário")
  playerLevel: number;
  pos?: Position;
  posScore?: { p: number; ai: number };
};

/**
 * GERAÇÃO DE FRASES RETRÔ E PROVOCAÇÕES DA IA
 * ATENÇÃO MÁXIMA DE LICENÇA: NUNCA citar nomes reais (Neto, Romário, Ronaldo, etc.).
 * SEMPRE usar estritamente cardName (paródia cadastrada).
 */
export function getAITaunt(ctx: TauntContext): string {
  const { event, cardName, playerLevel } = ctx;
  const name = cardName ?? "essa carta";

  // Início da partida
  if (event === "MATCH_START") {
    if (playerLevel <= 5) {
      return "Fala aí, novato! Bora começar devagar pra você pegar o ritmo.";
    }
    if (playerLevel <= 15) {
      return `Nível ${playerLevel}? Já tá ficando cascudo, mas hoje não vai ser fácil!`;
    }
    if (playerLevel <= 25) {
      return `Nível ${playerLevel}! Já vi suas jogadas no banco tático. Vem com tudo!`;
    }
    return `Nível ${playerLevel}... Modo Mestre ativado. A máquina não costuma perdoar!`;
  }

  // Quando o jogador baixa uma carta
  if (event === "PLAYER_CARD") {
    if (playerLevel <= 5) {
      const frases = [
        `Boa! ${name} tem bons números na mesa.`,
        `Olha o ${name}! Quero ver o que você vai aprontar com ele.`,
        `${name} em campo! Meu time vai ter que segurar essa!`,
      ];
      return frases[Math.floor(Math.random() * frases.length)];
    }
    if (playerLevel <= 15) {
      const frases = [
        `Tentando surpreender com ${name}? Já vi essa jogada antes!`,
        `${name} é bola cheia, mas tenho resposta à altura no meu deck!`,
        `Mandou ${name} agora? Cuidado que o contra-ataque vem rápido!`,
      ];
      return frases[Math.floor(Math.random() * frases.length)];
    }
    // Nível 16+
    const frases = [
      `Colocou ${name} na mesa? Sei exatamente onde ele é vulnerável.`,
      `${name}... clássica jogada de quem tá no nível ${playerLevel}. Mas meu cálculo é frio!`,
      `Você confia muito em ${name}. Vamos ver se os números confirmam!`,
    ];
    return frases[Math.floor(Math.random() * frases.length)];
  }

  // Quando a IA vence a rodada
  if (event === "AI_WON_ROUND") {
    if (playerLevel <= 5) {
      return "Ponto meu! Mas calma, o jogo tá só no começo!";
    }
    if (playerLevel <= 15) {
      return `Ponto da IA! No nível ${playerLevel} você não achou que seria de graça, né?`;
    }
    return `Ponto da IA! Padrão detectado e neutralizado com sucesso!`;
  }

  // Quando o jogador vence a rodada
  if (event === "PLAYER_WON_ROUND") {
    if (playerLevel <= 5) {
      return `Golaço com ${name}! Jogou muito nessa!`;
    }
    if (playerLevel <= 15) {
      return `Ponto seu com ${name}! Essa foi no limite, hein?`;
    }
    return `Ponto merecido com ${name}. Mas o jogo se decide na próxima rodada!`;
  }

  // Empate
  if (event === "ROUND_DRAW") {
    return "Empatou! Duelo disputadíssimo palmo a palmo!";
  }

  // Trap ativada
  if (event === "AI_TRAP") {
    return "TRAP ATIVADA! Achou que eu não tinha uma carta na manga?";
  }
  if (event === "PLAYER_TRAP") {
    return "Usou Trap?! O juiz tá muito complacente com essa jogada!";
  }

  // Pênalti
  if (event === "PENALTY_START") {
    return "Pênalti! Olho no olho do batedor... quem piscar primeiro perde!";
  }

  return "Que comece a próxima disputa!";
}
