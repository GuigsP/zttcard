// Dicionário de Paródias Retrô Consagradas & Gerador Algorítmico estilo Bomba Patch / PES Clássico

const KNOWN_PARODIES: Record<string, string[]> = {
  "dida": ["DADI", "Didão Parede", "Dida Boladão"],
  "zetti": ["Zetão", "Zetti da Fiel", "Zettinho"],
  "ronaldo giovanelli": ["Ranoldo", "Ronaldo Muralha"],
  "ronaldo": ["Ranoldo", "Ronaldo Fenômeno", "Ronieldo"],
  "neto": ["veto", "tone", "Neto Canhão da Fiel"],
  "dagoberto": ["Deroberto", "Dagoberto Reserva Seguro"],
  "giba": ["Gibi", "Giba Flecha"],
  "marcelo djian": ["barcelos", "Marcelo Xerife"],
  "marcelo": ["barcelos", "Marcelinho"],
  "guinei": ["quinei", "Guinei Seguro"],
  "jacenir": ["Ja ceni", "Jacenir Canhota"],
  "dama": ["cavalheiro", "Damão"],
  "moretti": ["mobileti", "Morettinho"],
  "ari bazão": ["Ali fogão", "Bazão"],
  "ari": ["Ali fogão", "Arildo"],
  "wilson mano": ["irmão do wil", "Wilson Coringa"],
  "wilson ricardo": ["filho do uil", "Ricardinho"],
  "wílson ricardo": ["filho do uil", "Ricardinho"],
  "wilson": ["irmão do wil", "Wilson Coringa"],
  "ezequiel": ["Kiel", "Ezequiel Raça"],
  "jairo": ["Agrario", "Jairinho"],
  "tupãzinho": ["talismã", "Patuzinho", "Tupãzinho Talismã"],
  "tupazinho": ["talismã", "Patuzinho", "Tupãzinho Talismã"],
  "viola": ["VIOLA MATADOR", "Viola da Raça"],
  "eduardo": ["ardo", "Eduardinho"],
  "paulo sergio": ["sergipe", "Paulo Serginho"],
  "paulo sérgio": ["sergipe", "Paulo Serginho"],
  "vágner": ["Abner", "Vaguinho"],
  "vagner": ["Abner", "Vaguinho"],
  "alé": ["Lelé", "Alézinho"],
  "ale": ["Lelé", "Alézinho"],
  "gérson": ["Filho do Ger", "Gerson Canhota"],
  "gerson": ["Filho do Ger", "Gerson Canhota"],
  "márcio bittencourt": ["narlio", "Márcio Cão de Guarda"],
  "marcio bittencourt": ["narlio", "Márcio Cão de Guarda"],
  "márcio": ["narlio", "Marcinho"],
  "marcio": ["narlio", "Marcinho"],
  "pardal": ["Maritaca", "Pardalzinho"],
  "fabinho": ["Fabinho Veloz", "Fabin"],
  "mauro": ["Mauro Ponta Fina", "Maurinho"],
  "taffarel": ["TAFFERALHO", "Taffarel Paredão 90"],
  "cafu": ["CAFUZINHO 2 PULMÕES", "Cafuringa"],
  "jorginho": ["JORGINHO PERNA FINA", "Jorgin"],
  "aldair": ["ALDAÍRO ELEGANTE", "Aldairão"],
  "roberto carlos": ["ROBERTO CARLINHOS", "Robertão Bomba"],
  "branco": ["BRANCO DA FALTA", "Branquinho"],
  "dunga": ["ZUNGA CAPITÃO", "Dungão"],
  "mauro silva": ["MAURO SIVESTRE", "Maurão Muro"],
  "vampeta": ["VAMPETINHA DO POVO", "Vampetão"],
  "raí": ["RAY TERROR DO MORUMBI", "Raizão"],
  "rai": ["RAY TERROR DO MORUMBI", "Raizão"],
  "rivaldo": ["RIVALDÃO PERNA TORTA", "Rivaldinho"],
  "müller": ["MULLERZINHO LISO", "Muller"],
  "muller": ["MULLERZINHO LISO", "Muller"],
  "denílson": ["DENILSHOW DOS DRIBLES", "Denilson"],
  "denilson": ["DENILSHOW DOS DRIBLES", "Denilson"],
  "romário": ["ROMARINHO PEIXE", "Romário Gênio"],
  "romario": ["ROMARINHO PEIXE", "Romário Gênio"],
  "bebeto": ["BERBETO EMBALA-NENÉM", "Bebetin"],
  "edmundo": ["EDMUNDÃO ANIMAL", "Edmundinho"],
  "túlio maravilha": ["TÚLIO MARAVILHA 1000", "Tulhão"],
  "tulio maravilha": ["TÚLIO MARAVILHA 1000", "Tulhão"],
  "túlio": ["TÚLIO MARAVILHA 1000", "Tulhão"],
  "tulio": ["TÚLIO MARAVILHA 1000", "Tulhão"],
  "allejo": ["ALLEJO SUPREMO", "Allejo Mito"],
  "casillas": ["Casillinhas", "Casillão"],
  "buffon": ["Buffonildo", "Buffonzão"],
  "chilavert": ["Chilaverto", "Chilão"],
  "van nistelrooy": ["Van Nistelbão", "Nistelrooy"],
  "batistuta": ["Batistuta Jr", "Batigol"],
  "zambrotta": ["Zambrottinho", "Zambrotta"],
  "cannavaro": ["Cannavarinho", "Cannavaro"],
  "maldini": ["Maldininho", "Maldinão"],
  "zidane": ["Zidaninho", "Zidanão"],
  "figo": ["Figuinho", "Figão"],
  "beckham": ["Beckhinho", "Beckham"],
  "maradona": ["Maradoninha", "Dieguito"],
  "pelé": ["Reizinho", "Rei do Futebol"],
  "pele": ["Reizinho", "Rei do Futebol"],
  "kaká": ["Kaki", "Kakazinho"],
  "kaka": ["Kaki", "Kakazinho"],
  "ronaldinho": ["Ronaldinho Bruxo", "Ronivaldo"],
  "ronaldinho gaúcho": ["Ronaldinho Bruxo", "Ronivaldo"],
  "adriano": ["Imperador", "Adrianão"],
  "gabigol": ["Gabiol", "Gabigol"],
  "neymar": ["Reymar", "Neymão"],
};

