import { supabase } from "@/integrations/supabase/client";
import type { AttrKey, Card, Position } from "./types";
import { buildDeck } from "./data";
import cardsJsonData from "./cards.json";

export type DBCard = {
  id: string;
  legacy_id: string | null;
  side: "P" | "AI";
  position: Position;
  tier: number;
  name: string;
  real_name: string | null;
  card_number: number;
  ovr: number;
  attrs: Record<string, number>;
  quote: string;
  pack_ids: string[];
};

export type DBPack = {
  id: string;
  name: string;
  slug: string;
  description: string;
  sort_order: number;
  is_active: boolean;
};

export const FOUNDER_SLUG = "fundador";

const CARD_SELECT = "id, legacy_id, side, position, tier, name, real_name, card_number, ovr, attrs, quote";

function toCard(row: DBCard): Card {
  return {
    id: row.legacy_id ?? row.id,
    name: row.name,
    position: row.position,
    ovr: row.ovr,
    attrs: row.attrs as Partial<Record<AttrKey, number>>,
    quote: row.quote ?? "",
    cardNumber: row.card_number,
  };
}

export const DEFAULT_PACKS: DBPack[] = [
  { id: "founder", name: "Fundador", slug: FOUNDER_SLUG, description: "Baralho base retrô", sort_order: 0, is_active: true },
  { id: "copa-90", name: "Copa de 90", slug: "copa-90", description: "Pacote especial Copa de 1990", sort_order: 1, is_active: true },
  { id: "copa-94", name: "Copa de 94", slug: "copa-94", description: "Pacote especial Copa de 1994", sort_order: 2, is_active: true },
  { id: "copa-98", name: "Copa de 98", slug: "copa-98", description: "Pacote especial Copa de 1998", sort_order: 3, is_active: true },
  { id: "parque-sao-jorge-90", name: "Parque São Jorge - 90", slug: "parque-sao-jorge-90", description: "Esquadrão Campeão de 1990", sort_order: 4, is_active: true },
];

export function cardBelongsToPack(card: DBCard, packIdOrSlug: string, packs: DBPack[] = DEFAULT_PACKS): boolean {
  if (packIdOrSlug === "all" || packIdOrSlug === "ALL") return true;
  if (!card.pack_ids || card.pack_ids.length === 0) return false;

  const isPsj = (val: string) =>
    val === "parque-sao-jorge-90" ||
    val === "corinthians-90" ||
    val.includes("parque-sao-jorge") ||
    val.includes("parque");

  const targetPack = packs.find((p) => p.id === packIdOrSlug || p.slug === packIdOrSlug);
  if (!targetPack) {
    if (isPsj(packIdOrSlug)) {
      return card.pack_ids.some(isPsj);
    }
    return card.pack_ids.includes(packIdOrSlug);
  }

  const targetIsPsj = isPsj(targetPack.id) || isPsj(targetPack.slug);

  return card.pack_ids.some((pid) => {
    if (pid === targetPack.id || pid === targetPack.slug) return true;
    if (targetPack.slug === FOUNDER_SLUG && (pid === "founder" || pid === "fundador")) return true;
    if (targetIsPsj && isPsj(pid)) return true;
    const match = packs.find((x) => x.id === pid || x.slug === pid);
    return match ? match.slug === targetPack.slug || match.id === targetPack.id : false;
  });
}

const LOCAL_CARDS_KEY = "ztt.local.cards.db";
const LOCAL_PACKS_KEY = "ztt.local.packs.db";

const STATIC_CARDS: DBCard[] = cardsJsonData as unknown as DBCard[];

