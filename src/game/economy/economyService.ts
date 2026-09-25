import { readJSON, writeJSON } from "../storage";
import { getMasterCatalog, getCardById } from "./cardCatalog";
import { checkIsCardExclusive } from "../cardsRepo";
import type {
  CardRarity,
  CardRecycleResult,
  CatalogCard,
  CurrencyType,
  InventoryItem,
  OpenPackResult,
  PackConfig,
  PackProduct,
  PackTier,
  PlayerPityTracker,
  PlayerWallet,
  RealMoneyOffer,
  TradeListing,
  Wallet,
} from "./economyTypes";

const LS_WALLET_KEY = "ztt.economy.wallet";
const LS_PITY_KEY = "ztt.economy.pity";
const LS_INVENTORY_KEY = "ztt.economy.inventory";
const LS_MARKET_LISTINGS_KEY = "ztt.economy.marketListings";

// ==========================================
// 1. TABELA DE DESCARTE ANTI-INFLACIONÁRIA
// ==========================================
export const RECYCLE_VALUES: Record<CardRarity, number> = {
  COMUM: 6,
  INCOMUM: 20,
  RARA: 70,
  LENDA: 250,
};

// ==========================================
// 2. RECOMPENSAS DE PARTIDA
// ==========================================
export const MATCH_REWARDS = {
  solo: {
    win: 45,
    draw: 20,
    loss: 10,
  },
  multiplayer: {
    win: 90,
    draw: 30,
    loss: 25,
  },
} as const;

// ==========================================
// 3. CATÁLOGO DE PACOTES DA BANCA
// ==========================================
export const PACK_CATALOG: Record<PackTier, PackConfig> = {
  diario: {
    id: "diario",
    title: "Pacotinho Diário",
    subtitle: "Cortesia do jornaleiro. Volte todo dia para resgatar!",
    cardCount: 3,
    price: { currency: "contos", amount: 0 },
    odds: { COMUM: 0.85, INCOMUM: 0.13, RARA: 0.019, LENDA: 0.001 },
    pityWeight: 1,
    isDailyFree: true,
  },
  varzea: {
    id: "varzea",
    title: "Pacotinho de Várzea",
    subtitle: "3 figurinhas. A chance de tirar uma lenda inesperada por um trocado.",
    cardCount: 3,
    price: { currency: "contos", amount: 100 },
    odds: { COMUM: 0.819, INCOMUM: 0.16, RARA: 0.02, LENDA: 0.001 },
    pityWeight: 1,
  },
  classico: {
    id: "classico",
    title: "Pacotinho Clássico",
    subtitle: "4 figurinhas com 1 INCOMUM ou superior garantida.",
    cardCount: 4,
    price: { currency: "contos", amount: 250 },
    odds: { COMUM: 0.6, INCOMUM: 0.32, RARA: 0.075, LENDA: 0.005 },
    guaranteedRarity: "INCOMUM",
    pityWeight: 2,
  },
  ouro: {
    id: "ouro",
    title: "Pacotão Ouro",
    subtitle: "5 figurinhas com no mínimo 1 RARA garantida.",
    cardCount: 5,
    price: { currency: "contos", amount: 500 },
    odds: { COMUM: 0.4, INCOMUM: 0.42, RARA: 0.16, LENDA: 0.02 },
    guaranteedRarity: "RARA",
    pityWeight: 4,
  },
  lendas_90s: {
    id: "lendas_90s",
    title: "Caixa Lendas 90s",
    subtitle: "A joia da banca: 10% de chance de Lenda e 1 RARA garantida.",
    cardCount: 5,
    price: { currency: "fichasOuro", amount: 120 },
    altPrice: { currency: "contos", amount: 1500 },
    odds: { COMUM: 0.0, INCOMUM: 0.40, RARA: 0.50, LENDA: 0.10 },
    guaranteedRarity: "RARA",
    pityWeight: 8,
  },
};

