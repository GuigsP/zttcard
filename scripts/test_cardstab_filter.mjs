import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://yrmhlbreqiqfjtwvrxep.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_NJv9oR6E8VSR6LMIVaXFMQ_nUJz47NK";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const FOUNDER_SLUG = "fundador";
const DEFAULT_PACKS = [
  { id: "founder", name: "Fundador", slug: FOUNDER_SLUG, description: "Baralho base retrô", sort_order: 0, is_active: true, exclusive_to: null },
  { id: "copa-90", name: "Copa de 90", slug: "copa-90", description: "Pacote especial Copa de 1990", sort_order: 1, is_active: true, exclusive_to: null },
  { id: "copa-94", name: "Copa de 94", slug: "copa-94", description: "Pacote especial Copa de 1994", sort_order: 2, is_active: true, exclusive_to: null },
  { id: "copa-98", name: "Copa de 98", slug: "copa-98", description: "Pacote especial Copa de 1998", sort_order: 3, is_active: true, exclusive_to: null },
  { id: "parque-sao-jorge-90", name: "Parque São Jorge - 90", slug: "parque-sao-jorge-90", description: "Esquadrão Campeão de 1990", sort_order: 4, is_active: true, exclusive_to: null },
];

function cardBelongsToPack(card, packIdOrSlug, packs = DEFAULT_PACKS) {
  if (packIdOrSlug === "all" || packIdOrSlug === "ALL") return true;
  if (!card.pack_ids || card.pack_ids.length === 0) return false;

  const isPsj = (val) =>
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

async function runTest() {
  const packsRes = await supabase.from("packs").select("*").order("sort_order");
  const packs = packsRes.data || [];
  const packMapByUuid = new Map(packs.map((p) => [p.id, p.slug]));

  const { data } = await supabase
    .from("cards")
    .select("id, legacy_id, side, position, tier, name, real_name, card_number, ovr, attrs, quote, card_packs(pack_id)")
    .order("card_number");

  const cards = data.map(r => {
    const resolvedPacks = Array.from(
      new Set(
        (r.card_packs ?? []).flatMap((cp) => {
          const slug = packMapByUuid.get(cp.pack_id);
          return slug ? [cp.pack_id, slug] : [cp.pack_id];
        })
      )
    );
    return {
      ...r,
      pack_ids: resolvedPacks
    };
  });

  console.log('Testando contagem por pacote exatamente como em CardsTab.tsx:');
  for (const p of packs) {
    const count = cards.filter((c) => cardBelongsToPack(c, p.slug || p.id, packs)).length;
    console.log(`Pacote: ${p.name} (${p.slug}) -> Count: ${count}`);
  }

  const leoesPack = packs.find(p => p.slug === 'os-leoes');
  const leoesFilter = cards.filter(c => cardBelongsToPack(c, leoesPack.slug || leoesPack.id, packs));
  console.log('Cartas filtradas por Os Leões:', leoesFilter.length);
}

runTest();
