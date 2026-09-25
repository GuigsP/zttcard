import type { Card } from "../types";

// ==========================================
// 1. TIPOS BÁSICOS DE ECONOMIA E MOEDAS
// ==========================================

export type CurrencyType = "contos" | "fichasOuro";

export type CardRarity = "COMUM" | "INCOMUM" | "RARA" | "LENDA";

export interface Wallet {
  contos: number; // Moeda farmável jogando partidas
  fichasOuro: number; // Moeda premium adquirida com dinheiro real (R$)
}

// Compatibilidade estendida para componentes legados e persistência de dados
export interface PlayerWallet extends Wallet {
  coins: number; // Mapeado 1:1 para contos para manter retrocompatibilidade
  lastDailyClaim: number | null; // timestamp ms
  packsOpened: number;
  tradesCompleted: number;
}

// ==========================================
// 2. CONFIGURAÇÃO VISUAL E DE OVR POR RARIDADE
// ==========================================

export const RARITY_CONFIG: Record<
  CardRarity,
  {
    label: string;
    badgeBg: string;
    badgeFg: string;
    borderColor: string;
    glowClass: string;
    minOvr: number;
    maxOvr: number;
    sellPrice: number;
  }
> = {
  COMUM: {
    label: "COMUM",
    badgeBg: "#64748b",
    badgeFg: "#f8fafc",
    borderColor: "#475569",
    glowClass: "border-slate-500",
    minOvr: 50,
    maxOvr: 72,
    sellPrice: 6,
  },
  INCOMUM: {
    label: "INCOMUM",
    badgeBg: "#0d8f3f",
    badgeFg: "#ffffff",
    borderColor: "#16a34a",
    glowClass: "border-green-500 shadow-[0_0_12px_rgba(34,197,94,0.4)]",
    minOvr: 73,
    maxOvr: 82,
    sellPrice: 20,
  },
  RARA: {
    label: "RARA",
    badgeBg: "#2563eb",
    badgeFg: "#ffffff",
    borderColor: "#3b82f6",
    glowClass: "border-blue-500 shadow-[0_0_16px_rgba(59,130,246,0.6)]",
    minOvr: 83,
    maxOvr: 89,
    sellPrice: 70,
  },
  LENDA: {
    label: "LENDA",
    badgeBg: "#ffd60a",
    badgeFg: "#0a0f1f",
    borderColor: "#eab308",
    glowClass: "border-yellow-400 shadow-[0_0_24px_rgba(250,204,21,0.8)] animate-pulse",
    minOvr: 90,
    maxOvr: 99,
    sellPrice: 250,
  },
};

export function getCardRarity(ovr: number): CardRarity {
  if (ovr >= 90) return "LENDA";
  if (ovr >= 83) return "RARA";
  if (ovr >= 73) return "INCOMUM";
  return "COMUM";
}

// ==========================================
// 3. ESTRUTURAS DO CATÁLOGO E INVENTÁRIO
// ==========================================

export type CatalogCard = Card & {
  slotNumber: number;
  collection: string;
  rarity: CardRarity;
  marketValue: number;
  isExclusive?: boolean;
};

export type InventoryItem = {
  cardId: string;
  totalOwned: number; // >= 1
  isGluedToAlbum: boolean; // always true if totalOwned >= 1
  duplicatesCount: number; // totalOwned - 1
};

// ==========================================
// 4. SISTEMA DE PACOTES, CHANCES E PITY
// ==========================================

export type PackTier = "diario" | "varzea" | "classico" | "ouro" | "lendas_90s";

export interface PackOdds {
  COMUM: number;
  INCOMUM: number;
  RARA: number;
  LENDA: number;
}

export interface PackConfig {
  id: PackTier;
  title: string;
  subtitle: string;
  cardCount: number;
  price: {
    currency: CurrencyType;
    amount: number;
  };
  altPrice?: {
    currency: CurrencyType;
    amount: number;
  };
  odds: PackOdds;
  guaranteedRarity?: CardRarity;
  pityWeight: number;
  isDailyFree?: boolean;
}

export interface PlayerPityTracker {
  packsSinceLastLenda: number;
  thresholdLendaGuarantee: number;
}

// Representação de pacote para componentes de UI
export type PackProduct = {
  id: string;
  name: string;
  description: string;
  collection: string;
  priceCoins: number;
  cardsCount: number;
  isDailyFree?: boolean;
  guaranteedRarity?: CardRarity;
  themeColor: string;
  badge: string;
  altPrice?: {
    currency: CurrencyType;
    amount: number;
  };
};

// ==========================================
// 5. LOJA DE CRÉDITOS R$ E RESULTADOS DE TRANSAÇÃO
// ==========================================

export interface RealMoneyOffer {
  id: string;
  title: string;
  description?: string;
  fichasOuroAwarded: number;
  bonusFichasOuro: number;
  priceBRL: number;
  isPopular?: boolean;
}

export interface CardRecycleResult {
  soldCardsCount: number;
  contosEarned: number;
  updatedWallet: Wallet;
}

export interface OpenPackResult {
  cards: any[];
  costPaid: {
    currency: CurrencyType;
    amount: number;
  } | null;
  updatedWallet: Wallet;
  updatedPity: PlayerPityTracker;
  hasLenda: boolean;
}

// ==========================================
// 6. MERCADO E TROCAS P2P
// ==========================================

export type TradeListing = {
  id: string;
  sellerId: string;
  sellerNickname: string;
  sellerAvatar: string;
  offeredCardId: string;
  requestedCardId: string | null; // null = open to any or coin sale
  priceCoins: number | null; // null = card trade only
  createdAt: number;
  status: "active" | "completed" | "cancelled";
};