// ==========================================
// 3.1. BLUEPRINT DETERMINÍSTICO DE SLOTS
// ==========================================
export interface SlotOdds {
  COMUM: number;
  INCOMUM: number;
  RARA: number;
  LENDA: number;
}

export interface PackSlotBlueprint {
  slots: SlotOdds[];
}

export const PACK_SLOT_BLUEPRINTS: Record<PackTier, PackSlotBlueprint> = {
  // Pacotinho Diário (3 cartas): 1 Comum, 1 Comum (85%)/Incomum (15%), 1 Clímax (95% Incomum, 4.9% Rara, 0.1% Lenda)
  diario: {
    slots: [
      { COMUM: 1.0, INCOMUM: 0.0, RARA: 0.0, LENDA: 0.0 },
      { COMUM: 0.85, INCOMUM: 0.15, RARA: 0.0, LENDA: 0.0 },
      { COMUM: 0.0, INCOMUM: 0.95, RARA: 0.049, LENDA: 0.001 },
    ],
  },
  // Pacotinho de Várzea (3 cartas - 100 Contos): 1 Comum, 1 Comum (70%)/Incomum (30%), 1 Clímax (85% Incomum, 14.9% Rara, 0.1% Lenda)
  varzea: {
    slots: [
      { COMUM: 1.0, INCOMUM: 0.0, RARA: 0.0, LENDA: 0.0 },
      { COMUM: 0.7, INCOMUM: 0.3, RARA: 0.0, LENDA: 0.0 },
      { COMUM: 0.0, INCOMUM: 0.85, RARA: 0.149, LENDA: 0.001 },
    ],
  },
  // Pacotinho Clássico (4 cartas - 250 Contos): 2 Comuns, 1 Incomum garantida, 1 Clímax (75% Incomum, 24.5% Rara, 0.5% Lenda)
  classico: {
    slots: [
      { COMUM: 1.0, INCOMUM: 0.0, RARA: 0.0, LENDA: 0.0 },
      { COMUM: 1.0, INCOMUM: 0.0, RARA: 0.0, LENDA: 0.0 },
      { COMUM: 0.0, INCOMUM: 1.0, RARA: 0.0, LENDA: 0.0 },
      { COMUM: 0.0, INCOMUM: 0.75, RARA: 0.245, LENDA: 0.005 },
    ],
  },
  // Pacotão Ouro (5 cartas - 500 Contos): 1 Comum, 2 Incomuns, 1 Incomum (65%)/Rara (35%), 1 Clímax (98% Rara, 2% Lenda)
  ouro: {
    slots: [
      { COMUM: 1.0, INCOMUM: 0.0, RARA: 0.0, LENDA: 0.0 },
      { COMUM: 0.0, INCOMUM: 1.0, RARA: 0.0, LENDA: 0.0 },
      { COMUM: 0.0, INCOMUM: 1.0, RARA: 0.0, LENDA: 0.0 },
      { COMUM: 0.0, INCOMUM: 0.65, RARA: 0.35, LENDA: 0.0 },
      { COMUM: 0.0, INCOMUM: 0.0, RARA: 0.98, LENDA: 0.02 },
    ],
  },
  // Caixa Lendas 90s (5 cartas - 120 Fichas / 1.500 Contos): 2 Incomuns, 2 Raras garantidas, 1 Clímax (Exatamente 10% Lenda / 90% Rara)
  lendas_90s: {
    slots: [
      { COMUM: 0.0, INCOMUM: 1.0, RARA: 0.0, LENDA: 0.0 },
      { COMUM: 0.0, INCOMUM: 1.0, RARA: 0.0, LENDA: 0.0 },
      { COMUM: 0.0, INCOMUM: 0.0, RARA: 1.0, LENDA: 0.0 },
      { COMUM: 0.0, INCOMUM: 0.0, RARA: 1.0, LENDA: 0.0 },
      { COMUM: 0.0, INCOMUM: 0.0, RARA: 0.9, LENDA: 0.1 },
    ],
  },
};

