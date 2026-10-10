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

export type QuickBanterOption = {
  id: string;
  emoji: string;
  text: string;
  replies: string[];
};

export const QUICK_BANTER_OPTIONS: QuickBanterOption[] = [
  {
    id: "warming_up",
    emoji: "🔥",
    text: "Tô só aquecendo!",
    replies: [
      "Vai aquecer no vestiário se continuar desse jeito!",
      "Esquenta logo que o segundo tempo tá chegando!",
      "Aquecendo? Achei que esse já era o seu limite máximo!",
      "Se esse é o aquecimento, o jogo oficial nem vai ter graça!",
    ],
  },
  {
    id: "talks_too_much",
    emoji: "🤫",
    text: "Fala muito!",
    replies: [
      "Falo muito e jogo mais ainda! Olha o placar!",
      "Tite já dizia: fala muito! Mas minha tática tá funcionando!",
      "Quem tem boca vaia, quem tem bola guarda no fundo da rede!",
      "Falo mesmo! Na várzea o que ganha jogo é pressão psicológica!",
    ],
  },
  {
    id: "cry_is_free",
    emoji: "😭",
    text: "O choro é livre!",
    replies: [
      "Choro de quem tá pronto pra virar o jogo! Segura o rojão!",
      "Chorar? Tô é rindo do seu posicionamento em campo!",
      "Lágrimas de óleo lubrificante de tanta risada da sua jogada!",
      "O choro é livre, mas os 3 pontos hoje são meus!",
    ],
  },
  {
    id: "follow_leader",
    emoji: "👑",
    text: "Segue o líder!",
    replies: [
      "Líder de quê? Da fila do lanche na cantina?!",
      "Cavalo paraguaio não dura 3 rodadas na minha frente!",
      "Cuidado com a soberba, a queda de quem sobe rápido é feia!",
      "Segue o líder enquanto dá tempo, que o tombo tá encomendado!",
    ],
  },
];

export function getAIReplyToBanter(banterId: string): string {
  const opt = QUICK_BANTER_OPTIONS.find((b) => b.id === banterId);
  if (!opt || opt.replies.length === 0) return "Menos papo e mais bola em campo!";
  return opt.replies[Math.floor(Math.random() * opt.replies.length)];
}

/**
 * GERAÇÃO DE FRASES RETRÔ E PROVOCAÇÕES DA IA (ESTÉTICA DE VÁRZEA PURA)
 * ATENÇÃO MÁXIMA DE LICENÇA: NUNCA citar nomes reais (Neto, Romário, Ronaldo, etc.).
 * SEMPRE usar estritamente cardName (paródia cadastrada).
 */
export function getAITaunt(ctx: TauntContext): string {
  const { event, cardName, playerLevel } = ctx;
  const name = cardName ?? "essa carta";

  // Início da partida
  if (event === "MATCH_START") {
    const frases = [
      "Fala aí, craque! Na várzea não tem VAR, se prepara!",
      "Bora ver se você joga metade do que fala!",
      "Chuteira amarrada? A máquina veio pra ganhar!",
      `Nível ${playerLevel}? Bora ver se esse elenco aguenta o tranco!`,
    ];
    return frases[Math.floor(Math.random() * frases.length)];
  }

  // Quando o jogador baixa uma carta
  if (event === "PLAYER_CARD") {
    const frases = [
      `Mandou ${name}? Sei exatamente onde ele é vulnerável!`,
      `Olha o ${name}... jogada manjada, já tava no meu radar!`,
      `Você confia muito em ${name}. Quero ver na dividida!`,
      `${name} em campo? Meu time não se assusta fácil!`,
      `Botou ${name} pra jogo? Cuidado com o contra-ataque!`,
    ];
    return frases[Math.floor(Math.random() * frases.length)];
  }

  // Quando a IA vence a rodada
  if (event === "AI_WON_ROUND") {
    const frases = [
      "Tá chutando de bico, é?",
      "Passou nem perto! Treina mais esse fundamento!",
      "Cadê o futebol arte que me prometeram?",
      "Na várzea esse chute seu ia parar no telhado da dona Maria!",
      "Leu o manual do jogo hoje ou foi na sorte?",
      "Calma, craque... o banco de reservas tá quentinho te esperando!",
      "Foi buscar a bola no mato com essa jogada aí!",
      "Ponto meu! Tô esperando você começar a jogar pra valer...",
    ];
    return frases[Math.floor(Math.random() * frases.length)];
  }

  // Quando o jogador vence a rodada
  if (event === "PLAYER_WON_ROUND") {
    const frases = [
      "Cagada pura! Quero ver repetir no próximo lance!",
      "Achou esse gol no lixo, mas tá valendo...",
      "O vento ajudou essa bola, certeza absoluta!",
      "Nem o VAR confirmava essa, hein?!",
      "Beleza, um ponto seu. Mas a máquina não se abala!",
      "Gol espírita! Só na reza brava pra entrar essa bola!",
      `Ponto com ${name}! Mas jogo de várzea só acaba no apito final!`,
    ];
    return frases[Math.floor(Math.random() * frases.length)];
  }

  // Empate
  if (event === "ROUND_DRAW") {
    const frases = [
      "Duelo truncado! Canelada pra todo lado!",
      "Dividida feia! O juiz até fingiu que não viu!",
      "Empatou no detalhe... quem piscar primeiro leva gol!",
    ];
    return frases[Math.floor(Math.random() * frases.length)];
  }

  // Trap ativada
  if (event === "AI_TRAP") {
    const frases = [
      "Achou que eu jogava limpo na várzea? Pega essa trap!",
      "Falta tática providencial! Reclama com o bandeira!",
      "Catimba raiz! Aqui não tem fair play pra amador!",
    ];
    return frases[Math.floor(Math.random() * frases.length)];
  }
  if (event === "PLAYER_TRAP") {
    const frases = [
      "Juizão comprou o apito?! Isso era pra expulsão direta!",
      "Apelou pra trap porque na bola não tava arrumando nada, né?",
      "Muita catimba e pouco futebol! Mas ainda te pego!",
    ];
    return frases[Math.floor(Math.random() * frases.length)];
  }

  // Pênalti
  if (event === "PENALTY_START") {
    const frases = [
      "Pênalti! Goleirão cresceu na trave, vai tremer na cobrança!",
      "Bateu fofo é defesa na certa! Prepara o coração!",
      "Olho no olho do batedor... quem piscar primeiro perde!",
    ];
    return frases[Math.floor(Math.random() * frases.length)];
  }

  return "Que comece a próxima disputa!";
}
