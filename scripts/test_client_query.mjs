import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://yrmhlbreqiqfjtwvrxep.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_NJv9oR6E8VSR6LMIVaXFMQ_nUJz47NK";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function testQuery() {
  console.log('Consultando supabase via supabase-js...');
  const { data, error } = await supabase
    .from("cards")
    .select("id, legacy_id, side, position, tier, name, real_name, card_number, ovr, attrs, quote, card_packs(pack_id)")
    .order("card_number");

  if (error) {
    console.error('Erro na query:', error);
    return;
  }

  console.log('Total retornado pelo supabase-js:', data?.length);

  const leoes = data.filter(c => c.card_number >= 211 && c.card_number <= 232);
  console.log('Cartas de Os Leões encontradas:', leoes.length);
  if (leoes.length > 0) {
    console.log('Primeira carta de Os Leões:', leoes[0]);
  }

  const packsRes = await supabase.from("packs").select("*").order("sort_order");
  console.log('Total de pacotes retornados:', packsRes.data?.length);
  console.table(packsRes.data);
}

testQuery();