export async function listAllCards(): Promise<DBCard[]> {
  const cardMap = new Map<string, DBCard>();

  // 1. Fetch from Supabase
  try {
    const packsList = await listPacks();
    const packMapByUuid = new Map(packsList.map((p) => [p.id, p.slug]));

    const { data, error } = await supabase
      .from("cards")
      .select(`${CARD_SELECT}, card_packs(pack_id)`)
      .order("card_number");
    if (!error && data && data.length > 0) {
      for (const row of data) {
        const r = row as unknown as (Omit<DBCard, "pack_ids"> & { card_packs?: { pack_id: string }[] });
        const resolvedPacks = Array.from(
          new Set(
            (r.card_packs ?? []).flatMap((cp) => {
              const slug = packMapByUuid.get(cp.pack_id);
              return slug ? [cp.pack_id, slug] : [cp.pack_id];
            })
          )
        );
        const c: DBCard = {
          id: r.id,
          legacy_id: r.legacy_id,
          side: r.side,
          position: r.position,
          tier: r.tier,
          name: r.name,
          real_name: r.real_name ?? null,
          card_number: r.card_number,
          ovr: r.ovr,
          attrs: r.attrs,
          quote: r.quote,
          pack_ids: resolvedPacks,
        };
        cardMap.set(c.id, c);
      }
    }
  } catch {
    // fallback
  }

  // 2. Offline / Local fallback: ONLY used if Supabase is unavailable or returned 0 cards!
  if (cardMap.size === 0) {
    const localRaw = typeof window !== "undefined" ? localStorage.getItem(LOCAL_CARDS_KEY) : null;
    const localList: DBCard[] = localRaw ? JSON.parse(localRaw) : [];
    for (const lc of localList) {
      cardMap.set(lc.id, lc);
    }

    for (const hc of STATIC_CARDS) {
      if (!cardMap.has(hc.id)) {
        cardMap.set(hc.id, hc);
      }
    }
  }

  // 4. If still empty, build the default founder deck
  if (cardMap.size === 0) {
    const P = buildDeck("P");
    const AI = buildDeck("AI");
    P.forEach((c, i) => {
      cardMap.set(`local-p-${i}`, {
        id: `local-p-${i}`,
        legacy_id: c.id,
        side: "P",
        position: c.position,
        tier: 0,
        name: c.name,
        real_name: null,
        card_number: i + 1,
        ovr: c.ovr,
        attrs: c.attrs,
        quote: c.quote,
        pack_ids: ["founder"],
      });
    });
    AI.forEach((c, i) => {
      cardMap.set(`local-ai-${i}`, {
        id: `local-ai-${i}`,
        legacy_id: c.id,
        side: "AI",
        position: c.position,
        tier: 0,
        name: c.name,
        real_name: null,
        card_number: 33 + i + 1,
        ovr: c.ovr,
        attrs: c.attrs,
        quote: c.quote,
        pack_ids: ["founder"],
      });
    });
  }

  const result = Array.from(cardMap.values()).map((c) => {
    if (c.pack_ids && c.pack_ids.includes("corinthians-90")) {
      const updatedPacks = Array.from(
        new Set(c.pack_ids.map((p) => (p === "corinthians-90" ? "parque-sao-jorge-90" : p)))
      );
      return { ...c, pack_ids: updatedPacks };
    }
    return c;
  });
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_CARDS_KEY, JSON.stringify(result));
  }
  return result;
}

export type UpsertCardInput = {
  id?: string;
  legacy_id?: string | null;
  side: "P" | "AI";
  position: Position;
  tier?: number;
  name: string;
  real_name?: string | null;
  attrs: Record<string, number>;
  quote: string;
  pack_ids: string[];
};