function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Gera paródia retrô automática com base no nome real
 */
export function getRetroNameSuggestions(realName: string): { primary: string; suggestions: string[] } {
  const trimmed = realName.trim();
  if (!trimmed) {
    return { primary: "", suggestions: [] };
  }

  const norm = normalizeText(trimmed);

  // 1. Procura no dicionário direto
  if (KNOWN_PARODIES[norm]) {
    const list = KNOWN_PARODIES[norm];
    return { primary: list[0], suggestions: list };
  }

  // 2. Procura por correspondência parcial de palavras (ex: digitou "Cláudio Taffarel")
  for (const [key, val] of Object.entries(KNOWN_PARODIES)) {
    if (norm.includes(key) || key.includes(norm)) {
      return { primary: val[0], suggestions: val };
    }
  }

  // 3. Gerador Algorítmico estilo Bomba Patch / Retro Arcade
  const words = trimmed.split(/\s+/);
  const first = words[0];
  const last = words.length > 1 ? words[words.length - 1] : "";

  const suggestions: string[] = [];

  // Regra A: Troca de vogais (ex: Dida -> Dadi, Pato -> Pota)
  if (first.length >= 4) {
    const vowels = ["a", "e", "i", "o", "u"];
    let swapped = first.toLowerCase();
    const vIndices: number[] = [];
    for (let i = 0; i < swapped.length; i++) {
      if (vowels.includes(swapped[i])) vIndices.push(i);
    }
    if (vIndices.length >= 2) {
      const arr = swapped.split("");
      const i1 = vIndices[0];
      const i2 = vIndices[1];
      const tmp = arr[i1];
      arr[i1] = arr[i2];
      arr[i2] = tmp;
      const res = arr.join("");
      suggestions.push(res.toUpperCase());
    }
  }

  // Regra B: Sufixo -ildo / -aldo / -ão
  const cleanBase = first.replace(/[aeiou]+$/i, "");
  suggestions.push(`${cleanBase}ildo`);
  suggestions.push(`${first}ão`);
  if (last) {
    suggestions.push(`${first} ${last}zinho`);
  }

  const unique = Array.from(new Set(suggestions.filter(Boolean)));
  return {
    primary: unique[0] || trimmed.toUpperCase(),
    suggestions: unique.slice(0, 4),
  };
}
