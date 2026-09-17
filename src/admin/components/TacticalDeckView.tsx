import { useState } from "react";
import { cardBelongsToPack, type DBCard, type DBPack } from "@/game/cardsRepo";
import { POSITIONS, POSITION_LABELS, POSITION_SHORT, type Position } from "@/game/types";

type Props = {
  cards: DBCard[];
  packs: DBPack[];
  onEditCard: (card: DBCard) => void;
  onNewCardForPosition: (pos: Position, packId?: string, side?: "P" | "AI") => void;
};

export function TacticalDeckView({
  cards,
  packs,
  onEditCard,
  onNewCardForPosition,
}: Props) {
  const [selectedPackId, setSelectedPackId] = useState<string>("all");
  const [selectedSide, setSelectedSide] = useState<"P" | "AI">("P");

  // Filter cards by side and pack
  const filteredCards = cards.filter((c) => {
    if (c.side !== selectedSide) return false;
    if (selectedPackId === "all") return true;
    return cardBelongsToPack(c, selectedPackId, packs);
  });

  // Count per position
  const cardsByPos: Record<Position, DBCard[]> = {
    GOL: [],
    LD: [],
    ZAD: [],
    ZAE: [],
    LE: [],
    VOL: [],
    M8: [],
    M10: [],
    PD: [],
    PE: [],
    ATA: [],
  };

  filteredCards.forEach((c) => {
    if (cardsByPos[c.position]) {
      cardsByPos[c.position].push(c);
    }
  });

  const totalCardsInView = filteredCards.length;
  const targetPerPos = 3;
  const fullPositionsCount = POSITIONS.filter((p) => cardsByPos[p].length >= targetPerPos).length;

  return (
    <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 md:p-6 space-y-6 shadow-sm">
      
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="text-base font-bold text-white flex items-center gap-2">
            <span>📋</span>
            <span>Visor Tático · 11 Posições do Deck</span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            Inspetor de cobertura e completude do elenco por posição em campo.
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setSelectedSide("P")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                selectedSide === "P"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              👤 Jogador (P)
            </button>
            <button
              onClick={() => setSelectedSide("AI")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                selectedSide === "AI"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              🤖 IA (AI)
            </button>
          </div>

          <select
            value={selectedPackId}
            onChange={(e) => setSelectedPackId(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">📦 Todos os Pacotes</option>
            {packs.map((p) => (
              <option key={p.id} value={p.id}>
                📦 {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Progress & Quick Stats */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="text-xs text-slate-300">
          Total de cartas filtradas: <b className="text-white">{totalCardsInView}</b> {selectedPackId !== "all" ? `(meta: 33 sugeridas)` : ""}
        </div>
        <div className="text-xs flex items-center gap-2">
          <span className="text-slate-400">Posições cobertas:</span>
          <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${
            fullPositionsCount === 11 ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
          }`}>
            {fullPositionsCount} / 11 completas
          </span>
        </div>
      </div>

      {/* 11 Positions Tactical Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {POSITIONS.map((pos) => {
          const posCards = cardsByPos[pos];
          const isComplete = posCards.length >= targetPerPos;
          const isEmpty = posCards.length === 0;

          return (
            <div
              key={pos}
              className={`border rounded-2xl p-4 flex flex-col justify-between transition-all ${
                isEmpty
                  ? "border-dashed border-rose-900/50 bg-rose-950/20"
                  : isComplete
                  ? "border-emerald-800/60 bg-emerald-950/20"
                  : "border-slate-800 bg-slate-900/80"
              }`}
            >
              {/* Position Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold bg-slate-800 text-slate-200 border border-slate-700 px-2 py-0.5 rounded-md">
                    {POSITION_SHORT[pos]}
                  </span>
                  <span className="text-xs font-semibold text-slate-300">
                    {POSITION_LABELS[pos]}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    isEmpty
                      ? "bg-rose-950 text-rose-300 border border-rose-800/60"
                      : isComplete
                      ? "bg-emerald-950 text-emerald-300 border border-emerald-800/60"
                      : "bg-amber-950 text-amber-300 border border-amber-800/60"
                  }`}
                >
                  {posCards.length} {posCards.length === 1 ? "carta" : "cartas"}
                </span>
              </div>

              {/* Card List for this position */}
              <div className="py-3 space-y-2 flex-1 min-h-[90px]">
                {posCards.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-500 italic">
                    Nenhuma carta cadastrada nesta posição.
                  </div>
                ) : (
                  posCards.map((c) => {
                    const avgOvr = c.attrs
                      ? Math.round(
                          Object.values(c.attrs).reduce((a, b) => a + (typeof b === "number" ? b : 0), 0) /
                            Math.max(1, Object.keys(c.attrs).length)
                        )
                      : 75;

                    return (
                      <div
                        key={c.id}
                        onClick={() => onEditCard(c)}
                        className="flex items-center justify-between p-2.5 bg-slate-950/80 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 cursor-pointer rounded-xl transition-colors text-xs group"
                        title="Clique para editar"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-[11px] text-emerald-400 font-semibold truncate">
                            {c.real_name || "—"}
                          </span>
                          <span className="font-bold truncate text-slate-200 uppercase text-[11px]">
                            {c.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[10px] font-bold bg-slate-800 group-hover:bg-emerald-600 text-slate-200 group-hover:text-white px-1.5 py-0.5 rounded transition-colors">
                            {avgOvr}
                          </span>
                          <span className="text-[10px] text-slate-500 group-hover:text-slate-300">✏️</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Quick Add Button */}
              <button
                type="button"
                onClick={() =>
                  onNewCardForPosition(
                    pos,
                    selectedPackId !== "all" ? selectedPackId : undefined,
                    selectedSide
                  )
                }
                className="w-full mt-2 text-xs font-semibold py-2 bg-slate-800/80 hover:bg-emerald-600 text-slate-300 hover:text-white rounded-xl border border-slate-700/60 hover:border-emerald-500 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>+</span>
                <span>Nova Carta em {POSITION_SHORT[pos]}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
