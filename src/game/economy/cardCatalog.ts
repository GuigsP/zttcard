import { buildDeck } from "../data";
import type { Card, AttrKey } from "../types";
import { type CatalogCard, getCardRarity, RARITY_CONFIG } from "./economyTypes";
import { getCachedCards, checkIsCardExclusive } from "../cardsRepo";

export function getMasterCatalog(): CatalogCard[] {
  const dbCards = getCachedCards();
  if (dbCards && dbCards.length > 0) {
    return dbCards.map((card, idx) => {
      const rarity = getCardRarity(card.ovr);
      const sellPrice = RARITY_CONFIG[rarity].sellPrice;
      const cardId = card.legacy_id ?? card.id;
      return {
        id: cardId,
        name: card.name,
        position: card.position,
        ovr: card.ovr,
        attrs: card.attrs as Partial<Record<AttrKey, number>>,
        quote: card.quote ?? "",
        cardNumber: card.card_number ?? idx + 1,
        slotNumber: card.card_number ?? idx + 1,
        collection: card.pack_ids?.[0] ?? "fundador",
        rarity,
        marketValue: sellPrice,
        isExclusive: checkIsCardExclusive(cardId),
      };
    });
  }

  const pCards = buildDeck("P");
  const aiCards = buildDeck("AI");
  const allRawCards: Card[] = [...pCards, ...aiCards];

  return allRawCards.map((card, idx) => {
    const rarity = getCardRarity(card.ovr);
    const sellPrice = RARITY_CONFIG[rarity].sellPrice;
    return {
      ...card,
      slotNumber: idx + 1,
      collection: "fundador",
      rarity,
      marketValue: sellPrice,
      isExclusive: checkIsCardExclusive(card.id),
    };
  });
}

export function getCardById(cardId: string): CatalogCard | null {
  const catalog = getMasterCatalog();
  return catalog.find((c) => c.id === cardId) ?? null;
}

export function getCardsByCollection(collection: string): CatalogCard[] {
  const catalog = getMasterCatalog();
  return catalog.filter((c) => c.collection === collection);
}