function computeOvr(attrs: Record<string, number>): number {
  const vals = Object.values(attrs).filter((v) => typeof v === "number");
  if (vals.length === 0) return 50;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export async function upsertCard(input: UpsertCardInput): Promise<void> {
  const ovr = computeOvr(input.attrs);
  const tier = input.id
    ? (input.tier ?? 0)
    : (typeof input.tier === "number" ? input.tier : Math.floor(Math.random() * 3));

  const payload: Record<string, any> = {
    side: input.side,
    position: input.position,
    tier,
    name: input.name,
    real_name: input.real_name ?? null,
    ovr,
    attrs: input.attrs,
    quote: input.quote,
  };
  if (input.legacy_id) {
    payload.legacy_id = input.legacy_id;
  }

  try {
    let cardId = input.id;
    let existingCardId: string | null = null;

    // Check if card exists in Supabase by UUID, legacy_id or input.id
    const isUuid = typeof cardId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cardId);
    if (isUuid) {
      const { data } = await supabase.from("cards").select("id").eq("id", cardId).maybeSingle();
      if (data) existingCardId = data.id;
    }
    if (!existingCardId && input.legacy_id) {
      const { data } = await supabase.from("cards").select("id").eq("legacy_id", input.legacy_id).maybeSingle();
      if (data) existingCardId = data.id;
    }
    if (!existingCardId && cardId && !cardId.startsWith("card-") && !cardId.startsWith("local-")) {
      const { data } = await supabase.from("cards").select("id").eq("legacy_id", cardId).maybeSingle();
      if (data) existingCardId = data.id;
    }

    if (existingCardId) {
      await supabase.from("cards").update(payload).eq("id", existingCardId);
      cardId = existingCardId;
    } else {
      const { data: maxRow } = await supabase.from("cards").select("card_number").order("card_number", { ascending: false }).limit(1).maybeSingle();
      payload.card_number = (maxRow?.card_number ?? 100) + 1;
      const { data, error } = await supabase.from("cards").insert(payload).select("id").single();
      if (!error && data) cardId = data.id as string;
    }

    if (cardId) {
      const allPacks = await listPacks();
      const packUuids: string[] = [];
      for (const pid of input.pack_ids) {
        const found = allPacks.find((p) => p.id === pid || p.slug === pid);
        const candidateId = found?.id ?? pid;
        const candidateIsUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidateId);
        if (candidateIsUuid && !packUuids.includes(candidateId)) {
          packUuids.push(candidateId);
        }
      }

      await supabase.from("card_packs").delete().eq("card_id", cardId);
      if (packUuids.length > 0) {
        const rows = packUuids.map((pack_id) => ({ card_id: cardId!, pack_id }));
        await supabase.from("card_packs").insert(rows);
      }
    }
  } catch (err) {
    console.warn("Supabase upsertCard error:", err);
  }

  // Always update local storage
  if (typeof window !== "undefined") {
    const list = await listAllCards();
    const existing = list.find((c) => c.id === input.id || (input.legacy_id && c.legacy_id === input.legacy_id));
    const newCard: DBCard = {
      id: existing?.id || input.id || `card-${Date.now()}`,
      legacy_id: input.legacy_id || existing?.legacy_id || null,
      side: input.side,
      position: input.position,
      tier,
      name: input.name,
      real_name: input.real_name || null,
      card_number: existing?.card_number ?? list.length + 1,
      ovr,
      attrs: input.attrs,
      quote: input.quote,
      pack_ids: input.pack_ids,
    };
    const updated = existing
      ? list.map((c) => (c.id === existing.id ? newCard : c))
      : [newCard, ...list];
    localStorage.setItem(LOCAL_CARDS_KEY, JSON.stringify(updated));
  }
}

export async function deleteCard(id: string): Promise<void> {
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) {
      await supabase.from("cards").delete().eq("id", id);
    } else {
      await supabase.from("cards").delete().eq("legacy_id", id);
    }
  } catch (err) {
    console.warn("Supabase deleteCard error:", err);
  }
  if (typeof window !== "undefined") {
    const list = await listAllCards();
    const updated = list.filter((c) => c.id !== id && c.legacy_id !== id);
    localStorage.setItem(LOCAL_CARDS_KEY, JSON.stringify(updated));
  }
}

export async function exportCardsJson(): Promise<string> {
  const cards = await listAllCards();
  return JSON.stringify(cards, null, 2);
}

export async function importCardsJson(jsonStr: string): Promise<number> {
  const parsed = JSON.parse(jsonStr) as DBCard[];
  if (!Array.isArray(parsed)) throw new Error("O formato deve ser um array JSON de cartas.");
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_CARDS_KEY, JSON.stringify(parsed));
  }
  return parsed.length;
}

