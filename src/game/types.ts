export type Position =
  | "GOL" | "LD" | "ZAD" | "ZAE" | "LE"
  | "VOL" | "M8" | "M10" | "PD" | "PE" | "ATA";

export const POSITIONS: Position[] = [
  "GOL","LD","ZAD","ZAE","LE","VOL","M8","M10","PD","PE","ATA",
];

export const POSITION_LABELS: Record<Position, string> = {
  GOL: "GOLEIRO",
  LD: "LATERAL DIREITO",
  ZAD: "ZAGUEIRO DIREITO",
  ZAE: "ZAGUEIRO ESQUERDO",
  LE: "LATERAL ESQUERDO",
  VOL: "VOLANTE",
  M8: "MEIA 8",
  M10: "MEIA 10",
  PD: "PONTA DIREITA",
  PE: "PONTA ESQUERDA",
  ATA: "ATACANTE",
};

// Short position codes for constrained spaces (small card header).
export const POSITION_SHORT: Record<Position, string> = {
  GOL: "GOL",
  LD: "LD",
  ZAD: "ZAD",
  ZAE: "ZAE",
  LE: "LE",
  VOL: "VOL",
  M8: "MEI 8",
  M10: "MEI 10",
  PD: "PD",
  PE: "PE",
  ATA: "ATA",
};

export type AttrKey =
  | "passe" | "defesa" | "fisico"
  | "posicionamento" | "reflexo"
  | "conducao"
  | "criacao" | "finalizacao" | "velocidade" | "drible";

export const ATTR_LABELS: Record<AttrKey, string> = {
  defesa: "DEFESA",
  posicionamento: "POSICIONAMENTO",
  reflexo: "REFLEXO",
  conducao: "CONDUÇÃO",
  passe: "PASSE",
  fisico: "FÍSICO",
  criacao: "CRIAÇÃO",
  finalizacao: "FINALIZAÇÃO",
  velocidade: "VELOCIDADE",
  drible: "DRIBLE",
};

export type Card = {
  id: string;
  name: string;
  position: Position;
  ovr: number;
  attrs: Partial<Record<AttrKey, number>>;
  quote: string;
  cardNumber?: number;
  packSlug?: string;
  imageUrl?: string | null;
  clubBadgeUrl?: string | null;
};

export type Trap = "AMARELO" | "IMPEDIMENTO" | "PENALTI";

export const TRAP_LABELS: Record<Trap, string> = {
  AMARELO: "CARTÃO AMARELO",
  IMPEDIMENTO: "IMPEDIMENTO",
  PENALTI: "PÊNALTI",
};

export type Side = "P" | "AI";

export type Difficulty = "EASY" | "NORMAL" | "HARD";

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  EASY: "FÁCIL",
  NORMAL: "NORMAL",
  HARD: "DIFÍCIL",
};

export type RoundLog = {
  pCardName: string;
  aiCardName: string;
  chooser: "P" | "AI";
  attr: AttrKey | null;
  pValue: number;
  aiValue: number;
  trap: { by: "P" | "AI"; type: Trap } | null;
  trapEffect?: string;
  winner: "P" | "AI" | "DRAW" | "VOID";
  penalty?: { playerDir: number; aiDir: number; result: "GOL" | "DEFENDEU" };
};

export type PositionResult = {
  position: Position;
  pScore: number;
  aiScore: number;
  winner: "P" | "AI" | "DRAW";
  rounds: RoundLog[];
};

export type LastResult = {
  goals: { p: number; ai: number };
  difficulty: Difficulty;
  positions: PositionResult[];
  at: number;
};

// Canonical order used both on the card and on the attribute buttons.
// Keeping a single source of truth prevents "botões em ordem invertida à carta".
export function attrsForPosition(pos: Position): AttrKey[] {
  if (pos === "GOL")
    return ["defesa", "posicionamento", "reflexo"];
  if (pos === "VOL")
    return ["conducao", "passe", "defesa"];
  if (pos === "M10")
    return ["criacao", "passe", "finalizacao"];
  if (["LD", "ZAD", "ZAE", "LE"].includes(pos))
    return ["defesa", "passe", "fisico"];
  if (pos === "M8")
    return ["criacao", "passe", "defesa"];
  return ["finalizacao", "drible", "velocidade"];
}