// ==========================================
// 4. OFERTAS DE DINHEIRO REAL (R$)
// ==========================================
export const REAL_MONEY_STORE: RealMoneyOffer[] = [
  {
    id: "pack_brl_troco_pao",
    title: "Troco do Pão",
    description: "O trocado do bolso para o primeiro pacote.",
    fichasOuroAwarded: 50,
    bonusFichasOuro: 0,
    priceBRL: 4.9,
  },
  {
    id: "pack_brl_caixinha_juiz",
    title: "Caixinha do Juiz",
    description: "O agrado básico para garantir o apito amigo.",
    fichasOuroAwarded: 120,
    bonusFichasOuro: 15,
    priceBRL: 9.9,
  },
  {
    id: "pack_brl_picanha_presidente",
    title: "Picanha do Presidente",
    description: "O churrasco nobre de quem quer abrir pacotão.",
    fichasOuroAwarded: 350,
    bonusFichasOuro: 70,
    priceBRL: 24.9,
    isPopular: true,
  },
  {
    id: "pack_brl_maleta_bicheiro",
    title: "Maleta do Bicheiro",
    description: "O investimento pesado vindo direto da maleta.",
    fichasOuroAwarded: 900,
    bonusFichasOuro: 250,
    priceBRL: 59.9,
  },
  {
    id: "pack_brl_joao_do_texto",
    title: "João do Texto",
    description: "Poder ilimitado de SAF de bilionário.",
    fichasOuroAwarded: 2200,
    bonusFichasOuro: 800,
    priceBRL: 129.9,
  },
];

// Lista de pacotes mapeados para UI do PackShop
export const STORE_PACKS: PackProduct[] = [
  {
    id: "diario",
    name: "PACOTINHO DIÁRIO",
    description: "3 figurinhas sortidas cortesia da banca. Resgate a cada 24 horas!",
    collection: "fundador",
    priceCoins: 0,
    cardsCount: 3,
    isDailyFree: true,
    themeColor: "#0d8f3f",
    badge: "GRÁTIS",
  },
  {
    id: "varzea",
    name: "PACOTINHO DE VÁRZEA",
    description: "3 figurinhas. A chance mística de tirar uma Lenda inesperada!",
    collection: "fundador",
    priceCoins: 100,
    cardsCount: 3,
    themeColor: "#002868",
    badge: "100 🪙",
  },
  {
    id: "classico",
    name: "PACOTINHO CLÁSSICO",
    description: "4 figurinhas com 1 INCOMUM ou superior garantida.",
    collection: "fundador",
    priceCoins: 250,
    cardsCount: 4,
    guaranteedRarity: "INCOMUM",
    themeColor: "#1d4ed8",
    badge: "250 🪙",
  },
  {
    id: "ouro",
    name: "PACOTÃO OURO",
    description: "5 figurinhas com no mínimo 1 RARA garantida!",
    collection: "fundador",
    priceCoins: 500,
    cardsCount: 5,
    guaranteedRarity: "RARA",
    themeColor: "#d97706",
    badge: "500 🪙",
  },
  {
    id: "lendas_90s",
    name: "CAIXA LENDAS 90s",
    description: "A joia da banca! 5 cartas, 10% de chance de LENDA e 1 RARA garantida.",
    collection: "fundador",
    priceCoins: 1500,
    cardsCount: 5,
    guaranteedRarity: "RARA",
    themeColor: "#ffd60a",
    badge: "120 🟡 / 1.500 🪙",
    altPrice: {
      currency: "fichasOuro",
      amount: 120,
    },
  },
];

// ==========================================
// 5. CARTEIRA E PERSISTÊNCIA
// ==========================================
const INITIAL_WALLET: PlayerWallet = {
  coins: 300,
  contos: 300,
  fichasOuro: 0,
  lastDailyClaim: null,
  packsOpened: 0,
  tradesCompleted: 0,
};

