export type PackTheme = {
  slug: string;
  label: string;
  border: string;
  topBg: string;
  topFg: string;
  nameFont: string;
  badge: string | null;
  accent: string;
};

const THEMES: Record<string, PackTheme> = {
  fundador: {
    slug: "fundador",
    label: "FUNDADOR",
    border: "#0a0f1f",
    topBg: "#0d8f3f",
    topFg: "#f6f2e7",
    nameFont: '"Bebas Neue", "Arial Narrow", sans-serif',
    badge: null,
    accent: "#ffd60a",
  },
  "parque-sao-jorge-90": {
    slug: "parque-sao-jorge-90",
    label: "PARQUE SÃO JORGE 90",
    border: "#111111",
    topBg: "#151515",
    topFg: "#f6f2e7",
    nameFont: '"Bebas Neue", "Arial Narrow", sans-serif',
    badge: "90",
    accent: "#ffffff",
  },
  "corinthians-90": {
    slug: "corinthians-90",
    label: "PARQUE SÃO JORGE 90",
    border: "#111111",
    topBg: "#151515",
    topFg: "#f6f2e7",
    nameFont: '"Bebas Neue", "Arial Narrow", sans-serif',
    badge: "90",
    accent: "#ffffff",
  },
  "flamengo-92": {
    slug: "flamengo-92",
    label: "FLAMENGO 92",
    border: "#c8102e",
    topBg: "#1a1a1a",
    topFg: "#f6f2e7",
    nameFont: '"Bebas Neue", "Arial Narrow", sans-serif',
    badge: "92",
    accent: "#c8102e",
  },
  "palmeiras-93": {
    slug: "palmeiras-93",
    label: "PALMEIRAS 93",
    border: "#006437",
    topBg: "#006437",
    topFg: "#ffffff",
    nameFont: '"Bebas Neue", "Arial Narrow", sans-serif',
    badge: "93",
    accent: "#ffd60a",
  },
  "saopaulo-92": {
    slug: "saopaulo-92",
    label: "SÃO PAULO 92",
    border: "#111111",
    topBg: "#c8102e",
    topFg: "#ffffff",
    nameFont: '"Bebas Neue", "Arial Narrow", sans-serif',
    badge: "BI",
    accent: "#111111",
  },
  "vasco-97": {
    slug: "vasco-97",
    label: "VASCO 97",
    border: "#111111",
    topBg: "#111111",
    topFg: "#ffffff",
    nameFont: '"Bebas Neue", "Arial Narrow", sans-serif',
    badge: "97",
    accent: "#c8102e",
  },
  "gremio-95": {
    slug: "gremio-95",
    label: "GRÊMIO 95",
    border: "#0d80bf",
    topBg: "#0d80bf",
    topFg: "#ffffff",
    nameFont: '"Bebas Neue", "Arial Narrow", sans-serif',
    badge: "95",
    accent: "#111111",
  },
  "cruzeiro-97": {
    slug: "cruzeiro-97",
    label: "CRUZEIRO 97",
    border: "#003a70",
    topBg: "#003a70",
    topFg: "#ffffff",
    nameFont: '"Bebas Neue", "Arial Narrow", sans-serif',
    badge: "97",
    accent: "#ffd60a",
  },
  "santos-95": {
    slug: "santos-95",
    label: "SANTOS 95",
    border: "#111111",
    topBg: "#ffffff",
    topFg: "#111111",
    nameFont: '"Bebas Neue", "Arial Narrow", sans-serif',
    badge: "95",
    accent: "#111111",
  },
  "copa-70": {
    slug: "copa-70",
    label: "COPA 70",
    border: "#002776",
    topBg: "#ffd60a",
    topFg: "#002776",
    nameFont: '"Alfa Slab One", "Bebas Neue", serif',
    badge: "70",
    accent: "#009c3b",
  },
  "copa-82": {
    slug: "copa-82",
    label: "COPA 82",
    border: "#009c3b",
    topBg: "#ffd60a",
    topFg: "#002776",
    nameFont: '"Rubik Mono One", "Bebas Neue", sans-serif',
    badge: "82",
    accent: "#009c3b",
  },
  "copa-90": {
    slug: "copa-90",
    label: "COPA 90",
    border: "#0b6b3a",
    topBg: "#c8102e",
    topFg: "#f6f2e7",
    nameFont: '"Alfa Slab One", "Bebas Neue", serif',
    badge: "90",
    accent: "#0b6b3a",
  },
  "copa-94": {
    slug: "copa-94",
    label: "COPA 94",
    border: "#bf0a30",
    topBg: "#002868",
    topFg: "#f6f2e7",
    nameFont: '"Rubik Mono One", "Bebas Neue", sans-serif',
    badge: "94",
    accent: "#bf0a30",
  },
  "copa-98": {
    slug: "copa-98",
    label: "COPA 98",
    border: "#0055a4",
    topBg: "#ef4135",
    topFg: "#f6f2e7",
    nameFont: '"Michroma", "Bebas Neue", sans-serif',
    badge: "98",
    accent: "#0055a4",
  },
};

