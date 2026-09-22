import type { Card } from "../types";

export type CardRarity = "COMUM" | "INCOMUM" | "RARA" | "LENDA";

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
    sellPrice: 15,
  },
  INCOMUM: {
    label: "INCOMUM",
    badgeBg: "#0d8f3f",
    badgeFg: "#ffffff",
    borderColor: "#16a34a",
    glowClass: "border-green-500 shadow-[0_0_12px_rgba(34,197,94,0.4)]",
    minOvr: 73,
    maxOvr: 82,
    sellPrice: 35,
  },
  RARA: {
    label: "RARA",
    badgeBg: "#2563eb",
    badgeFg: "#ffffff",
    borderColor: "#3b82f6",
    glowClass: "border-blue-500 shadow-[0_0_16px_rgba(59,130,246,0.6)]",
    minOvr: 83,
    maxOvr: 89,
    sellPrice: 75,
  },
  LENDA: {
    label: "LENDA",
    badgeBg: "#ffd60a",
    badgeFg: "#0a0f1f",
    borderColor: "#eab308",
    glowClass: "border-yellow-400 shadow-[0_0_24px_rgba(250,204,21,0.8)] animate-pulse",
    minOvr: 90,
    maxOvr: 99,
    sellPrice: 200,
  },
};

export function getCardRarity(ovr: number): CardRarity {
  if (ovr >= 90) return "LENDA";
  if (ovr >= 83) return "RARA";
  if (ovr >= 73) return "INCOMUM";
  return "COMUM";
}

export type CatalogCard = Card & {
  slotNumber: number;
  collection: string;
  rarity: CardRarity;
  marketValue: number;
  isExclusive?: boolean;
};

export type PlayerWallet = {
  coins: number;
  lastDailyClaim: number | null; // timestamp ms
  packsOpened: number;
  tradesCompleted: number;
};

export type InventoryItem = {
  cardId: string;
  totalOwned: number; // >= 1
  isGluedToAlbum: boolean; // always true if totalOwned >= 1
  duplicatesCount: number; // totalOwned - 1
};

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
};

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
