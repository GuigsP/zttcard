export type FrameStyle = "waves" | "geometric" | "arcade_neon" | "shield" | "cyber_tech";

export type FramePalette = {
  id: string;
  name: string;
  // Trio de 3 cores: [Borda/Primária, Topo/Secundária, Acento/Destaque]
  colors: [string, string, string];
};

export const FRAME_STYLES: { id: FrameStyle; name: string; icon: string; description: string }[] = [
  {
    id: "waves",
    name: "Ondas Retrô",
    icon: "🌊",
    description: "Curvas fluidas, divisória ondulada e cantos orgânicos",
  },
  {
    id: "geometric",
    name: "Quadrada Tech",
    icon: "⬛",
    description: "Cantos chanfrados 45°, rebites e placas angulares",
  },
  {
    id: "arcade_neon",
    name: "Arcade Neon 90s",
    icon: "🕹️",
    description: "Cantos em degraus pixel 8-bit e divisória denteada",
  },
  {
    id: "shield",
    name: "Brasão Imperial",
    icon: "🛡️",
    description: "Topo em formato de escudo e cantoneiras nobres",
  },
  {
    id: "cyber_tech",
    name: "Cyber Armor",
    icon: "⚡",
    description: "Miras HUD nos cantos e linhas cibernéticas",
  },
];

export const BASE_NAVY_PALETTES: FramePalette[] = [
  {
    id: "cyan_electric",
    name: "Meia-Noite & Ciano",
    colors: ["#0a0f1f", "#151e36", "#00e5ff"],
  },
  {
    id: "gold_royal",
    name: "Meia-Noite & Ouro",
    colors: ["#0a0f1f", "#1e1b4b", "#ffd60a"],
  },
  {
    id: "crimson_cyber",
    name: "Meia-Noite & Carmim",
    colors: ["#0a0f1f", "#2d0f1e", "#ff2a6d"],
  },
];

export type PackTheme = {
  slug: string;
  label: string;
  border: string;
  topBg: string;
  topFg: string;
  nameFont: string;
  badge: string | null;
  accent: string;
  frameStyle: FrameStyle;
  paletteIndex: number;
  paletteColors?: [string, string, string];
};

const LOCAL_FRAME_STORAGE_KEY = "ztt.pack_frames.v2";

export type CustomFrameConfig = {
  frameStyle: FrameStyle;
  paletteIndex: number;
  colors?: [string, string, string];
};

export function getCustomFrameConfigs(): Record<string, CustomFrameConfig> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LOCAL_FRAME_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setCustomFrameConfig(
  slug: string,
  style: FrameStyle,
  paletteIndex: number,
  colors?: [string, string, string]
): void {
  if (typeof window === "undefined" || !slug) return;
  try {
    const current = getCustomFrameConfigs();
    current[slug.toLowerCase().trim()] = {
      frameStyle: style,
      paletteIndex,
      colors: colors || BASE_NAVY_PALETTES[paletteIndex]?.colors || BASE_NAVY_PALETTES[0].colors,
    };
    localStorage.setItem(LOCAL_FRAME_STORAGE_KEY, JSON.stringify(current));
  } catch {
    // ignore
  }
}

export function parseFrameFromDescription(description?: string | null): {
  cleanDescription: string;
  frameConfig: CustomFrameConfig | null;
} {
  if (!description) return { cleanDescription: "", frameConfig: null };
  const match = description.match(/<!--frame:(\{.*?\})-->/);
  if (!match) return { cleanDescription: description, frameConfig: null };
  try {
    const parsed = JSON.parse(match[1]);
    const cleanDescription = description.replace(match[0], "").trim();
    if (parsed.frameStyle) {
      return {
        cleanDescription,
        frameConfig: {
          frameStyle: parsed.frameStyle,
          paletteIndex: parsed.paletteIndex ?? 0,
          colors: parsed.colors,
        },
      };
    }
  } catch {
    // ignore
  }
  return { cleanDescription: description, frameConfig: null };
}

