import { useState, useEffect, useMemo } from "react";
import type { DBCard, DBPack, UpsertCardInput } from "@/game/cardsRepo";
import { FOUNDER_SLUG } from "@/game/cardsRepo";
import { POSITIONS, POSITION_LABELS, POSITION_SHORT, attrsForPosition, ATTR_LABELS, type Position } from "@/game/types";
import { CardView } from "@/game/components/CardView";
import { getPackTheme } from "@/game/packThemes";
import { getRarityFromOverall } from "@/types/cardScale";
import { getRetroNameSuggestions } from "@/game/retroNameSuggester";

type Props = {
  initial: Partial<DBCard>;
  packs: DBPack[];
  allCards: DBCard[];
  onCancel: () => void;
  onSave: (input: UpsertCardInput) => void;
  onSaveAndNew?: (input: UpsertCardInput) => void;
};

export function CardEditorModal({
  initial,
  packs,
  allCards,
  onCancel,
  onSave,
  onSaveAndNew,
}: Props) {
  // 1. Posição
  const [position, setPosition] = useState<Position>((initial.position as Position) ?? "GOL");
  const [side, setSide] = useState<"P" | "AI">(initial.side ?? "P");

  // 2. Deck (Coleção / Moldura)
  const [packIds, setPackIds] = useState<string[]>(() => {
    if (initial.pack_ids && initial.pack_ids.length > 0) return initial.pack_ids;
    // Default to first active pack or parque-sao-jorge-90
    const psj = packs.find((p) => p.slug === "parque-sao-jorge-90");
    return psj ? [psj.id, psj.slug] : packs[0] ? [packs[0].id, packs[0].slug] : ["parque-sao-jorge-90"];
  });

  // 3. Nome Real & 4. Nome Carta (Paródia)
  const [realName, setRealName] = useState(initial.real_name ?? "");
  const [name, setName] = useState(initial.name ?? "");
  const [lastAutoName, setLastAutoName] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // 5. Frase de Efeito
  const [quote, setQuote] = useState(initial.quote ?? "");

  // 6. Caricatura (Google Flow) & Escudo do Clube Fictício
  const [imageUrl, setImageUrl] = useState((initial as any).image_url ?? (initial.attrs as any)?._image_url ?? "");
  const [clubBadgeUrl, setClubBadgeUrl] = useState((initial as any).club_badge_url ?? (initial.attrs as any)?._club_badge_url ?? "");

  // Legacy ID (internal)
  const [legacyId] = useState(initial.legacy_id ?? "");

  // 6. Atributos (por posição)
  const attrKeys = useMemo(() => attrsForPosition(position), [position]);
  const [attrs, setAttrs] = useState<Record<string, number>>(() => {
    const base = { ...(initial.attrs ?? {}) } as Record<string, number>;
    const pos = (initial.position as Position) ?? "GOL";
    if (pos === "GOL") {
      if (base.posicionamento == null && base.passe != null) base.posicionamento = base.passe;
      if (base.reflexo == null && base.fisico != null) base.reflexo = base.fisico;
    } else if (pos === "VOL") {
      if (base.conducao == null && base.criacao != null) base.conducao = base.criacao;
    } else if (pos === "M10") {
      if (base.finalizacao == null && base.defesa != null) base.finalizacao = Math.min(99, base.defesa + 10);
    }
    for (const k of attrsForPosition(pos)) {
      if (base[k] == null) base[k] = 80;
    }
    return base;
  });

  // Sincroniza atributos quando a posição muda
  useEffect(() => {
    setAttrs((prev) => {
      const updated: Record<string, number> = {};
      if (position === "GOL") {
        updated.defesa = prev.defesa ?? 80;
        updated.posicionamento = prev.posicionamento ?? prev.passe ?? 80;
        updated.reflexo = prev.reflexo ?? prev.fisico ?? 80;
      } else if (position === "VOL") {
        updated.conducao = prev.conducao ?? prev.criacao ?? 80;
        updated.passe = prev.passe ?? prev.posicionamento ?? 80;
        updated.defesa = prev.defesa ?? 80;
      } else if (position === "M10") {
        updated.criacao = prev.criacao ?? prev.conducao ?? 80;
        updated.passe = prev.passe ?? prev.posicionamento ?? 80;
        updated.finalizacao = prev.finalizacao ?? (prev.defesa != null ? Math.min(99, prev.defesa + 10) : 80);
      } else {
        for (const k of attrKeys) {
          if (k === "criacao" && prev.conducao != null && prev.criacao == null) {
            updated.criacao = prev.conducao;
          } else if (k === "passe" && prev.posicionamento != null && prev.passe == null) {
            updated.passe = prev.posicionamento;
          } else if (k === "defesa" && prev.finalizacao != null && prev.defesa == null) {
            updated.defesa = Math.max(0, prev.finalizacao - 10);
          } else if (k === "fisico" && prev.reflexo != null && prev.fisico == null) {
            updated.fisico = prev.reflexo;
          } else {
            updated[k] = prev[k] ?? 80;
          }
        }
      }
      return updated;
    });
  }, [attrKeys, position]);

  // Overall (OVR) ponderado
  const ovr = useMemo(() => {
    const vals = attrKeys.map((k) => attrs[k] ?? 0);
    if (vals.length === 0) return 75;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [attrs, attrKeys]);

  const rarity = getRarityFromOverall(ovr);

  // Auto-complete inteligente: ao digitar o Nome Real, preenche automaticamente o Nome Carta
  function handleRealNameChange(val: string) {
    setRealName(val);
    const { primary, suggestions: suggs } = getRetroNameSuggestions(val);
    setSuggestions(suggs);

    // Se o nome da carta está vazio ou se o usuário ainda não personalizou manualmente
    if (primary && (!name || name === lastAutoName)) {
      const up = primary.toUpperCase();
      setName(up);
      setLastAutoName(up);
    }
  }

  function handlePickSuggestion(sugg: string) {
    const up = sugg.toUpperCase();
    setName(up);
    setLastAutoName(up);
  }

  function updateAttr(key: string, deltaOrVal: number, isDelta = false) {
    setAttrs((prev) => {
      const current = prev[key] ?? 75;
      const nextVal = isDelta ? Math.min(99, Math.max(1, current + deltaOrVal)) : Math.min(99, Math.max(1, deltaOrVal));
      return { ...prev, [key]: nextVal };
    });
  }

  function togglePack(p: DBPack) {
    setPackIds((cur) => {
      const has = cur.includes(p.id) || cur.includes(p.slug);
      if (has) {
        return cur.filter((x) => x !== p.id && x !== p.slug);
      }
      return [...cur, p.id, p.slug];
    });
  }

  function buildInput(): UpsertCardInput {
    return {
      id: initial.id,
      legacy_id: legacyId || null,
      side,
      position,
      tier: initial.id ? initial.tier : (ovr >= 85 ? 0 : ovr >= 75 ? 1 : 2),
      name: (name.trim() || realName.trim() || "CARTA").toUpperCase(),
      real_name: realName.trim() || null,
      attrs,
      quote: quote.trim(),
      pack_ids: packIds,
      image_url: imageUrl.trim() || null,
      club_badge_url: clubBadgeUrl.trim() || null,
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(buildInput());
  }

  function handleSaveNext() {
    if (!onSaveAndNew) return;
    onSaveAndNew(buildInput());
  }

  // Resolução do tema ativo da moldura
  const activePack =
    packs.find((p) => (packIds.includes(p.id) || packIds.includes(p.slug)) && p.slug !== FOUNDER_SLUG) ??
    packs.find((p) => packIds.includes(p.id) || packIds.includes(p.slug));
  const previewPackSlug = activePack?.slug;
  const activeTheme = getPackTheme(previewPackSlug);

  const previewCard = {
    id: initial.id ?? "preview",
    name: name.trim() || "NOME DA CARTA",
    position,
    ovr,
    attrs: attrs as Partial<Record<import("@/game/types").AttrKey, number>>,
    quote: quote.trim() || "Frase lendária do craque dos anos 90.",
    cardNumber: initial.card_number,
    packSlug: previewPackSlug,
    imageUrl: imageUrl.trim() || null,
    clubBadgeUrl: clubBadgeUrl.trim() || null,
  };

  function getPositionBadgeColor(p: Position) {
    if (p === "GOL") return "border-emerald-600/80 bg-emerald-950/90 text-emerald-300";
    if (["LD", "ZAD", "ZAE", "LE"].includes(p)) return "border-blue-600/80 bg-blue-950/90 text-blue-300";
    if (["VOL", "M8", "M10"].includes(p)) return "border-amber-600/80 bg-amber-950/90 text-amber-300";
    return "border-rose-600/80 bg-rose-950/90 text-rose-300";
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-7 shadow-2xl text-slate-100 mb-8">
      
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800/90 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-lg">
            {initial.id ? "✏️" : "⚡"}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">
              {initial.id ? `Editar Carta #${initial.card_number ?? ""}` : "Criar Nova Carta"}
            </h2>
            <p className="text-xs text-slate-400">
              Fluxo rápido e direto: selecione a posição, digite o jogador e salve.
            </p>
          </div>
        </div>

        {/* Lado (P / IA) selector */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <span className="text-[11px] font-semibold text-slate-400 px-2">Lado:</span>
          <button
            type="button"
            onClick={() => setSide("P")}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              side === "P" ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            Jogador (P)
          </button>
          <button
            type="button"
            onClick={() => setSide("AI")}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              side === "AI" ? "bg-purple-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            IA (AI)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: FORM FIELDS IN EXACT REQUESTED ORDER */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* 1. POSIÇÃO */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                1. Posição em Campo
              </label>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800/60">
                {POSITION_LABELS[position]}
              </span>
            </div>
            
            <div className="grid grid-cols-6 sm:grid-cols-11 gap-1.5">
              {POSITIONS.map((p) => {
                const isSelected = position === p;
                const badgeColor = getPositionBadgeColor(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPosition(p)}
                    className={`py-2 px-1 rounded-xl font-mono text-xs font-bold transition-all border cursor-pointer flex flex-col items-center justify-center ${
                      isSelected
                        ? `${badgeColor} ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-105 shadow-md`
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white"
                    }`}
                  >
                    <span>{POSITION_SHORT[p]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. DECK (COLEÇÃO / MOLDURA) */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              2. Deck / Coleção Temática
            </label>
            <div className="flex flex-wrap gap-2">
              {packs.map((p) => {
                const active = packIds.includes(p.id) || packIds.includes(p.slug) || (p.slug === FOUNDER_SLUG && packIds.includes("founder"));
                const theme = getPackTheme(p.slug);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePack(p)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer border ${
                      active
                        ? "bg-slate-100 text-slate-950 border-white shadow-md font-bold"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white"
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-black/40"
                      style={{ backgroundColor: theme.border }}
                    />
                    <span>{active ? "✓ " : ""}{p.name}{!p.is_active ? " 🔒(Oculto)" : ""}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. NOME REAL & 4. NOME CARTA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
            
            {/* 3. Nome Real */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                3. Nome Real
              </label>
              <input
                type="text"
                value={realName}
                onChange={(e) => handleRealNameChange(e.target.value)}
                placeholder="Ex: Dida, Ronaldo, Neto, Zetti..."
                className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-white rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none transition-all placeholder:text-slate-500"
              />
              <p className="text-[11px] text-slate-400">
                Ao digitar, o <b>Nome Carta</b> é preenchido automaticamente.
              </p>
            </div>

            {/* 4. Nome Carta */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  4. Nome Carta (Paródia Retrô)
                </label>
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.toUpperCase())}
                placeholder="Ex: DADI, RANOLDO, VETO..."
                className="w-full bg-slate-900 border border-emerald-600/70 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40 text-emerald-300 font-bold rounded-xl px-3.5 py-2.5 text-sm uppercase tracking-wide outline-none transition-all"
                required
              />
              
              {/* Suggestion Chips */}
              {suggestions.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-slate-500 font-semibold">Sugestões:</span>
                  {suggestions.map((sugg) => (
                    <button
                      key={sugg}
                      type="button"
                      onClick={() => handlePickSuggestion(sugg)}
                      className={`text-[11px] px-2 py-0.5 rounded-lg border transition-all cursor-pointer font-bold uppercase ${
                        name.toUpperCase() === sugg.toUpperCase()
                          ? "bg-emerald-600 text-white border-emerald-500 shadow"
                          : "bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500 hover:text-white"
                      }`}
                    >
                      {sugg.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 5. FRASE DE EFEITO */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              5. Frase de Efeito
            </label>
            <textarea
              rows={2}
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              placeholder="Citação ou frase marcante dos anos 90 impressa no verso da carta..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-200 rounded-xl px-3.5 py-2 text-xs outline-none transition-all placeholder:text-slate-500 resize-none"
            />
          </div>

          {/* 6. CARICATURA & ESCUDO FICTÍCIO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            {/* Imagem / Caricatura do Jogador */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                6. Caricatura do Jogador (URL)
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://... ou cole o link da foto do Google Flow"
                className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 text-slate-100 rounded-xl px-3 py-2 text-xs outline-none transition-all placeholder:text-slate-500"
              />
              <p className="text-[10px] text-slate-400 leading-tight">
                Gere a caricatura no Google Flow e cole o link da imagem aqui.
              </p>
            </div>

            {/* Escudo do Clube Fictício */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                7. Escudo do Clube Fictício
              </label>
              <input
                type="text"
                value={clubBadgeUrl}
                onChange={(e) => setClubBadgeUrl(e.target.value)}
                placeholder="URL da imagem ou emoji (ex: 🦁, ⚡, ⭐)"
                className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 text-slate-100 rounded-xl px-3 py-2 text-xs outline-none transition-all placeholder:text-slate-500"
              />
              
              {/* Sugestões rápidas de Brasões Fictícios */}
              <div className="flex items-center gap-1 flex-wrap pt-0.5">
                <span className="text-[9px] text-slate-500 font-semibold">Atalhos:</span>
                {["🦁", "🦅", "⚡", "⭐", "👑", "🛡️", "🐺", "⚽", "🔥", "🌪️", "⚓"].map((badge) => (
                  <button
                    key={badge}
                    type="button"
                    onClick={() => setClubBadgeUrl(badge)}
                    className="w-6 h-6 rounded bg-slate-800 hover:bg-cyan-600/40 border border-slate-700 flex items-center justify-center text-xs transition-colors cursor-pointer"
                    title={`Usar brasão ${badge}`}
                  >
                    {badge}
                  </button>
                ))}
                {clubBadgeUrl && (
                  <button
                    type="button"
                    onClick={() => setClubBadgeUrl("")}
                    className="text-[9px] text-rose-400 hover:underline ml-1"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 6. ATRIBUTOS (POR POSIÇÃO) */}
          <div className="space-y-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                6. Atributos da Posição ({POSITION_SHORT[position]})
              </label>

              {/* Overall badge preview */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">Média Geral:</span>
                <span className="font-mono text-sm font-black px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  {ovr}
                </span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                  rarity === "lendaria" ? "bg-amber-500/20 text-amber-300 border border-amber-500/50" :
                  rarity === "epica" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50" :
                  rarity === "rara" ? "bg-blue-500/20 text-blue-300 border border-blue-500/50" :
                  "bg-slate-800 text-slate-300"
                }`}>
                  {rarity}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {attrKeys.map((k) => {
                const val = attrs[k] ?? 75;
                const label = ATTR_LABELS[k] ?? k.toUpperCase();
                return (
                  <div key={k} className="bg-slate-900 border border-slate-800 p-3 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-300">{label}</span>
                      <span className={`font-mono text-xs font-black px-2 py-0.5 rounded ${
                        val >= 90 ? "bg-amber-500/20 text-amber-300" :
                        val >= 80 ? "bg-emerald-500/20 text-emerald-300" :
                        val >= 70 ? "bg-blue-500/20 text-blue-300" :
                        "bg-slate-800 text-slate-400"
                      }`}>
                        {val}
                      </span>
                    </div>

                    {/* Fast increment/decrement buttons & input */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateAttr(k, -5, true)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                      >
                        -5
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={val}
                        onChange={(e) => updateAttr(k, parseInt(e.target.value) || 50)}
                        className="w-full text-center bg-slate-950 border border-slate-700 rounded-lg py-1 font-mono text-xs font-bold text-white outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => updateAttr(k, 5, true)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                      >
                        +5
                      </button>
                    </div>

                    {/* Smooth slider */}
                    <input
                      type="range"
                      min={40}
                      max={99}
                      value={val}
                      onChange={(e) => updateAttr(k, parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* 7. BOTÕES DE AÇÃO NA ORDEM EXATA */}
          <div className="flex items-center gap-3 pt-4 border-t border-slate-800 flex-wrap">
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-950/60 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>💾</span> Salvar Carta
            </button>

            {onSaveAndNew && (
              <button
                type="button"
                onClick={handleSaveNext}
                disabled={!name.trim()}
                className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-950/60 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span>➕</span> Salvar e Criar Próxima
              </button>
            )}

            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-3 bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl border border-slate-800 transition-colors cursor-pointer ml-auto"
            >
              Cancelar
            </button>
          </div>

        </div>

        {/* RIGHT COLUMN: REAL-TIME STUDIO CARD PREVIEW */}
        <div className="lg:col-span-4 lg:sticky lg:top-20 bg-slate-950 border border-slate-800 rounded-3xl p-5 flex flex-col items-center gap-4 shadow-xl">
          <div className="text-center w-full">
            <div className="text-xs font-bold text-white uppercase tracking-wider">
              Visualização em Tempo Real
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Moldura: <b className="text-emerald-400">{activeTheme.label}</b>
            </div>
          </div>

          {/* The Live Rendered Card */}
          <div className="py-2 transform transition-transform hover:scale-105 duration-200">
            <CardView card={previewCard} />
          </div>

          {/* Theme & Rarity Specs */}
          <div className="w-full bg-slate-900/90 border border-slate-800/80 p-3 text-xs space-y-2 rounded-2xl text-slate-300">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Raridade:</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                rarity === "lendaria" ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" :
                rarity === "epica" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" :
                rarity === "rara" ? "bg-blue-500/20 text-blue-300 border border-blue-500/40" :
                "bg-slate-800 text-slate-300"
              }`}>
                {rarity.toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Borda Temática:</span>
              <span className="font-mono text-white text-[11px] flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full border border-black/40" style={{ backgroundColor: activeTheme.border }} />
                {activeTheme.border}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Badge da Coleção:</span>
              <span className="font-mono text-[10px] bg-slate-800 px-2 py-0.5 rounded text-emerald-300 border border-slate-700">
                {activeTheme.badge ?? "ZTT"}
              </span>
            </div>
          </div>
        </div>

      </div>
    </form>
  );
}
