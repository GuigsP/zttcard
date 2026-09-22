import { readJSON, writeJSON } from "../storage";
import { getMasterCatalog, getCardById } from "./cardCatalog";
import { checkIsCardExclusive } from "../cardsRepo";
import type {
  CardRarity,
  CatalogCard,
  InventoryItem,
  PackProduct,
  PlayerWallet,
  TradeListing,
} from "./economyTypes";

const LS_WALLET_KEY = "ztt.economy.wallet";
const LS_INVENTORY_KEY = "ztt.economy.inventory";
const LS_MARKET_LISTINGS_KEY = "ztt.economy.marketListings";

const INITIAL_WALLET: PlayerWallet = {
  coins: 300,
  lastDailyClaim: null,
  packsOpened: 0,
  tradesCompleted: 0,
};

// Initial starter collection: 6 random cards glued to the album so the player starts with something
function getInitialInventory(): Record<string, number> {
  const catalog = getMasterCatalog();
  const initial: Record<string, number> = {};
  // Give 6 starter cards
  const sampleIndices = [0, 4, 12, 22, 33, 45];
  sampleIndices.forEach((idx) => {
    if (catalog[idx]) {
      initial[catalog[idx].id] = 1;
    }
  });
  return initial;
}

export function getPlayerWallet(): PlayerWallet {
  const stored = readJSON<PlayerWallet>(LS_WALLET_KEY);
  if (!stored) {
    writeJSON(LS_WALLET_KEY, INITIAL_WALLET);
    return INITIAL_WALLET;
  }
  return stored;
}

export function updatePlayerWallet(updater: (prev: PlayerWallet) => PlayerWallet): PlayerWallet {
  const current = getPlayerWallet();
  const updated = updater(current);
  writeJSON(LS_WALLET_KEY, updated);
  return updated;
}

export function addCoins(amount: number): PlayerWallet {
  return updatePlayerWallet((prev) => ({
    ...prev,
    coins: Math.max(0, prev.coins + amount),
  }));
}