export async function resetToDefaultDeck(): Promise<void> {
  if (typeof window !== "undefined") {
    localStorage.removeItem(LOCAL_CARDS_KEY);
    localStorage.setItem(LOCAL_CARDS_KEY, JSON.stringify(STATIC_CARDS));
  }
}

export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!error && data) return true;
  } catch {
    // ignore
  }
  return true;
}

// ---- Packs ----

export async function listPacks(): Promise<DBPack[]> {
  const packMap = new Map<string, DBPack>();
  DEFAULT_PACKS.forEach((p) => packMap.set(p.slug, p));

  try {
    const { data, error } = await supabase
      .from("packs")
      .select("id, name, slug, description, sort_order, is_active")
      .order("sort_order")
      .order("name");
    if (!error && data && data.length > 0) {
      for (const p of data as unknown as DBPack[]) {
        packMap.set(p.slug, p);
      }
    }
  } catch {
    // ignore
  }

  // Local packs fallback
  const localPacksRaw = typeof window !== "undefined" ? localStorage.getItem(LOCAL_PACKS_KEY) : null;
  if (localPacksRaw) {
    try {
      const list = JSON.parse(localPacksRaw) as DBPack[];
      list.forEach((p) => packMap.set(p.slug, p));
    } catch {
      // ignore
    }
  }

  // Deduplicação e migração automática:
  // Se existir qualquer referência a "corinthians", removemos para garantir que
  // apenas "Parque São Jorge - 90" apareça no painel admin!
  for (const [key, pack] of Array.from(packMap.entries())) {
    const isCorinthians =
      key.includes("corinthians") ||
      (pack.slug && pack.slug.includes("corinthians")) ||
      (pack.id && pack.id.includes("corinthians")) ||
      (pack.name && pack.name.toLowerCase().includes("corinthians"));

    if (isCorinthians) {
      packMap.delete(key);
    }
  }

  // Garante que o pacote oficial Parque São Jorge - 90 está presente
  const psjPack = Array.from(packMap.values()).find(
    (p) => p.slug === "parque-sao-jorge-90" || p.name.toLowerCase().includes("parque s")
  );
  if (!psjPack) {
    packMap.set("parque-sao-jorge-90", {
      id: "parque-sao-jorge-90",
      name: "Parque São Jorge - 90",
      slug: "parque-sao-jorge-90",
      description: "Esquadrão Campeão de 1990",
      sort_order: 4,
      is_active: true,
    });
  } else if (psjPack.name !== "Parque São Jorge - 90") {
    // Padroniza o nome
    psjPack.name = "Parque São Jorge - 90";
    packMap.set(psjPack.slug, psjPack);
  }

  // Limpa o localStorage local para não reviver o pack "corinthians"
  if (typeof window !== "undefined" && localPacksRaw) {
    try {
      const list = JSON.parse(localPacksRaw) as DBPack[];
      const cleaned = list.filter(
        (p) =>
          !p.slug.includes("corinthians") &&
          !p.id.includes("corinthians") &&
          !p.name.toLowerCase().includes("corinthians")
      );
      if (cleaned.length !== list.length) {
        localStorage.setItem(LOCAL_PACKS_KEY, JSON.stringify(cleaned));
      }
    } catch {
      // ignore
    }
  }

  return Array.from(packMap.values());
}

export async function listPackCounts(): Promise<Record<string, number>> {
  const [allPacks, allCards] = await Promise.all([listPacks(), listAllCards()]);
  const counts: Record<string, number> = {};

  for (const pack of allPacks) {
    counts[pack.id] = allCards.filter((c) => cardBelongsToPack(c, pack.id, allPacks)).length;
  }
  return counts;
}

export type UpsertPackInput = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  sort_order: number;
  is_active: boolean;
};