export function embedFrameInDescription(
  cleanDescription: string,
  frameStyle: FrameStyle,
  paletteIndex: number,
  colors?: [string, string, string]
): string {
  const clean = (cleanDescription || "").replace(/<!--frame:\{.*?\}-->/g, "").trim();
  const meta = JSON.stringify({
    frameStyle,
    paletteIndex,
    colors: colors || BASE_NAVY_PALETTES[paletteIndex]?.colors || BASE_NAVY_PALETTES[0].colors,
  });
  return `${clean} <!--frame:${meta}-->`.trim();
}

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
    frameStyle: "waves",
    paletteIndex: 1,
  },
  "os-leoes": {
    slug: "os-leoes",
    label: "OS LEÕES",
    border: "#0a0f1f",
    topBg: "#1e1b4b",
    topFg: "#f6f2e7",
    nameFont: '"Bebas Neue", "Arial Narrow", sans-serif',
    badge: "XI",
    accent: "#ffd60a",
    frameStyle: "shield",
    paletteIndex: 1,
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
    frameStyle: "arcade_neon",
    paletteIndex: 0,
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
    frameStyle: "arcade_neon",
    paletteIndex: 0,
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
    frameStyle: "geometric",
    paletteIndex: 2,
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
    frameStyle: "shield",
    paletteIndex: 1,
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
    frameStyle: "geometric",
    paletteIndex: 2,
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
    frameStyle: "shield",
    paletteIndex: 0,
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
    frameStyle: "waves",
    paletteIndex: 0,
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
    frameStyle: "shield",
    paletteIndex: 1,
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
    frameStyle: "geometric",
    paletteIndex: 0,
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
    frameStyle: "shield",
    paletteIndex: 1,
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
    frameStyle: "waves",
    paletteIndex: 1,
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
    frameStyle: "arcade_neon",
    paletteIndex: 2,
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
    frameStyle: "cyber_tech",
    paletteIndex: 0,
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
    frameStyle: "cyber_tech",
    paletteIndex: 0,
  },
};

function applyCustomFrame(theme: PackTheme, cleanSlug: string): PackTheme {
  const configs = getCustomFrameConfigs();
  const custom = configs[cleanSlug];
  if (!custom) return theme;

  const colors =
    custom.colors ||
    BASE_NAVY_PALETTES[custom.paletteIndex]?.colors ||
    BASE_NAVY_PALETTES[0].colors;

  return {
    ...theme,
    frameStyle: custom.frameStyle,
    paletteIndex: custom.paletteIndex,
    border: colors[0],
    topBg: colors[1],
    accent: colors[2],
    paletteColors: colors,
  };
}

