import { buildDeck } from "../data";
import type { Card } from "../types";
import { type CatalogCard, getCardRarity, RARITY_CONFIG } from "./economyTypes";

let catalogCache: CatalogCard[] | null = null;

export function getMasterCatalog(): CatalogCard[] {
  if (catalogCache) return catalogCache;

  const pCards = buildDeck("P");
  const aiCards = buildDeck("AI");
  const allRawCards: Card[] = [...pCards, ...aiCards];

  const catalog: CatalogCard[] = allRawCards.map((card, idx) => {
    const rarity = getCardRarity(card.ovr);
    const sellPrice = RARITY_CONFIG[rarity].sellPrice;
    return {
      ...card,
      slotNumber: idx + 1,
      collection: "fundador",
      rarity,
      marketValue: sellPrice,
    };
  });

  catalogCache = catalog;
  return catalog;
}

export function getCardById(cardId: string): CatalogCard | null {
  const catalog = getMasterCatalog();
  return catalog.find((c) => c.id === cardId) ?? null;
}

export function getCardsByCollection(collection: string): CatalogCard[] {
  const catalog = getMasterCatalog();
  return catalog.filter((c) => c.collection === collection);
}