export async function upsertPack(input: UpsertPackInput): Promise<void> {
  const payload = {
    name: input.name,
    slug: input.slug,
    description: input.description,
    sort_order: input.sort_order,
    is_active: input.is_active,
  };
  try {
    if (input.id) {
      await supabase.from("packs").update(payload).eq("id", input.id);
    } else {
      await supabase.from("packs").insert(payload);
    }
  } catch {
    // ignore
  }

  if (typeof window !== "undefined") {
    const packs = await listPacks();
    const newPack: DBPack = {
      id: input.id || `pack-${Date.now()}`,
      name: input.name,
      slug: input.slug,
      description: input.description,
      sort_order: input.sort_order,
      is_active: input.is_active,
    };
    const updated = input.id
      ? packs.map((p) => (p.id === input.id ? newPack : p))
      : [...packs, newPack];
    localStorage.setItem(LOCAL_PACKS_KEY, JSON.stringify(updated));
  }
}

export async function deletePack(id: string): Promise<void> {
  try {
    await supabase.from("packs").delete().eq("id", id);
  } catch {
    // ignore
  }
  if (typeof window !== "undefined") {
    const packs = await listPacks();
    const updated = packs.filter((p) => p.id !== id && p.slug !== id);
    localStorage.setItem(LOCAL_PACKS_KEY, JSON.stringify(updated));
  }
}

export async function fetchDecks(
  cupPackSlug: string = "copa-90",
): Promise<{ P: Card[]; AI: Card[] } | null> {
  const allCards = await listAllCards();
  const allPacks = await listPacks();
  const targetPack = allPacks.find((p) => p.slug === cupPackSlug || p.id === cupPackSlug);

  const bySide: Record<"P" | "AI", Record<string, Card[]>> = {
    P: {},
    AI: {},
  };

  for (const raw of allCards) {
    const inCup = targetPack ? cardBelongsToPack(raw, targetPack.slug, allPacks) : false;
    const inFounder = cardBelongsToPack(raw, FOUNDER_SLUG, allPacks);
    if (!inCup && !inFounder) continue;

    const card = toCard(raw);
    card.packSlug = inCup ? (targetPack?.slug ?? cupPackSlug) : FOUNDER_SLUG;
    (card as Card & { __priority?: number }).__priority = inCup ? 0 : 1;
    const bucket = bySide[raw.side];
    (bucket[raw.position] ??= []).push(card);
  }

  const P: Card[] = [];
  const AI: Card[] = [];
  for (const side of ["P", "AI"] as const) {
    const buckets = bySide[side];
    for (const pos of Object.keys(buckets)) {
      buckets[pos].sort(
        (a, b) =>
          ((a as Card & { __priority?: number }).__priority ?? 1) -
          ((b as Card & { __priority?: number }).__priority ?? 1),
      );
    }
  }

  const POSITION_KEYS = [
    "GOL", "LD", "ZAD", "ZAE", "LE", "VOL", "M8", "M10", "PD", "PE", "ATA",
  ];
  for (const side of ["P", "AI"] as const) {
    const seenDeckNames = new Set<string>();
    const deck = side === "P" ? P : AI;

    for (const pos of POSITION_KEYS) {
      const arr = bySide[side][pos] ?? [];
      const pickedForPos: Card[] = [];

      for (const card of arr) {
        const normName = card.name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim()
          .toLowerCase();

        if (!seenDeckNames.has(normName)) {
          seenDeckNames.add(normName);
          pickedForPos.push(card);
          if (pickedForPos.length === 3) break;
        }
      }

      if (pickedForPos.length < 3) {
        const base = buildDeck(side).filter((c) => c.position === pos);
        for (const bc of base) {
          if (pickedForPos.length >= 3) break;
          const normBase = bc.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
          if (!seenDeckNames.has(normBase)) {
            seenDeckNames.add(normBase);
            pickedForPos.push(bc);
          }
        }
      }
      deck.push(...pickedForPos);
    }
  }
  return { P, AI };
}
