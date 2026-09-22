import { useState } from "react";
import type { DBPack, UpsertPackInput } from "@/game/cardsRepo";
import { FOUNDER_SLUG } from "@/game/cardsRepo";
import { getPackTheme } from "@/game/packThemes";
import { CardView } from "@/game/components/CardView";

type Props = {
  packs: DBPack[];
  counts: Record<string, number>;
  editing: Partial<DBPack> | null;
  onNew: () => void;
  onEdit: (p: DBPack) => void;
  onCancelEdit: () => void;
  onSave: (input: UpsertPackInput) => void;
  onDelete: (id: string) => void;
};

export function PacksTab({
  packs,
  counts,
  editing,
  onNew,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
}: Props) {
  const [viewingFramePack, setViewingFramePack] = useState<DBPack | null>(null);

  return (
    <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 md:p-6 space-y-5 shadow-sm">
      
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="text-base font-bold text-white flex items-center gap-2">
            <span>📦</span>
            <span>Pacotes & Molduras Temáticas</span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            Gerencie as coleções do jogo e inspecione as molduras visuais de cada época.
          </div>
        </div>
        <button
          onClick={onNew}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-950/60 transition-all cursor-pointer"
        >
          <span>+</span>
          <span>Novo Pacote</span>
        </button>
      </div>

      {/* Table of Packs */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              <tr>
                <th className="p-3.5">Nome da Coleção</th>
                <th className="p-3.5">Slug (Identificador)</th>
                <th className="p-3.5 text-center">Moldura Visual</th>
                <th className="p-3.5 text-center">Cartas</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Ordem</th>
                <th className="p-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {packs.map((p) => {
                const isFounder = p.slug === FOUNDER_SLUG;
                const theme = getPackTheme(p.slug);
                return (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-bold text-white">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/40 flex-shrink-0 shadow-sm"
                          style={{ backgroundColor: theme.border }}
                          title={`Cor da borda: ${theme.border}`}
                        />
                        <span>{p.name}</span>
                        {isFounder && (
                          <span className="text-[10px] text-amber-300 bg-amber-950 border border-amber-800/60 px-1.5 py-0.5 rounded">
                            Padrão
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-slate-400 text-xs">{p.slug}</td>
                    <td className="p-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => setViewingFramePack(p)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                        title="Ver moldura renderizada"
                      >
                        <span className="text-[10px] font-bold">
                          {theme.badge ? `[ ${theme.badge} ]` : "PADRÃO"}
                        </span>
                        <span>👁️ Ver Moldura</span>
                      </button>
                    </td>
                    <td className="p-3.5 text-center font-bold text-slate-200">{counts[p.id] ?? 0}</td>
                    <td className="p-3.5 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        p.is_active ? "bg-emerald-950 text-emerald-400 border border-emerald-800/60" : "bg-rose-950 text-rose-400 border border-rose-800/60"
                      }`}>
                        {p.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="p-3.5 text-center font-mono text-slate-400">{p.sort_order}</td>
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => onEdit(p)}
                        className="px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white rounded-lg mr-1.5 transition-colors cursor-pointer"
                      >
                        Editar
                      </button>
                      {!isFounder && (
                        <button
                          onClick={() => onDelete(p.id)}
                          className="px-2.5 py-1 text-xs font-semibold bg-slate-800/50 hover:bg-rose-950 text-slate-400 hover:text-rose-300 rounded-lg transition-colors cursor-pointer"
                        >
                          Apagar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {packs.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Nenhum pacote cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PACK EDITOR FORM */}
      {editing && (
        <PackEditor initial={editing} onCancel={onCancelEdit} onSave={onSave} />
      )}

      {/* FRAME VIEWER MODAL */}
      {viewingFramePack && (
        <FrameViewerModal
          pack={viewingFramePack}
          cardCount={counts[viewingFramePack.id] ?? 0}
          onClose={() => setViewingFramePack(null)}
        />
      )}
    </div>
  );
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function PackEditor({
  initial,
  onCancel,
  onSave,
}: {
  initial: Partial<DBPack>;
  onCancel: () => void;
  onSave: (input: UpsertPackInput) => void;
}) {
  const [name, setName] = useState(initial.name ?? "");
  const [slug, setSlug] = useState(initial.slug ?? "");
  const [description, setDescription] = useState<string>(initial.description ?? "");
  const [sortOrder, setSortOrder] = useState<number>(initial.sort_order ?? 0);
  const [isActive, setIsActive] = useState<boolean>(initial.is_active ?? true);
  const [slugTouched, setSlugTouched] = useState(!!initial.slug);

  function onNameChange(v: string) {
    setName(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = slugify(slug);
    if (!name.trim() || !clean) return;
    onSave({
      id: initial.id,
      name: name.trim(),
      slug: clean,
      description: description.trim(),
      sort_order: sortOrder,
      is_active: isActive,
    });
  }

  const cleanSlug = slugify(slug);
  const liveTheme = getPackTheme(cleanSlug);

  const demoCard = {
    id: "demo-editor-card",
    name: name.trim() || "CRAQUE RETRÔ",
    position: "ATA" as const,
    ovr: 89,
    attrs: {
      finalizacao: 91,
      velocidade: 88,
      drible: 88,
    },
    quote: `Figurinha oficial com a moldura do pacote ${name.trim() || "Novo Pack"}.`,
    cardNumber: 10,
    packSlug: cleanSlug,
  };

  return (
    <form onSubmit={submit} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 md:p-6 space-y-4 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="text-sm font-bold text-white flex items-center gap-2">
          <span>{initial.id ? "✏️" : "➕"}</span>
          <span>{initial.id ? "Editar Pacote & Moldura" : "Novo Pacote & Moldura"}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6 items-start">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <div className="text-xs font-semibold text-slate-300 mb-1.5">Nome do Pacote</div>
              <input
                required
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-white rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="Ex: Parque São Jorge 90"
              />
            </label>
            <label className="block">
              <div className="text-xs font-semibold text-slate-300 mb-1.5">Slug (Identificador Único)</div>
              <input
                required
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugTouched(true);
                }}
                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-white font-mono text-xs rounded-xl px-3.5 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="ex: parque-sao-jorge-90"
              />
              <div className="mt-1 text-[11px] text-slate-500">
                Determina o tema visual da moldura (ex: parque-sao-jorge-90, copa-90, copa-94).
              </div>
            </label>
          </div>

          <label className="block">
            <div className="text-xs font-semibold text-slate-300 mb-1.5">Descrição da Coleção</div>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-white rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="Ex: Elenco lendário do título brasileiro de 1990"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <div className="text-xs font-semibold text-slate-300 mb-1.5">Ordem de Exibição</div>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-white rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </label>
            <label className="block">
              <div className="text-xs font-semibold text-slate-300 mb-1.5">Visibilidade no Jogo</div>
              <select
                value={isActive ? "1" : "0"}
                onChange={(e) => setIsActive(e.target.value === "1")}
                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-white rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="1">Sim (Ativo no Jogo)</option>
                <option value="0">Não (Oculto)</option>
              </select>
            </label>
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-md shadow-emerald-950 cursor-pointer"
            >
              Salvar Pacote
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl border border-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>

        {/* Live Moldura in Editor */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col items-center gap-3">
          <div className="text-xs font-bold text-slate-300 text-center">
            Prévia da Moldura
          </div>
          <CardView card={demoCard} small />
          <div className="text-[11px] text-slate-400 text-center space-y-1 mt-1">
            <div>Cor da Borda: <span className="font-mono font-bold text-white">{liveTheme.border}</span></div>
            <div>Badge no Topo: <b className="text-white">{liveTheme.badge ?? "Nenhum"}</b></div>
          </div>
        </div>
      </div>
    </form>
  );
}

function FrameViewerModal({
  pack,
  cardCount,
  onClose,
}: {
  pack: DBPack;
  cardCount: number;
  onClose: () => void;
  onClose?: () => void;
}) {
  const theme = getPackTheme(pack.slug);

  const sampleCard = {
    id: "sample-view",
    name: "CRAQUE HISTÓRICO",
    position: "ATA" as const,
    ovr: 92,
    attrs: {
      finalizacao: 94,
      velocidade: 91,
      drible: 90,
    },
    quote: `Moldura e figurinha oficial da coleção "${pack.name}".`,
    cardNumber: 10,
    packSlug: pack.slug,
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 p-6 max-w-lg w-full shadow-2xl space-y-5 rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>🖼️</span>
              <span>Visualizador de Moldura Oficial</span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Pacote: <b className="text-slate-200">{pack.name}</b> (slug: <code className="font-mono text-emerald-400">{pack.slug}</code>)
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Center: Live Rendered Full-Size Card */}
        <div className="flex justify-center py-2">
          <div className="transform transition-transform hover:scale-105 duration-200">
            <CardView card={sampleCard} />
          </div>
        </div>

        {/* Moldura Specs */}
        <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2 text-xs text-slate-300">
          <div className="font-semibold text-slate-200 border-b border-slate-800 pb-1.5 text-xs uppercase tracking-wider">
            Especificações Técnicas da Moldura
          </div>
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <div className="flex items-center gap-2">
              <span
                className="w-4 h-4 rounded border border-black/40 flex-shrink-0"
                style={{ backgroundColor: theme.border }}
              />
              <span><b>Cor da Borda:</b> {theme.border}</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="w-4 h-4 rounded border border-black/40 flex-shrink-0"
                style={{ backgroundColor: theme.topBg }}
              />
              <span><b>Topo da Carta:</b> {theme.topBg}</span>
            </div>
            <div>
              <b>Badge do Topo:</b>{" "}
              <span className="font-mono text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-white ml-1">
                {theme.badge ?? "Nenhum"}
              </span>
            </div>
            <div>
              <b>Total de Cartas:</b> <span className="text-white font-bold">{cardCount}</span>
            </div>
          </div>
        </div>

        <div className="text-center pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Fechar Visualizador
          </button>
        </div>
      </div>
    </div>
  );
}