export function getPackTheme(slug?: string | null): PackTheme {
  if (!slug) return applyCustomFrame(THEMES.fundador, "fundador");
  const clean = slug.toLowerCase().trim();

  if (THEMES[clean]) {
    return applyCustomFrame(THEMES[clean], clean);
  }

  // Dynamic heuristic matching for custom slugs
  if (
    clean.includes("parque") ||
    clean.includes("sao-jorge") ||
    clean.includes("corinthians") ||
    clean.includes("timao")
  ) {
    return applyCustomFrame(
      {
        slug: clean,
        label: "PARQUE SÃO JORGE 90",
        border: "#111111",
        topBg: "#151515",
        topFg: "#f6f2e7",
        nameFont: '"Bebas Neue", "Arial Narrow", sans-serif',
        badge: clean.match(/\d{2,4}/)?.[0] ?? "90",
        accent: "#ffffff",
        frameStyle: "arcade_neon",
        paletteIndex: 0,
      },
      clean
    );
  }

  if (clean.includes("leoes") || clean.includes("leões")) {
    return applyCustomFrame(THEMES["os-leoes"], clean);
  }

  if (clean.includes("flamengo") || clean.includes("meng")) {
    return applyCustomFrame(
      {
        slug: clean,
        label: clean.toUpperCase(),
        border: "#c8102e",
        topBg: "#1a1a1a",
        topFg: "#f6f2e7",
        nameFont: '"Bebas Neue", "Arial Narrow", sans-serif',
        badge: clean.match(/\d{2,4}/)?.[0] ?? "CRF",
        accent: "#c8102e",
        frameStyle: "geometric",
        paletteIndex: 2,
      },
      clean
    );
  }

  if (clean.includes("palmeiras") || clean.includes("verdao")) {
    return applyCustomFrame(
      {
        slug: clean,
        label: clean.toUpperCase(),
        border: "#006437",
        topBg: "#006437",
        topFg: "#ffffff",
        nameFont: '"Bebas Neue", "Arial Narrow", sans-serif',
        badge: clean.match(/\d{2,4}/)?.[0] ?? "SEP",
        accent: "#ffd60a",
        frameStyle: "shield",
        paletteIndex: 1,
      },
      clean
    );
  }

  if (clean.includes("sao-paulo") || clean.includes("saopaulo") || clean.includes("spfc")) {
    return applyCustomFrame(
      {
        slug: clean,
        label: clean.toUpperCase(),
        border: "#111111",
        topBg: "#c8102e",
        topFg: "#ffffff",
        nameFont: '"Bebas Neue", "Arial Narrow", sans-serif',
        badge: clean.match(/\d{2,4}/)?.[0] ?? "SPFC",
        accent: "#111111",
        frameStyle: "geometric",
        paletteIndex: 2,
      },
      clean
    );
  }

  if (clean.includes("vasco")) {
    return applyCustomFrame(
      {
        slug: clean,
        label: clean.toUpperCase(),
        border: "#111111",
        topBg: "#111111",
        topFg: "#ffffff",
        nameFont: '"Bebas Neue", "Arial Narrow", sans-serif',
        badge: clean.match(/\d{2,4}/)?.[0] ?? "CRVG",
        accent: "#c8102e",
        frameStyle: "shield",
        paletteIndex: 0,
      },
      clean
    );
  }

  if (clean.includes("gremio")) {
    return applyCustomFrame(
      {
        slug: clean,
        label: clean.toUpperCase(),
        border: "#0d80bf",
        topBg: "#0d80bf",
        topFg: "#ffffff",
        nameFont: '"Bebas Neue", "Arial Narrow", sans-serif',
        badge: clean.match(/\d{2,4}/)?.[0] ?? "FBPA",
        accent: "#111111",
        frameStyle: "waves",
        paletteIndex: 0,
      },
      clean
    );
  }

  if (clean.includes("cruzeiro")) {
    return applyCustomFrame(
      {
        slug: clean,
        label: clean.toUpperCase(),
        border: "#003a70",
        topBg: "#003a70",
        topFg: "#ffffff",
        nameFont: '"Bebas Neue", "Arial Narrow", sans-serif',
        badge: clean.match(/\d{2,4}/)?.[0] ?? "CRU",
        accent: "#ffd60a",
        frameStyle: "shield",
        paletteIndex: 1,
      },
      clean
    );
  }

  if (clean.includes("santos")) {
    return applyCustomFrame(
      {
        slug: clean,
        label: clean.toUpperCase(),
        border: "#111111",
        topBg: "#ffffff",
        topFg: "#111111",
        nameFont: '"Bebas Neue", "Arial Narrow", sans-serif',
        badge: clean.match(/\d{2,4}/)?.[0] ?? "SFC",
        accent: "#111111",
        frameStyle: "geometric",
        paletteIndex: 0,
      },
      clean
    );
  }

  if (clean.includes("copa")) {
    return applyCustomFrame(
      {
        slug: clean,
        label: clean.toUpperCase(),
        border: "#0b6b3a",
        topBg: "#ffd60a",
        topFg: "#002776",
        nameFont: '"Rubik Mono One", "Bebas Neue", sans-serif',
        badge: clean.match(/\d{2,4}/)?.[0] ?? "COPA",
        accent: "#009c3b",
        frameStyle: "arcade_neon",
        paletteIndex: 1,
      },
      clean
    );
  }

  return applyCustomFrame(THEMES.fundador, clean);
}

export const FOUNDER_PACK_SLUG = "fundador";

export const CUP_PACKS: PackTheme[] = [
  THEMES["copa-90"],
  THEMES["copa-94"],
  THEMES["copa-98"],
];

export const ALL_PRESET_PACKS: PackTheme[] = Object.values(THEMES);

export const DEFAULT_CUP_PACK = "copa-90";

