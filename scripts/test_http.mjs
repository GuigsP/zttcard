const url = "https://yrmhlbreqiqfjtwvrxep.supabase.co/rest/v1/cards?select=id%2Clegacy_id%2Cside%2Cposition%2Ctier%2Cname%2Creal_name%2Ccard_number%2Covr%2Cattrs%2Cquote%2Ccard_packs(pack_id)&order=card_number.asc";
const apikey = "sb_publishable_NJv9oR6E8VSR6LMIVaXFMQ_nUJz47NK";

async function testHttp() {
  console.log("Fazendo fetch HTTP direto para o Supabase...");
  const res = await fetch(url, {
    headers: {
      "apikey": apikey,
    }
  });

  console.log("Status code:", res.status, res.statusText);
  const json = await res.json();
  if (Array.isArray(json)) {
    console.log("Total de cartas:", json.length);
    const leoes = json.filter(c => c.card_number >= 211 && c.card_number <= 232);
    console.log("Cartas 211-232:", leoes.length);
    console.log("Primeira de Os Leões:", leoes[0]);
  } else {
    console.log("Erro da API:", json);
  }
}

testHttp();