export function getPlayerWallet(): PlayerWallet {
  const stored = readJSON<any>(LS_WALLET_KEY);
  if (!stored) {
    writeJSON(LS_WALLET_KEY, INITIAL_WALLET);
    return INITIAL_WALLET;
  }
  // Migração transparente de versão anterior (coins -> contos)
  const contos = stored.contos ?? stored.coins ?? 300;
  const wallet: PlayerWallet = {
    coins: contos,
    contos: contos,
    fichasOuro: stored.fichasOuro ?? 0,
    lastDailyClaim: stored.lastDailyClaim ?? null,
    packsOpened: stored.packsOpened ?? 0,
    tradesCompleted: stored.tradesCompleted ?? 0,
  };
  return wallet;
}

export function updatePlayerWallet(updater: (prev: PlayerWallet) => PlayerWallet): PlayerWallet {
  const current = getPlayerWallet();
  const next = updater(current);
  // Sincroniza sempre coins e contos
  const synchronized: PlayerWallet = {
    ...next,
    coins: next.contos,
  };
  writeJSON(LS_WALLET_KEY, synchronized);
  return synchronized;
}

export function canAfford(wallet: Wallet, currency: CurrencyType, amount: number): boolean {
  return (wallet[currency] ?? 0) >= amount;
}

export function deductFunds(wallet: Wallet, currency: CurrencyType, amount: number): Wallet {
  if (!canAfford(wallet, currency, amount)) {
    throw new Error(`Saldo insuficiente de ${currency}.`);
  }
  return {
    ...wallet,
    [currency]: wallet[currency] - amount,
  };
}

export function addCoins(amount: number): PlayerWallet {
  return updatePlayerWallet((prev) => ({
    ...prev,
    contos: Math.max(0, prev.contos + amount),
    coins: Math.max(0, prev.contos + amount),
  }));
}

export function deductCoins(amount: number): boolean {
  const current = getPlayerWallet();
  if (current.contos < amount) return false;
  updatePlayerWallet((prev) => ({
    ...prev,
    contos: prev.contos - amount,
    coins: prev.contos - amount,
  }));
  return true;
}

export function addFichasOuro(amount: number): PlayerWallet {
  return updatePlayerWallet((prev) => ({
    ...prev,
    fichasOuro: Math.max(0, prev.fichasOuro + amount),
  }));
}

// ==========================================
// 6. TRACKER DO SISTEMA DE PITY (DÓ)
// ==========================================
const DEFAULT_PITY: PlayerPityTracker = {
  packsSinceLastLenda: 0,
  thresholdLendaGuarantee: 35,
};

export function getPlayerPityTracker(): PlayerPityTracker {
  const stored = readJSON<PlayerPityTracker>(LS_PITY_KEY);
  if (!stored) {
    writeJSON(LS_PITY_KEY, DEFAULT_PITY);
    return DEFAULT_PITY;
  }
  return {
    packsSinceLastLenda: stored.packsSinceLastLenda ?? 0,
    thresholdLendaGuarantee: stored.thresholdLendaGuarantee ?? 35,
  };
}

export function savePlayerPityTracker(pity: PlayerPityTracker): void {
  writeJSON(LS_PITY_KEY, pity);
}

// ==========================================
// 7. DESCARTE E RECICLAGEM
// ==========================================
export function recycleCards(
  wallet: Wallet,
  cardsToRecycle: { rarity: CardRarity }[]
): CardRecycleResult {
  const contosEarned = cardsToRecycle.reduce((acc, card) => {
    return acc + (RECYCLE_VALUES[card.rarity] || 0);
  }, 0);

  return {
    soldCardsCount: cardsToRecycle.length,
    contosEarned,
    updatedWallet: {
      ...wallet,
      contos: wallet.contos + contosEarned,
    },
  };
}