export function getPackTheme(slug?: string | null): PackTheme {
  if (!slug) return THEMES.fundador;
  const clean = slug.toLowerCase().trim();
  
  if (THEMES[clean]) return THEMES[clean];

  // Dynamic heuristic matching for custom slugs
  if (clean.includes("parque") || clean.includes("sao-jorge") || clean.includes("corinthians") || clean.includes("timao")) return {
    slug: clean,
    label: "PARQUE SÃO JORGE 90",
    border: "#111111",
    topBg: "#151515",
    topFg: "#f6f2e7",
    nameFont: '"Bebas Neue", "Arial Narrow", sans-serif',
    badge: clean.match(/\d{2,4}/)?.[0] ?? "90",
    accent: "#ffffff",
  };

  if (clean.includes("flamengo") || clean.includes("meng")) return {
    slug: clean,
    label: clean.toUpperCase(),
    border: "#c8102e",
    topBg: "#1a1a1a",
    topFg: "#f6f2e7",
    nameFont: '"Bebas Neue", "Arial Narrow", sans-serif',
    badge: clean.match(/\d{2,4}/)?.[0] ?? "CRF",
    accent: "#c8102e",
  };

  if (clean.includes("palmeiras") || clean.includes("verdao")) return {
    slug: clean,
    label: clean.toUpperCase(),
    border: "#006437",
    topBg: "#006437",
    topFg: "#ffffff",
    nameFont: '"Bebas Neue", "Arial Narrow", sans-serif',
    badge: clean.match(/\d{2,4}/)?.[0] ?? "SEP",
    accent: "#ffd60a",
  };

  if (clean.includes("sao-paulo") || clean.includes("saopaulo") || clean.includes("spfc")) return {
    slug: clean,
    label: clean.toUpperCase(),
    border: "#111111",
    topBg: "#c8102e",
    topFg: "#ffffff",
    nameFont: '"Bebas Neue", "Arial Narrow", sans-serif',
    badge: clean.match(/\d{2,4}/)?.[0] ?? "SPFC",
    accent: "#111111",
  };

  if (clean.includes("vasco")) return {
    slug: clean,
    label: clean.toUpperCase(),
    border: "#111111",
    topBg: "#111111",
    topFg: "#ffffff",
    nameFont: '"Bebas Neue", "Arial Narrow", sans-serif',
    badge: clean.match(/\d{2,4}/)?.[0] ?? "CRVG",
    accent: "#c8102e",
  };

  if (clean.includes("gremio")) return {
    slug: clean,
    label: clean.toUpperCase(),
    border: "#0d80bf",
    topBg: "#0d80bf",
    topFg: "#ffffff",
    nameFont: '"Bebas Neue", "Arial Narrow", sans-serif',
    badge: clean.match(/\d{2,4}/)?.[0] ?? "FBPA",
    accent: "#111111",
  };

  if (clean.includes("cruzeiro")) return {
    slug: clean,
    label: clean.toUpperCase(),
    border: "#003a70",
    topBg: "#003a70",
    topFg: "#ffffff",
    nameFont: '"Bebas Neue", "Arial Narrow", sans-serif',
    badge: clean.match(/\d{2,4}/)?.[0] ?? "CRU",
    accent: "#ffd60a",
  };

  if (clean.includes("santos")) return {
    slug: clean,
    label: clean.toUpperCase(),
    border: "#111111",
    topBg: "#ffffff",
    topFg: "#111111",
    nameFont: '"Bebas Neue", "Arial Narrow", sans-serif',
    badge: clean.match(/\d{2,4}/)?.[0] ?? "SFC",
    accent: "#111111",
  };

  if (clean.includes("copa")) return {
    slug: clean,
    label: clean.toUpperCase(),
    border: "#0b6b3a",
    topBg: "#ffd60a",
    topFg: "#002776",
    nameFont: '"Rubik Mono One", "Bebas Neue", sans-serif',
    badge: clean.match(/\d{2,4}/)?.[0] ?? "COPA",
    accent: "#009c3b",
  };

  return THEMES.fundador;
}

export const FOUNDER_PACK_SLUG = "fundador";

export const CUP_PACKS: PackTheme[] = [
  THEMES["copa-90"],
  THEMES["copa-94"],
  THEMES["copa-98"],
];

export const ALL_PRESET_PACKS: PackTheme[] = Object.values(THEMES);

export const DEFAULT_CUP_PACK = "copa-90";