export function deductCoins(amount: number): boolean {
  const current = getPlayerWallet();
  if (current.coins < amount) return false;
  updatePlayerWallet((prev) => ({
    ...prev,
    coins: prev.coins - amount,
  }));
  return true;
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

export function getDuplicatesList(): { card: CatalogCard; duplicatesCount: number; sellPrice: number }[] {
  const items = getInventoryItems();
  const duplicates: { card: CatalogCard; duplicatesCount: number; sellPrice: number }[] = [];

  for (const item of items) {
    if (item.duplicatesCount > 0) {
      const card = getCardById(item.cardId);
      if (card) {
        duplicates.push({
          card,
          duplicatesCount: item.duplicatesCount,
          sellPrice: card.marketValue,
        });
      }
    }
  }

  return duplicates;
}

export function addCardToInventory(cardId: string, count = 1): { total: number; wasNewInAlbum: boolean } {
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
  // CANNOT remove or sell if count <= 1 (1st copy is glued to album!)
  if (count <= 1) return false;
  inv[cardId] = count - 1;
  writeJSON(LS_INVENTORY_KEY, inv);
  return true;
}

export function sellDuplicateCard(cardId: string): { success: boolean; earnedCoins: number; error?: string } {
  if (checkIsCardExclusive(cardId)) {
    return {
      success: false,
      earnedCoins: 0,
      error: "Figurinhas exclusivas de apoiadores não podem ser vendidas!",
    };
  }

  const card = getCardById(cardId);
  if (!card) return { success: false, earnedCoins: 0, error: "Figurinha não encontrada." };

  const removed = removeDuplicateCard(cardId);
  if (!removed) return { success: false, earnedCoins: 0, error: "Não é possível vender a única cópia do álbum." };

  addCoins(card.marketValue);
  return { success: true, earnedCoins: card.marketValue };
}

// Available Store Packs
export const STORE_PACKS: PackProduct[] = [
  {
    id: "daily_free",
    name: "PACOTE DIÁRIO GRÁTIS",
    description: "Contém 3 figurinhas sortidas. Resgate a cada 24 horas!",
    collection: "fundador",
    priceCoins: 0,
    cardsCount: 3,
    isDailyFree: true,
    themeColor: "#0d8f3f",
    badge: "FREE",
  },
  {
    id: "classic_pack",
    name: "PACOTE CLÁSSICO",
    description: "3 figurinhas da coleção Fundador. Chance de Raras e Lendárias!",
    collection: "fundador",
    priceCoins: 100,
    cardsCount: 3,
    themeColor: "#002868",
    badge: "100 🪙",
  },
  {
    id: "premium_pack",
    name: "PACOTE OURO (5 CARTAS)",
    description: "5 figurinhas com pelo menos 1 RARA ou LENDÁRIA garantida!",
    collection: "fundador",
    priceCoins: 250,
    cardsCount: 5,
    guaranteedRarity: "RARA",
    themeColor: "#ffd60a",
    badge: "250 🪙",
  },
];

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

// Drop rate draw algorithm (Blindagem: cartas exclusivas nunca caem em pacotes comuns da banca)
function drawRandomCard(guaranteedRarity?: CardRarity): CatalogCard {
  const allCards = getMasterCatalog();
  const catalog = allCards.filter((c) => !checkIsCardExclusive(c.id));
  const poolBase = catalog.length > 0 ? catalog : allCards;

  if (guaranteedRarity) {
    const pool = poolBase.filter((c) => c.rarity === guaranteedRarity);
    if (pool.length > 0) {
      return pool[Math.floor(Math.random() * pool.length)];
    }
  }

  const roll = Math.random() * 100;
  let targetRarity: "LENDA" | "RARA" | "INCOMUM" | "COMUM";
  if (roll < 4) targetRarity = "LENDA"; // 4%
  else if (roll < 18) targetRarity = "RARA"; // 14%
  else if (roll < 45) targetRarity = "INCOMUM"; // 27%
  else targetRarity = "COMUM"; // 55%

  const pool = poolBase.filter((c) => c.rarity === targetRarity);
  if (pool.length > 0) {
    return pool[Math.floor(Math.random() * pool.length)];
  }
  return poolBase[Math.floor(Math.random() * poolBase.length)];
}

export function openPack(packId: string): {
  success: boolean;
  error?: string;
  cards: { card: CatalogCard; wasNewInAlbum: boolean }[];
} {
  const pack = STORE_PACKS.find((p) => p.id === packId);
  if (!pack) return { success: false, error: "Pacote não encontrado", cards: [] };

  if (pack.isDailyFree) {
    const { canClaim } = canClaimDailyFree();
    if (!canClaim) {
      return { success: false, error: "Aguarde o tempo de recarga do pacote diário!", cards: [] };
    }
    updatePlayerWallet((prev) => ({
      ...prev,
      lastDailyClaim: Date.now(),
      packsOpened: prev.packsOpened + 1,
    }));
  } else {
    const paid = deductCoins(pack.priceCoins);
    if (!paid) {
      return { success: false, error: "Moedas ZTT insuficientes!", cards: [] };
    }
    updatePlayerWallet((prev) => ({
      ...prev,
      packsOpened: prev.packsOpened + 1,
    }));
  }

  const drawn: { card: CatalogCard; wasNewInAlbum: boolean }[] = [];
  for (let i = 0; i < pack.cardsCount; i++) {
    const isGuaranteed = i === 0 && !!pack.guaranteedRarity;
    const card = drawRandomCard(isGuaranteed ? pack.guaranteedRarity : undefined);
    const { wasNewInAlbum } = addCardToInventory(card.id, 1);
    drawn.push({ card, wasNewInAlbum });
  }

  return { success: true, cards: drawn };
}

// --- Marketplace & Trading Listings ---

function getSeedMarketplaceListings(): TradeListing[] {
  const catalog = getMasterCatalog();
  const sellerNames = ["Nostalgic90", "AllejoFan", "CanhotaDeOuro", "ReiDoDrible", "ZicoDoArcade"];
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
      offeredCardId: catalog[47]?.id ?? "AI-ATA-1", // Allejo
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
  requestedCardId: string | null = null,
): { success: boolean; error?: string } {
  if (checkIsCardExclusive(offeredCardId)) {
    return {
      success: false,
      error: "Figurinhas exclusivas de apoiadores não podem ser trocadas ou anunciadas no mercado!",
    };
  }

  // Verify seller actually owns at least 2 copies (only duplicates can be listed)
  const inv = getPlayerInventory();
  if ((inv[offeredCardId] ?? 0) < 2) {
    return { success: false, error: "Você só pode negociar figurinhas repetidas!" };
  }

  // Deduct 1 duplicate from inventory while it is on the market
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
  buyerId: string,
): { success: boolean; error?: string } {
  const listings = getMarketListings();
  const listing = listings.find((l) => l.id === listingId && l.status === "active");
  if (!listing) return { success: false, error: "Anúncio não encontrado ou já finalizado." };
  if (listing.sellerId === buyerId) {
    return { success: false, error: "Você não pode comprar sua própria oferta!" };
  }

  if (listing.priceCoins && listing.priceCoins > 0) {
    const paid = deductCoins(listing.priceCoins);
    if (!paid) return { success: false, error: "Moedas insuficientes para esta compra." };
  }

  // Add offered card to buyer inventory
  addCardToInventory(listing.offeredCardId, 1);

  // Update listing status
  listing.status = "completed";
  writeJSON(LS_MARKET_LISTINGS_KEY, listings);

  // Increment wallet trades
  updatePlayerWallet((prev) => ({
    ...prev,
    tradesCompleted: prev.tradesCompleted + 1,
  }));

  return { success: true };
}
