import { buildDeck } from "../data";
import type { Card, AttrKey } from "../types";
import { type CatalogCard, getCardRarity, RARITY_CONFIG } from "./economyTypes";
import { getCachedCards, checkIsCardExclusive, type DBCard } from "../cardsRepo";

export function getMasterCatalog(): CatalogCard[] {
  const dbCards = getCachedCards();
  if (dbCards && dbCards.length > 0) {
    return dbCards
      .filter((c): c is DBCard => Boolean(c && typeof c === "object"))
      .map((card, idx) => {
        const rarity = getCardRarity(card.ovr ?? 70);
        const sellPrice = RARITY_CONFIG[rarity]?.sellPrice ?? 15;
        const cardId = card.legacy_id ?? card.id;
        return {
          id: cardId,
          name: (card.name ?? "").toUpperCase(),
          position: card.position,
          ovr: card.ovr ?? 70,
          attrs: (card.attrs || {}) as Partial<Record<AttrKey, number>>,
          quote: card.quote ?? "",
          cardNumber: card.card_number ?? idx + 1,
          slotNumber: card.card_number ?? idx + 1,
          collection: card.pack_ids?.[0] ?? "fundador",
          rarity,
          marketValue: sellPrice,
          isExclusive: checkIsCardExclusive(cardId),
          imageUrl: card.image_url ?? (card.attrs as any)?._image_url ?? (card.attrs as any)?.image_url ?? null,
          clubBadgeUrl: card.club_badge_url ?? (card.attrs as any)?._club_badge_url ?? (card.attrs as any)?.club_badge_url ?? null,
        };
      });
  }

  const pCards = buildDeck("P");
  const aiCards = buildDeck("AI");
  const allRawCards: Card[] = [...pCards, ...aiCards];

  return allRawCards
    .filter(Boolean)
    .map((card, idx) => {
      const rarity = getCardRarity(card.ovr ?? 70);
      const sellPrice = RARITY_CONFIG[rarity]?.sellPrice ?? 15;
      return {
        ...card,
        name: (card.name ?? "").toUpperCase(),
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