// ==========================================
// 8. MOTOR DE SORTEIO COM PITY
// ==========================================
export function rollRarity(
  odds: PackConfig["odds"],
  forceLenda = false,
  minimumRarity?: CardRarity
): CardRarity {
  if (forceLenda) return "LENDA";

  const rand = Math.random();
  let cumulative = 0;
  const order: CardRarity[] = ["LENDA", "RARA", "INCOMUM", "COMUM"];
  let selectedRarity: CardRarity = "COMUM";

  for (const rarity of order) {
    cumulative += odds[rarity];
    if (rand <= cumulative) {
      selectedRarity = rarity;
      break;
    }
  }

  if (minimumRarity) {
    const rarityRank: Record<CardRarity, number> = {
      COMUM: 1,
      INCOMUM: 2,
      RARA: 3,
      LENDA: 4,
    };
    if (rarityRank[selectedRarity] < rarityRank[minimumRarity]) {
      selectedRarity = minimumRarity;
    }
  }

  return selectedRarity;
}

// Sorteia carta concreta do catálogo a partir da raridade com proteção Anti-Clone (sem cartas idênticas no mesmo pacote)
export function drawCardByRarity(
  rarity: CardRarity,
  excludeIds?: Set<string>
): CatalogCard {
  const allCards = getMasterCatalog();
  const nonExclusive = allCards.filter((c) => !checkIsCardExclusive(c.id));
  const poolBase = nonExclusive.length > 0 ? nonExclusive : allCards;

  // Filtra por raridade excluindo IDs já sorteados neste pacote
  let pool = poolBase.filter(
    (c) => c.rarity === rarity && (!excludeIds || !excludeIds.has(c.id))
  );

  // Fallback 1: se esgotar as cartas não sorteadas dessa raridade, pega qualquer uma dessa raridade
  if (pool.length === 0) {
    pool = poolBase.filter((c) => c.rarity === rarity);
  }

  // Fallback 2: se a raridade estiver vazia no catálogo, pega qualquer carta não sorteada
  if (pool.length === 0) {
    pool = poolBase.filter((c) => !excludeIds || !excludeIds.has(c.id));
    if (pool.length === 0) pool = poolBase;
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

// ==========================================
// 9. ABERTURA DE PACOTE (TRANSAÇÃO OFICIAL POR SLOTS)
// ==========================================
export function openPackTransaction(
  wallet: Wallet,
  packTier: PackTier,
  pity: PlayerPityTracker,
  catalogPullFn?: (rarity: CardRarity, excludeIds?: Set<string>) => any,
  useAlternativeCurrency = false
): OpenPackResult {
  const pack = PACK_CATALOG[packTier];
  if (!pack) throw new Error(`Pacote não encontrado: ${packTier}`);

  let updatedWallet = { ...wallet };
  let costPaid: { currency: CurrencyType; amount: number } | null = null;

  // Se não for diário grátis, debita a moeda correspondente
  if (!pack.isDailyFree) {
    const payment =
      useAlternativeCurrency && pack.altPrice ? pack.altPrice : pack.price;
    updatedWallet = deductFunds(wallet, payment.currency, payment.amount);
    costPaid = payment;
  }

  const isPityTriggered =
    pity.packsSinceLastLenda >= pity.thresholdLendaGuarantee;

  const blueprint = PACK_SLOT_BLUEPRINTS[packTier];
  const cardCount = blueprint ? blueprint.slots.length : pack.cardCount;

  const cards: any[] = [];
  const packCardIds = new Set<string>();
  let pulledLenda = false;

  for (let i = 0; i < cardCount; i++) {
    const isClimaxSlot = i === cardCount - 1;
    // O pity só força a Lenda se for o último slot (o clímax) e nenhuma lenda saiu ainda
    const forceLendaOnThisSlot = isClimaxSlot && isPityTriggered && !pulledLenda;

    let rarity: CardRarity;

    if (forceLendaOnThisSlot) {
      rarity = "LENDA";
    } else if (blueprint && blueprint.slots[i]) {
      // Rola com as odds exatas do slot configurado
      const slotOdds = blueprint.slots[i];
      rarity = rollRarity(slotOdds, false);
    } else {
      rarity = rollRarity(
        pack.odds,
        false,
        isClimaxSlot ? pack.guaranteedRarity : undefined
      );
    }

    // Regra de Ouro: Teto de no máximo 1 Lenda por pacote
    if (rarity === "LENDA") {
      if (pulledLenda) {
        // Se por algum motivo já havia saído uma Lenda, rebaixa para RARA
        rarity = "RARA";
      } else {
        pulledLenda = true;
      }
    }

    // Puxa a carta concreta com garantia Anti-Clone
    const card = catalogPullFn
      ? catalogPullFn(rarity, packCardIds)
      : drawCardByRarity(rarity, packCardIds);

    if (card && card.id) {
      packCardIds.add(card.id);
    }
    cards.push(card);
  }

  const updatedPity: PlayerPityTracker = {
    ...pity,
    packsSinceLastLenda: pulledLenda
      ? 0
      : pity.packsSinceLastLenda + pack.pityWeight,
  };

  return {
    cards,
    costPaid,
    updatedWallet,
    updatedPity,
    hasLenda: pulledLenda,
  };
}

// ==========================================
// 10. RECURSOS DO INVENTÁRIO DO JOGADOR
// ==========================================
function getInitialInventory(): Record<string, number> {
  const catalog = getMasterCatalog();
  const initial: Record<string, number> = {};
  const sampleIndices = [0, 4, 12, 22, 33, 45];
  sampleIndices.forEach((idx) => {
    if (catalog[idx]) {
      initial[catalog[idx].id] = 1;
    }
  });
  return initial;
}

export function getPlayerInventory(): Record<string, number> {
  const stored = readJSON<Record<string, number>>(LS_INVENTORY_KEY);
  if (!stored) {
    const initial = getInitialInventory();
    writeJSON(LS_INVENTORY_KEY, initial);
    return initial;
  }
  return stored;
}

export function getInventoryItems(): InventoryItem[] {
  const inv = getPlayerInventory();
  return Object.entries(inv)
    .filter(([_, qty]) => qty > 0)
    .map(([cardId, totalOwned]) => ({
      cardId,
      totalOwned,
      isGluedToAlbum: totalOwned >= 1,
      duplicatesCount: Math.max(0, totalOwned - 1),
    }));
}

export function getDuplicatesList(): {
  card: CatalogCard;
  duplicatesCount: number;
  sellPrice: number;
}[] {
  const items = getInventoryItems();
  const duplicates: {
    card: CatalogCard;
    duplicatesCount: number;
    sellPrice: number;
  }[] = [];

  for (const item of items) {
    if (item.duplicatesCount > 0) {
      const card = getCardById(item.cardId);
      if (card) {
        duplicates.push({
          card,
          duplicatesCount: item.duplicatesCount,
          sellPrice: RECYCLE_VALUES[card.rarity] ?? card.marketValue,
        });
      }
    }
  }

  return duplicates;
}

export function addCardToInventory(
  cardId: string,
  count = 1
): { total: number; wasNewInAlbum: boolean } {
  const inv = getPlayerInventory();
  const prevCount = inv[cardId] ?? 0;
  const wasNewInAlbum = prevCount === 0;
  inv[cardId] = prevCount + count;
  writeJSON(LS_INVENTORY_KEY, inv);
  return { total: inv[cardId], wasNewInAlbum };
}

export function removeDuplicateCard(cardId: string): boolean {
  const inv = getPlayerInventory();
  const count = inv[cardId] ?? 0;
  if (count <= 1) return false;
  inv[cardId] = count - 1;
  writeJSON(LS_INVENTORY_KEY, inv);
  return true;
}

export function sellDuplicateCard(cardId: string): {
  success: boolean;
  earnedCoins: number;
  error?: string;
} {
  if (checkIsCardExclusive(cardId)) {
    return {
      success: false,
      earnedCoins: 0,
      error: "Figurinhas exclusivas de apoiadores não podem ser vendidas!",
    };
  }

  const card = getCardById(cardId);
  if (!card)
    return {
      success: false,
      earnedCoins: 0,
      error: "Figurinha não encontrada.",
    };

  const removed = removeDuplicateCard(cardId);
  if (!removed)
    return {
      success: false,
      earnedCoins: 0,
      error: "Não é possível vender a única cópia do álbum.",
    };

  const earned = RECYCLE_VALUES[card.rarity] ?? card.marketValue;
  addCoins(earned);
  return { success: true, earnedCoins: earned };
}

// ==========================================
// 11. CONTROLE DO PACOTE DIÁRIO GRÁTIS
// ==========================================
export function canClaimDailyFree(): { canClaim: boolean; msRemaining: number } {
  const wallet = getPlayerWallet();
  if (!wallet.lastDailyClaim) return { canClaim: true, msRemaining: 0 };

  const DAY_MS = 24 * 60 * 60 * 1000;
  const elapsed = Date.now() - wallet.lastDailyClaim;
  if (elapsed >= DAY_MS) {
    return { canClaim: true, msRemaining: 0 };
  }
  return { canClaim: false, msRemaining: DAY_MS - elapsed };
}

// ==========================================
// 12. ABERTURA DE PACOTE VIA UI (PACK SHOP)
// ==========================================
export function openPack(
  packId: string,
  useAlternativeCurrency = false
): {
  success: boolean;
  error?: string;
  cards: { card: CatalogCard; wasNewInAlbum: boolean }[];
} {
  // Mapeamento de compatibilidade para tiers oficiais
  let tier: PackTier;
  if (packId === "daily_free" || packId === "diario") {
    tier = "diario";
  } else if (packId === "classic_pack" || packId === "varzea") {
    tier = "varzea";
  } else if (packId === "classico") {
    tier = "classico";
  } else if (packId === "premium_pack" || packId === "ouro") {
    tier = "ouro";
  } else if (packId === "lendas_90s") {
    tier = "lendas_90s";
  } else {
    tier = "varzea";
  }

  const packConfig = PACK_CATALOG[tier];
  if (!packConfig) {
    return { success: false, error: "Pacote não encontrado", cards: [] };
  }

  if (packConfig.isDailyFree) {
    const { canClaim } = canClaimDailyFree();
    if (!canClaim) {
      return {
        success: false,
        error: "Aguarde o tempo de recarga do pacote diário!",
        cards: [],
      };
    }
  }

  const currentWallet = getPlayerWallet();
  const pity = getPlayerPityTracker();

  // Verifica saldo antes de tentar transacionar
  const payment =
    useAlternativeCurrency && packConfig.altPrice
      ? packConfig.altPrice
      : packConfig.price;

  if (!packConfig.isDailyFree && !canAfford(currentWallet, payment.currency, payment.amount)) {
    const moedaLabel = payment.currency === "contos" ? "Conto" : "Fichas de Ouro";
    return {
      success: false,
      error: `Saldo insuficiente de ${moedaLabel}!`,
      cards: [],
    };
  }

  try {
    const result = openPackTransaction(
      currentWallet,
      tier,
      pity,
      (rarity, excludeIds) => drawCardByRarity(rarity, excludeIds),
      useAlternativeCurrency
    );

    // Persiste pity atualizado
    savePlayerPityTracker(result.updatedPity);

    // Persiste carteira e estatísticas
    updatePlayerWallet((prev) => ({
      ...prev,
      contos: result.updatedWallet.contos,
      fichasOuro: result.updatedWallet.fichasOuro,
      coins: result.updatedWallet.contos,
      lastDailyClaim: packConfig.isDailyFree ? Date.now() : prev.lastDailyClaim,
      packsOpened: prev.packsOpened + 1,
    }));

    // Adiciona cartas ao inventário
    const drawn: { card: CatalogCard; wasNewInAlbum: boolean }[] = [];
    for (const card of result.cards) {
      const { wasNewInAlbum } = addCardToInventory(card.id, 1);
      drawn.push({ card, wasNewInAlbum });
    }

    return { success: true, cards: drawn };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Erro ao abrir pacote", cards: [] };
  }
}

// ==========================================
// 13. MERCADO E ANÚNCIOS P2P
// ==========================================
function getSeedMarketplaceListings(): TradeListing[] {
  const catalog = getMasterCatalog();
  const sellerNames = [
    "Nostalgic90",
    "AllejoFan",
    "CanhotaDeOuro",
    "ReiDoDrible",
    "ZicoDoArcade",
  ];
  const avatars = ["av1", "av2", "av3", "av4", "av5"];

  return [
    {
      id: "listing-seed-1",
      sellerId: "seller-1",
      sellerNickname: sellerNames[0],
      sellerAvatar: avatars[0],
      offeredCardId: catalog[10]?.id ?? "P-LD-1",
      requestedCardId: catalog[2]?.id ?? "P-GOL-2",
      priceCoins: 60,
      createdAt: Date.now() - 3600000,
      status: "active",
    },
    {
      id: "listing-seed-2",
      sellerId: "seller-2",
      sellerNickname: sellerNames[1],
      sellerAvatar: avatars[1],
      offeredCardId: catalog[47]?.id ?? "AI-ATA-1",
      requestedCardId: null,
      priceCoins: 220,
      createdAt: Date.now() - 7200000,
      status: "active",
    },
    {
      id: "listing-seed-3",
      sellerId: "seller-3",
      sellerNickname: sellerNames[2],
      sellerAvatar: avatars[2],
      offeredCardId: catalog[22]?.id ?? "P-LE-1",
      requestedCardId: null,
      priceCoins: 85,
      createdAt: Date.now() - 14400000,
      status: "active",
    },
  ];
}

export function getMarketListings(): TradeListing[] {
  const stored = readJSON<TradeListing[]>(LS_MARKET_LISTINGS_KEY);
  if (!stored || stored.length === 0) {
    const seeds = getSeedMarketplaceListings();
    writeJSON(LS_MARKET_LISTINGS_KEY, seeds);
    return seeds;
  }
  return stored;
}

export function createTradeListing(
  sellerId: string,
  sellerNickname: string,
  sellerAvatar: string,
  offeredCardId: string,
  priceCoins: number | null,
  requestedCardId: string | null = null
): { success: boolean; error?: string } {
  if (checkIsCardExclusive(offeredCardId)) {
    return {
      success: false,
      error:
        "Figurinhas exclusivas de apoiadores não podem ser trocadas ou anunciadas no mercado!",
    };
  }

  const inv = getPlayerInventory();
  if ((inv[offeredCardId] ?? 0) < 2) {
    return {
      success: false,
      error: "Você só pode negociar figurinhas repetidas!",
    };
  }

  removeDuplicateCard(offeredCardId);

  const listing: TradeListing = {
    id: `listing-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    sellerId,
    sellerNickname,
    sellerAvatar,
    offeredCardId,
    requestedCardId,
    priceCoins,
    createdAt: Date.now(),
    status: "active",
  };

  const current = getMarketListings();
  current.unshift(listing);
  writeJSON(LS_MARKET_LISTINGS_KEY, current);
  return { success: true };
}

export function buyMarketListing(
  listingId: string,
  buyerId: string
): { success: boolean; error?: string } {
  const listings = getMarketListings();
  const listing = listings.find((l) => l.id === listingId && l.status === "active");
  if (!listing)
    return { success: false, error: "Anúncio não encontrado ou já finalizado." };
  if (listing.sellerId === buyerId) {
    return { success: false, error: "Você não pode comprar sua própria oferta!" };
  }

  if (listing.priceCoins && listing.priceCoins > 0) {
    const paid = deductCoins(listing.priceCoins);
    if (!paid)
      return { success: false, error: "Moedas insuficientes para esta compra." };
  }

  addCardToInventory(listing.offeredCardId, 1);
  listing.status = "completed";
  writeJSON(LS_MARKET_LISTINGS_KEY, listings);

  updatePlayerWallet((prev) => ({
    ...prev,
    tradesCompleted: prev.tradesCompleted + 1,
  }));

  return { success: true };
}
