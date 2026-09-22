import { useState, useMemo } from "react";
import { cardBelongsToPack, type DBCard, type DBPack } from "@/game/cardsRepo";
import { POSITIONS, POSITION_LABELS, POSITION_SHORT, type Position } from "@/game/types";
import { CardView } from "@/game/components/CardView";
import { getPackTheme } from "@/game/packThemes";

type Props = {
  cards: DBCard[];
  packs: DBPack[];
  onEdit: (c: DBCard) => void;
  onDelete: (id: string) => void;
};

type ViewMode = "gallery" | "table";

export function CardsTab({ cards, packs, onEdit, onDelete }: Props) {
  const [side, setSide] = useState<"ALL" | "P" | "AI">("ALL");
  const [pos, setPos] = useState<"ALL" | Position>("ALL");
  const [tier, setTier] = useState<"ALL" | 0 | 1 | 2>("ALL");
  const [packFilter, setPackFilter] = useState<"ALL" | string>("ALL");
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("gallery");
  const [previewCardModal, setPreviewCardModal] = useState<DBCard | null>(null);

  const posOrder = useMemo(() => {
    const map: Record<string, number> = {};
    POSITIONS.forEach((p, i) => (map[p] = i));
    return map;
  }, []);

  const packById = useMemo(() => {
    const m: Record<string, DBPack> = {};
    for (const p of packs) {
      m[p.id] = p;
      m[p.slug] = p;
      if (p.slug === "fundador") m["founder"] = p;
    }
    return m;
  }, [packs]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cards
      .filter((c) => side === "ALL" || c.side === side)
      .filter((c) => pos === "ALL" || c.position === pos)
      .filter((c) => tier === "ALL" || c.tier === tier)
      .filter((c) => packFilter === "ALL" || cardBelongsToPack(c, packFilter, packs))
      .filter((c) => !q || c.name.toLowerCase().includes(q) || (c.real_name ?? "").toLowerCase().includes(q))
      .sort((a, b) => {
        if (a.side !== b.side) return a.side === "P" ? -1 : 1;
        const pa = posOrder[a.position] ?? 99;
        const pb = posOrder[b.position] ?? 99;
        if (pa !== pb) return pa - pb;
        return (b.ovr ?? 75) - (a.ovr ?? 75);
      });
  }, [cards, side, pos, tier, packFilter, query, posOrder, packs]);

  const total = cards.length;
  const filtersActive = side !== "ALL" || pos !== "ALL" || tier !== "ALL" || packFilter !== "ALL" || query !== "";

  function clearFilters() {
    setSide("ALL");
    setPos("ALL");
    setTier("ALL");
    setPackFilter("ALL");
    setQuery("");
  }

  function getPosBadge(position: Position) {
    if (position === "GOL") return "bg-emerald-950/80 text-emerald-300 border-emerald-800/60";
    if (["LD", "ZAD", "ZAE", "LE"].includes(position)) return "bg-blue-950/80 text-blue-300 border-blue-800/60";
    if (["VOL", "M8", "M10"].includes(position)) return "bg-amber-950/80 text-amber-300 border-amber-800/60";
    return "bg-rose-950/80 text-rose-300 border-rose-800/60"; // ATA, PD, PE
  }

  function getOvrBadge(ovr: number) {
    if (ovr >= 92) return "bg-amber-500/20 text-amber-300 border border-amber-500/50 font-bold shadow-sm shadow-amber-900/30";
    if (ovr >= 85) return "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-bold";
    if (ovr >= 80) return "bg-blue-500/20 text-blue-300 border border-blue-500/50 font-bold";
    return "bg-slate-800 text-slate-300 border border-slate-700";
  }

  return (
    <div className="space-y-5">
      
      {/* 1. FILTER & TOOLBAR CARD */}
      <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 md:p-5 shadow-sm space-y-4">
        
        {/* Top: Collection Quick Chips */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>COLEÇÕES & EDIÇÕES</span>
            <span className="text-[11px] text-slate-500">{packs.length} pacotes disponíveis</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
            <button
              onClick={() => setPackFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                packFilter === "ALL"
                  ? "bg-slate-100 text-slate-950 font-bold shadow"
                  : "bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              Todas as Coleções ({cards.length})
            </button>
            {packs.map((p) => {
              const count = cards.filter((c) => cardBelongsToPack(c, p.slug || p.id, packs)).length;
              const isSelected = packFilter === (p.slug || p.id);
              const theme = getPackTheme(p.slug);
              return (
                <button
                  key={p.id}
                  onClick={() => setPackFilter(p.slug || p.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? "bg-slate-100 text-slate-950 font-bold shadow"
                      : "bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-black/30"
                    style={{ backgroundColor: theme.border }}
                  />
                  <span>{p.name}{!p.is_active ? " 🔒(Oculto)" : ""}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded ${isSelected ? "bg-slate-300 text-slate-900" : "bg-slate-900 text-slate-400"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Middle: Side Filter, Secondary Selects & Search */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-3 border-t border-slate-800">
          
          {/* Side Selector Tabs (P vs AI) */}
          <div className="md:col-span-4 flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setSide("ALL")}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                side === "ALL" ? "bg-slate-800 text-white shadow-sm font-semibold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Todos ({cards.length})
            </button>
            <button
              onClick={() => setSide("P")}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                side === "P" ? "bg-emerald-600 text-white shadow-sm font-semibold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>👤 Jogador</span>
            </button>
            <button
              onClick={() => setSide("AI")}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                side === "AI" ? "bg-indigo-600 text-white shadow-sm font-semibold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>🤖 IA</span>
            </button>
          </div>

          {/* Position Selector */}
          <div className="md:col-span-3">
            <select
              value={pos}
              onChange={(e) => setPos(e.target.value as "ALL" | Position)}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="ALL">Todas as Posições</option>
              {POSITIONS.map((p) => (
                <option key={p} value={p}>
                  {p} — {POSITION_LABELS[p]}
                </option>
              ))}
            </select>
          </div>

          {/* Tier Selector */}
          <div className="md:col-span-2">
            <select
              value={tier === "ALL" ? "ALL" : String(tier)}
              onChange={(e) => setTier(e.target.value === "ALL" ? "ALL" : (Number(e.target.value) as 0 | 1 | 2))}
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="ALL">Todos os Tiers</option>
              <option value="0">T0 — Titular</option>
              <option value="1">T1 — Reserva</option>
              <option value="2">T2 — 3ª Opção</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="md:col-span-3 relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar jogador ou carta..."
              className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 placeholder:text-slate-500 rounded-xl pl-8 pr-8 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <span className="absolute left-2.5 top-2.5 text-slate-500 text-xs">🔍</span>
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300 text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Bottom Bar: Counter & View Mode Toggle */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">
              {rows.length} {rows.length === 1 ? "carta encontrada" : "cartas encontradas"}
            </span>
            {filtersActive && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-rose-400 hover:text-rose-300 underline ml-2 cursor-pointer"
              >
                Limpar filtros
              </button>
            )}
          </div>

          {/* View Mode Toggle: Grid vs Table */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode("gallery")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                viewMode === "gallery" ? "bg-slate-800 text-white font-semibold shadow-sm" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>🎴</span>
              <span>Galeria</span>
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                viewMode === "table" ? "bg-slate-800 text-white font-semibold shadow-sm" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>📋</span>
              <span>Tabela</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN CARDS VIEW (GALLERY OR TABLE) */}
      {viewMode === "gallery" ? (
        <div>
          {rows.length === 0 ? (
            <div className="py-16 text-center text-slate-500 space-y-2 bg-slate-900/40 border border-slate-800 rounded-2xl">
              <div className="text-3xl">🔍</div>
              <div className="text-sm font-medium text-slate-400">Nenhuma carta encontrada com esses filtros.</div>
              <button
                onClick={clearFilters}
                className="text-xs text-emerald-400 hover:underline cursor-pointer"
              >
                Limpar todos os filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {rows.map((c) => {
                const primaryPack = packs.find((p) => (c.pack_ids ?? []).includes(p.id) || (c.pack_ids ?? []).includes(p.slug));
                const theme = getPackTheme(primaryPack?.slug ?? c.pack_ids?.[0]);

                const cardObj = {
                  id: c.legacy_id ?? c.id,
                  name: c.name,
                  position: c.position,
                  ovr: c.ovr,
                  attrs: c.attrs as Partial<Record<import("@/game/types").AttrKey, number>>,
                  quote: c.quote ?? "",
                  cardNumber: c.card_number,
                  packSlug: primaryPack?.slug ?? c.pack_ids?.[0],
                };

                return (
                  <div
                    key={c.id}
                    className="group bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 rounded-2xl p-3 flex flex-col items-center justify-between shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 relative overflow-hidden"
                  >
                    {/* Top Chips */}
                    <div className="w-full flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getPosBadge(c.position)}`}>
                        {POSITION_SHORT[c.position]}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${getOvrBadge(c.ovr)}`}>
                          {c.ovr}
                        </span>
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md ${c.side === "P" ? "bg-emerald-950 text-emerald-400 border border-emerald-800/60" : "bg-indigo-950 text-indigo-400 border border-indigo-800/60"}`}>
                          {c.side === "P" ? "P" : "AI"}
                        </span>
                      </div>
                    </div>

                    {/* Miniature Live Card */}
                    <div
                      onClick={() => setPreviewCardModal(c)}
                      className="cursor-pointer transform group-hover:scale-102 transition-transform my-1"
                    >
                      <CardView card={cardObj} small />
                    </div>

                    {/* Athlete Real Name & Edition Tag */}
                    <div className="w-full mt-2.5 text-center">
                      <div className="text-xs font-bold text-slate-100 truncate" title={c.real_name || c.name}>
                        {c.real_name || "—"}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate flex items-center justify-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.border }} />
                        <span>{primaryPack?.name ?? "Fundador"}</span>
                      </div>
                    </div>

                    {/* Action Bar (Edit & Delete) */}
                    <div className="w-full mt-3 pt-2.5 border-t border-slate-800 flex gap-1.5 justify-between">
                      <button
                        onClick={() => onEdit(c)}
                        className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>✏️</span>
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => onDelete(c.id)}
                        className="py-1.5 px-2.5 bg-slate-800/50 hover:bg-rose-950 hover:text-rose-400 text-slate-400 rounded-lg text-xs transition-colors cursor-pointer"
                        title="Apagar carta"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* --- 📋 TABLE VIEW --- */
        <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                <tr>
                  <th className="p-3.5">Lado</th>
                  <th className="p-3.5 text-center">Pos</th>
                  <th className="p-3.5 text-center">Tier</th>
                  <th className="p-3.5">Nome na Carta</th>
                  <th className="p-3.5">Atleta Real</th>
                  <th className="p-3.5 text-center">OVR</th>
                  <th className="p-3.5">Atributos</th>
                  <th className="p-3.5">Coleções</th>
                  <th className="p-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {rows.map((c) => {
                  const primaryPack = packs.find((p) => (c.pack_ids ?? []).includes(p.id) || (c.pack_ids ?? []).includes(p.slug));
                  const theme = getPackTheme(primaryPack?.slug);

                  return (
                    <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          c.side === "P" ? "bg-emerald-950 text-emerald-400 border border-emerald-800/60" : "bg-indigo-950 text-indigo-400 border border-indigo-800/60"
                        }`}>
                          {c.side === "P" ? "Jogador" : "IA"}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getPosBadge(c.position)}`}>
                          {POSITION_SHORT[c.position]}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-mono text-slate-400">
                        T{c.tier}
                      </td>
                      <td className="p-3.5 font-bold text-white uppercase">
                        <button
                          onClick={() => setPreviewCardModal(c)}
                          className="hover:text-emerald-400 transition-colors text-left font-bold cursor-pointer"
                        >
                          {c.name}
                        </button>
                      </td>
                      <td className="p-3.5 text-slate-400">
                        {c.real_name || "—"}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${getOvrBadge(c.ovr)}`}>
                          {c.ovr}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(c.attrs).map(([k, v]) => (
                            <span key={k} className="bg-slate-950 px-1.5 py-0.5 rounded text-[10px] border border-slate-800 text-slate-400 font-mono">
                              {k.slice(0, 3)}:<b className="text-slate-200">{v}</b>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1">
                          {c.pack_ids.map((id) => {
                            const p = packById[id];
                            const pTheme = getPackTheme(p?.slug || id);
                            return (
                              <span
                                key={id}
                                className="text-[10px] px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 flex items-center gap-1.5 text-slate-300"
                              >
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pTheme.border }} />
                                <span>{p?.name ?? id}</span>
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => onEdit(c)}
                          className="px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white rounded-lg mr-1.5 transition-colors cursor-pointer"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => onDelete(c.id)}
                          className="px-2.5 py-1 text-xs font-semibold bg-slate-800/50 hover:bg-rose-950 text-slate-400 hover:text-rose-300 rounded-lg transition-colors cursor-pointer"
                        >
                          Apagar
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500">
                      Nenhuma carta encontrada com os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. FULL-SIZE PREVIEW MODAL */}
      {previewCardModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewCardModal(null)}
        >
          <div
            className="bg-slate-900 border border-slate-800 p-6 max-w-sm w-full rounded-2xl shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Visualização da Carta</span>
              <button
                onClick={() => setPreviewCardModal(null)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="flex justify-center py-2">
              <CardView
                card={{
                  id: previewCardModal.legacy_id ?? previewCardModal.id,
                  name: previewCardModal.name,
                  position: previewCardModal.position,
                  ovr: previewCardModal.ovr,
                  attrs: previewCardModal.attrs as Partial<Record<import("@/game/types").AttrKey, number>>,
                  quote: previewCardModal.quote ?? "",
                  cardNumber: previewCardModal.card_number,
                  packSlug: previewCardModal.pack_ids?.[0],
                }}
              />
            </div>
            <div className="text-center pt-2">
              <button
                onClick={() => {
                  const target = previewCardModal;
                  setPreviewCardModal(null);
                  onEdit(target);
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition-colors shadow-md shadow-emerald-950 cursor-pointer"
              >
                ✏️ Editar Esta Carta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
