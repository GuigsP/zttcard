import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://yrmhlbreqiqfjtwvrxep.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_NJv9oR6E8VSR6LMIVaXFMQ_nUJz47NK";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function checkPacksAndCards() {
  const packsRes = await supabase.from("packs").select("*").order("sort_order");
  const packs = packsRes.data || [];
  const packMap = new Map(packs.map(p => [p.id, p]));

  const { data, error } = await supabase
    .from("cards")
    .select("id, card_number, name, card_packs(pack_id)")
    .order("card_number");

  console.log('Total de cartas retornadas:', data?.length);

  const countByPack = {};
  for (const p of packs) {
    countByPack[p.name + ` (${p.slug})`] = 0;
  }
  countByPack["SEM_PACOTE"] = 0;

  for (const c of data) {
    const cpList = c.card_packs || [];
    if (cpList.length === 0) {
      countByPack["SEM_PACOTE"]++;
    } else {
      for (const cp of cpList) {
        const p = packMap.get(cp.pack_id);
        const key = p ? p.name + ` (${p.slug})` : cp.pack_id;
        countByPack[key] = (countByPack[key] || 0) + 1;
      }
    }
  }

  console.table(countByPack);

  // Verificar quais são as cartas de Os Leões e seus pack_ids no retorno
  const leoes = data.filter(c => c.card_number >= 211 && c.card_number <= 232);
  console.log('Exemplo cartas Os Leões:');
  leoes.slice(0, 5).forEach(c => console.log(c.card_number, c.name, c.card_packs));
}

checkPacksAndCards();
