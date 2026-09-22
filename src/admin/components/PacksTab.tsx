import { useState, useEffect } from "react";
import type { DBPack, UpsertPackInput } from "@/game/cardsRepo";
import { FOUNDER_SLUG } from "@/game/cardsRepo";
import {
  getPackTheme,
  FRAME_STYLES,
  BASE_NAVY_PALETTES,
  type FrameStyle,
  parseFrameFromDescription,
  embedFrameInDescription,
  setCustomFrameConfig,
} from "@/game/packThemes";
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

  // Sincroniza metadados de molduras embutidos na descrição dos pacotes
  useEffect(() => {
    for (const p of packs) {
      const parsed = parseFrameFromDescription(p.description);
      if (parsed.frameConfig) {
        setCustomFrameConfig(
          p.slug,
          parsed.frameConfig.frameStyle,
          parsed.frameConfig.paletteIndex,
          parsed.frameConfig.colors
        );
      }
    }
  }, [packs]);

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
            Gerencie as coleções do jogo e personalize os 5 desenhos de molduras e 3 opções de cores (base #0a0f1f).
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
                <th className="p-3.5">Slug</th>
                <th className="p-3.5 text-center">Moldura & Estilo</th>
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
                const frameMeta = FRAME_STYLES.find((f) => f.id === theme.frameStyle) ?? FRAME_STYLES[0];
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
                      <div className="mt-1">
                        {p.exclusive_to ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-300 bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 rounded-full">
                            <span>⭐ Exclusivo:</span>
                            <b className="text-white font-mono">{p.exclusive_to}</b>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 bg-slate-900/60 border border-slate-800 px-1.5 py-0.5 rounded">
                            Público (Todos)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-slate-400 text-xs">{p.slug}</td>
                    <td className="p-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => setViewingFramePack(p)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                        title="Ver moldura renderizada com desenho oficial"
                      >
                        <span className="text-sm">{frameMeta.icon}</span>
                        <span className="text-[11px] font-bold">{frameMeta.name}</span>
                        <div className="flex items-center gap-0.5 ml-1">
                          <span className="w-2 h-2 rounded-full border border-black/30" style={{ backgroundColor: theme.border }} />
                          <span className="w-2 h-2 rounded-full border border-black/30" style={{ backgroundColor: theme.topBg }} />
                          <span className="w-2 h-2 rounded-full border border-black/30" style={{ backgroundColor: theme.accent }} />
                        </div>
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
  const initialMeta = parseFrameFromDescription(initial.description);
  const initialTheme = getPackTheme(initial.slug);

  const [name, setName] = useState(initial.name ?? "");
  const [slug, setSlug] = useState(initial.slug ?? "");
  const [description, setDescription] = useState<string>(
    initialMeta.cleanDescription || initial.description || ""
  );
  const [sortOrder, setSortOrder] = useState<number>(initial.sort_order ?? 0);
  const [isActive, setIsActive] = useState<boolean>(initial.is_active ?? true);
  const [exclusiveTo, setExclusiveTo] = useState<string>(initial.exclusive_to ?? "");
  const [slugTouched, setSlugTouched] = useState(!!initial.slug);

  const [frameStyle, setFrameStyle] = useState<FrameStyle>(
    initialMeta.frameConfig?.frameStyle ?? initialTheme.frameStyle ?? "waves"
  );
  const [paletteIndex, setPaletteIndex] = useState<number>(
    initialMeta.frameConfig?.paletteIndex ?? initialTheme.paletteIndex ?? 0
  );

  function onNameChange(v: string) {
    setName(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  const cleanSlug = slugify(slug || "novo-pack");

  // Atualiza cache em tempo real para o CardView renderizar a prévia imediatamente
  useEffect(() => {
    if (cleanSlug) {
      setCustomFrameConfig(cleanSlug, frameStyle, paletteIndex);
    }
  }, [cleanSlug, frameStyle, paletteIndex]);

  function handleSelectFrame(style: FrameStyle) {
    setFrameStyle(style);
    setCustomFrameConfig(cleanSlug, style, paletteIndex);
  }

  function handleSelectPalette(idx: number) {
    setPaletteIndex(idx);
    setCustomFrameConfig(cleanSlug, frameStyle, idx);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = slugify(slug);
    if (!name.trim() || !clean) return;

    setCustomFrameConfig(clean, frameStyle, paletteIndex);
    const finalDescription = embedFrameInDescription(description, frameStyle, paletteIndex);

    onSave({
      id: initial.id,
      name: name.trim(),
      slug: clean,
      description: finalDescription,
      sort_order: sortOrder,
      is_active: isActive,
      exclusive_to: exclusiveTo.trim() || null,
    });
  }

  const liveTheme = getPackTheme(cleanSlug);
  const activePalette = BASE_NAVY_PALETTES[paletteIndex] || BASE_NAVY_PALETTES[0];
  const activeFrameMeta = FRAME_STYLES.find((f) => f.id === frameStyle) || FRAME_STYLES[0];

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
    quote: `Figurinha oficial com a moldura ${activeFrameMeta.name} da coleção ${name.trim() || "Novo Pack"}.`,
    cardNumber: 10,
    packSlug: cleanSlug,
  };

  return (
    <form onSubmit={submit} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 md:p-6 space-y-5 shadow-2xl animate-in fade-in">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="text-sm font-bold text-white flex items-center gap-2">
          <span>{initial.id ? "✏️" : "➕"}</span>
          <span>{initial.id ? "Editar Pacote & Moldura" : "Novo Pacote & Moldura"}</span>
        </div>
        <span className="text-xs text-slate-400">
          Personalize formato, desenhos e trio de cores da carta
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_270px] gap-6 items-start">
        <div className="space-y-4">
          
          {/* Dados Básicos */}
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
            </label>
          </div>

          {/* 🖼️ SEÇÃO 1: TROCAR DE MOLDURA (5 MODELOS DE DESENHOS) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>🖼️</span>
                <span>Trocar de Moldura (5 Modelos com Desenhos)</span>
              </div>
              <span className="text-[11px] text-emerald-400 font-semibold">
                Selecionada: {activeFrameMeta.icon} {activeFrameMeta.name}
              </span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 pt-1">
              {FRAME_STYLES.map((f) => {
                const isSelected = frameStyle === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleSelectFrame(f.id)}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected
                        ? "bg-slate-800/90 border-emerald-500 shadow-md shadow-emerald-950/50 ring-1 ring-emerald-500"
                        : "bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-lg">{f.icon}</span>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      )}
                    </div>
                    <div className="text-xs font-bold text-white truncate">{f.name}</div>
                    <div className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 leading-tight">
                      {f.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 🎨 SEÇÃO 2: TROCAR DE COR (3 OPÇÕES COM 3 CORES BASEADAS EM #0a0f1f) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>🎨</span>
                <span>Trocar de Cor (3 Cores • Base Modelo #0a0f1f)</span>
              </div>
              <span className="text-[11px] text-cyan-400 font-mono">
                {activePalette.name}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {BASE_NAVY_PALETTES.map((pal, idx) => {
                const isSelected = paletteIndex === idx;
                return (
                  <button
                    key={pal.id}
                    type="button"
                    onClick={() => handleSelectPalette(idx)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-slate-800/90 border-cyan-400 shadow-md shadow-cyan-950/50 ring-1 ring-cyan-400"
                        : "bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-white">{pal.name}</span>
                      {isSelected && (
                        <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-1.5 py-0.2 rounded font-semibold">
                          Ativa
                        </span>
                      )}
                    </div>
                    {/* Exibição das 3 Cores Lado a Lado */}
                    <div className="flex items-center gap-1.5 p-1.5 bg-slate-950 rounded-lg border border-slate-800/80">
                      <div
                        className="flex-1 h-6 rounded flex items-center justify-center text-[8px] font-mono font-bold text-white/90 border border-white/20 shadow-inner"
                        style={{ backgroundColor: pal.colors[0] }}
                        title={`Cor 1 (Borda/Base): ${pal.colors[0]}`}
                      >
                        Borda
                      </div>
                      <div
                        className="flex-1 h-6 rounded flex items-center justify-center text-[8px] font-mono font-bold text-white/90 border border-white/20 shadow-inner"
                        style={{ backgroundColor: pal.colors[1] }}
                        title={`Cor 2 (Topo): ${pal.colors[1]}`}
                      >
                        Topo
                      </div>
                      <div
                        className="flex-1 h-6 rounded flex items-center justify-center text-[8px] font-mono font-bold text-slate-900 border border-white/20 shadow-inner"
                        style={{ backgroundColor: pal.colors[2] }}
                        title={`Cor 3 (Destaque/Accent): ${pal.colors[2]}`}
                      >
                        Acento
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
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

          {/* Seção de Exclusividade para Apoiadores Financeiros */}
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3.5 space-y-2">
            <label className="block">
              <div className="text-xs font-semibold text-amber-300 flex items-center gap-1.5 mb-1">
                <span>⭐</span>
                <span>Apoiador Financeiro Exclusivo (E-mail ou Nickname)</span>
              </div>
              <input
                value={exclusiveTo}
                onChange={(e) => setExclusiveTo(e.target.value)}
                className="w-full bg-slate-900 border border-amber-500/40 hover:border-amber-400 text-amber-200 placeholder-slate-500 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                placeholder="Ex: apoiador@gmail.com ou NicknameDoApoiador (vazio = pacote público para todos)"
              />
            </label>
            <div className="text-[11px] text-amber-200/70 leading-relaxed">
              🔒 <b>Regras Automáticas de Exclusividade:</b> Se preenchido, <b>apenas</b> este jogador terá acesso ao baralho. Suas cartas <b>nunca</b> sairão em pacotes da banca, <b>não</b> poderão ser vendidas e <b>não</b> poderão ser negociadas no mercado.
            </div>
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
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col items-center gap-3 sticky top-4">
          <div className="text-xs font-bold text-slate-300 text-center flex items-center gap-1.5">
            <span>👁️</span>
            <span>Prévia em Tempo Real</span>
          </div>

          <div className="transform transition-transform hover:scale-105 duration-200 py-1">
            <CardView card={demoCard} small />
          </div>

          <div className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-[11px] text-slate-400 space-y-1.5">
            <div className="flex justify-between items-center">
              <span>Desenho:</span>
              <b className="text-white flex items-center gap-1">
                <span>{activeFrameMeta.icon}</span>
                <span>{activeFrameMeta.name}</span>
              </b>
            </div>
            <div className="flex justify-between items-center">
              <span>Cor da Borda:</span>
              <div className="flex items-center gap-1.5 font-mono font-bold text-white">
                <span className="w-2.5 h-2.5 rounded-full border border-black/30" style={{ backgroundColor: liveTheme.border }} />
                <span>{liveTheme.border}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span>Cor do Topo:</span>
              <div className="flex items-center gap-1.5 font-mono font-bold text-white">
                <span className="w-2.5 h-2.5 rounded-full border border-black/30" style={{ backgroundColor: liveTheme.topBg }} />
                <span>{liveTheme.topBg}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span>Destaque/Acento:</span>
              <div className="flex items-center gap-1.5 font-mono font-bold text-white">
                <span className="w-2.5 h-2.5 rounded-full border border-black/30" style={{ backgroundColor: liveTheme.accent }} />
                <span>{liveTheme.accent}</span>
              </div>
            </div>
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
}) {
  const theme = getPackTheme(pack.slug);
  const frameMeta = FRAME_STYLES.find((f) => f.id === theme.frameStyle) ?? FRAME_STYLES[0];

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
    quote: `Moldura oficial "${frameMeta.name}" da coleção "${pack.name}".`,
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
              Coleção: <b className="text-slate-200">{pack.name}</b> (slug: <code className="font-mono text-emerald-400">{pack.slug}</code>)
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
        <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2.5 text-xs text-slate-300">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-semibold text-slate-200 text-xs uppercase tracking-wider">
              Especificações Técnicas da Moldura
            </span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span>{frameMeta.icon}</span>
              <span>{frameMeta.name}</span>
            </span>
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
            <div className="flex items-center gap-2">
              <span
                className="w-4 h-4 rounded border border-black/40 flex-shrink-0"
                style={{ backgroundColor: theme.accent }}
              />
              <span><b>Destaque/Acento:</b> {theme.accent}</span>
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
