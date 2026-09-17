import { useState, useEffect, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import type { DBCard, DBPack, UpsertCardInput } from "@/game/cardsRepo";
import { FOUNDER_SLUG } from "@/game/cardsRepo";
import { POSITIONS, POSITION_LABELS, attrsForPosition, ATTR_LABELS, type Position } from "@/game/types";
import { CardView } from "@/game/components/CardView";
import { getPackTheme } from "@/game/packThemes";
import { scoutCardFn } from "@/lib/scoutCard.functions";
import {
  calculateCardOverall,
  distributeAttributesForOverall,
  getRarityFromOverall,
  COMPETITION_LABELS,
  ROLE_LABELS,
  type CompetitionTier,
  type SquadRole,
} from "@/types/cardScale";

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
  const [side, setSide] = useState<"P" | "AI">(initial.side ?? "P");
  const [position, setPosition] = useState<Position>((initial.position as Position) ?? "GOL");
  const [name, setName] = useState(initial.name ?? "");
  const [realName, setRealName] = useState(initial.real_name ?? "");
  const [teamOrSelection, setTeamOrSelection] = useState("");
  const [year, setYear] = useState("");
  const [championship, setChampionship] = useState("");
  const [competitionTier, setCompetitionTier] = useState<CompetitionTier>("LIGA_NACIONAL");
  const [squadRole, setSquadRole] = useState<SquadRole>("TITULAR");
  const [baseScore, setBaseScore] = useState<number>(78);
  const [visualPrompt, setVisualPrompt] = useState("");
  const [quote, setQuote] = useState(initial.quote ?? "");
  const [legacyId, setLegacyId] = useState(initial.legacy_id ?? "");
  const [packIds, setPackIds] = useState<string[]>(initial.pack_ids ?? []);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccess, setAiSuccess] = useState<string | null>(null);

  const attrKeys = attrsForPosition(position);
  const [attrs, setAttrs] = useState<Record<string, number>>(() => {
    const base = { ...(initial.attrs ?? {}) } as Record<string, number>;
    for (const k of attrKeys) if (base[k] == null) base[k] = 75;
    return base;
  });

  const ovr = useMemo(() => {
    const vals = attrKeys.map((k) => attrs[k] ?? 0);
    if (vals.length === 0) return 0;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [attrs, attrKeys]);

  const rarity = getRarityFromOverall(ovr);

  useEffect(() => {
    const filtered: Record<string, number> = {};
    for (const k of attrKeys) filtered[k] = attrs[k] ?? 75;
    setAttrs(filtered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position]);

  function togglePack(p: DBPack) {
    setPackIds((cur) => {
      const has = cur.includes(p.id) || cur.includes(p.slug);
      if (has) {
        return cur.filter((x) => x !== p.id && x !== p.slug);
      }
      return [...cur, p.id, p.slug];
    });
  }

  function applyCalculatedOverall(base: number, comp: CompetitionTier, role: SquadRole) {
    const calculatedOvr = calculateCardOverall(base, comp, role);
    const distributed = distributeAttributesForOverall(position, calculatedOvr);
    setAttrs(distributed);
  }

  const scoutFn = useServerFn(scoutCardFn);

  async function handleScoutAthlete() {
    if (!realName.trim()) {
      setAiError("Digite o Nome do Atleta real primeiro (Ex: Ronaldinho, Dagoberto, Romário, Dida).");
      return;
    }
    setAiBusy(true);
    setAiError(null);
    setAiSuccess(null);
    try {
      const existing = allCards
        .filter((c) => c.id !== initial.id)
        .map((c) => c.name);
      
      const res = await scoutFn({
        data: {
          realName: realName.trim(),
          position,
          teamOrSelection: teamOrSelection.trim(),
          year: year.trim(),
          championship: championship.trim(),
          competitionTier,
          squadRole,
          existingNames: existing,
        },
      });

      if (res.suggestedPosition && res.suggestedPosition !== position) {
        setPosition(res.suggestedPosition);
      }
      if (res.suggestedName) setName(res.suggestedName);
      if (res.quote) setQuote(res.quote);
      if (res.visualPrompt) setVisualPrompt(res.visualPrompt);
      if (res.baseScore) setBaseScore(res.baseScore);
      if (res.attrs) {
        setAttrs((prev) => ({ ...prev, ...res.attrs }));
      }
      setAiSuccess(`Overall ponderado (${res.ovr} · ${res.rarity.toUpperCase()}) calculado com sucesso!`);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Falha ao analisar atleta com IA.");
    } finally {
      setAiBusy(false);
    }
  }

  function buildInput(): UpsertCardInput {
    return {
      id: initial.id,
      legacy_id: legacyId || null,
      side,
      position,
      tier: initial.id ? initial.tier : undefined,
      name: name.trim(),
      real_name: realName.trim() || null,
      attrs,
      quote: quote.trim(),
      pack_ids: packIds,
    };
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSave(buildInput());
  }

  function handleSaveAndNew() {
    if (!onSaveAndNew) return;
    onSaveAndNew(buildInput());
  }

  // Active theme resolution
  const activePack = packs.find((p) => (packIds.includes(p.id) || packIds.includes(p.slug)) && p.slug !== FOUNDER_SLUG) 
    ?? packs.find((p) => packIds.includes(p.id) || packIds.includes(p.slug));
  const previewPackSlug = activePack?.slug;
  const activeTheme = getPackTheme(previewPackSlug);

  const previewCard = {
    id: initial.id ?? "preview",
    name: name.trim() || "NOME DA CARTA",
    position,
    ovr,
    attrs: attrs as Partial<Record<import("@/game/types").AttrKey, number>>,
    quote: quote.trim() || "Frase lendária do jogador dos anos 90.",
    cardNumber: initial.card_number,
    packSlug: previewPackSlug,
  };

  return (
    <form onSubmit={submit} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-7 space-y-6 shadow-2xl text-slate-100">
      
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-sm">
            {initial.id ? "✏️" : "🎨"}
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              {initial.id ? "Editar Carta" : "Estúdio de Criação de Carta"}
            </h3>
            <p className="text-xs text-slate-400">
              Configure identidade, atributos ponderados e moldura temática.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {typeof initial.card_number === "number" && (
            <div className="text-xs font-mono bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-lg">
              Nº {String(initial.card_number).padStart(3, "0")}
            </div>
          )}
          <div className={`text-xs font-bold px-3 py-1 rounded-lg border ${
            ovr >= 90 ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : ovr >= 80 ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : ovr >= 63 ? "bg-blue-500/20 text-blue-300 border-blue-500/40" : "bg-slate-800 text-slate-300 border-slate-700"
          }`}>
            OVR {ovr} · {rarity === "lendaria" ? "🌟 LENDÁRIA (GOAT)" : rarity === "epica" ? "🛡️ ÉPICA (CRAQUE)" : rarity === "rara" ? "⚡ RARA (SÉRIE A)" : "⚽ COMUM (VÁRZEA)"}
          </div>
          {initial.id && typeof initial.tier === "number" && (
            <div className="text-xs font-mono bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-lg">
              Tier {initial.tier}
            </div>
          )}
        </div>
      </div>

      {/* Main Studio Grid: Left = Form + AI Scout, Right = Live Moldura & Card */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_320px] gap-6 items-start">
        
        {/* LEFT COLUMN: Controls & AI Scout */}
        <div className="space-y-5">
          
          {/* AI SCOUT ASSISTANT (4 HISTORICAL KEYS + MATHEMATICAL SCALE) */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 md:p-5 space-y-4 shadow-inner">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <div className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                <span>🧠</span>
                <span>Olheiro IA · Fórmula de Cálculo Ponderado</span>
              </div>
              <span className="text-[11px] text-slate-400">
                Padrão Allejo Anos 90 + Hierarquia de Elenco
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  1. Atleta Real
                </label>
                <input
                  value={realName}
                  onChange={(e) => setRealName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Ex: Ronaldinho Gaúcho"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  2. Clube / Seleção
                </label>
                <input
                  value={teamOrSelection}
                  onChange={(e) => setTeamOrSelection(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Ex: Brasil / Barcelona"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  3. Ano / Época
                </label>
                <input
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Ex: 2002"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  4. Campeonato
                </label>
                <input
                  value={championship}
                  onChange={(e) => setChampionship(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Ex: Copa do Mundo 2002"
                />
              </div>
            </div>

            {/* Hierarquia & Modificadores de Escala */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-3 border-t border-slate-800/80">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Nível da Competição
                </label>
                <select
                  value={competitionTier}
                  onChange={(e) => {
                    const val = e.target.value as CompetitionTier;
                    setCompetitionTier(val);
                    applyCalculatedOverall(baseScore, val, squadRole);
                  }}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  {(Object.keys(COMPETITION_LABELS) as CompetitionTier[]).map((tierKey) => (
                    <option key={tierKey} value={tierKey}>
                      {COMPETITION_LABELS[tierKey]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Status no Elenco
                </label>
                <select
                  value={squadRole}
                  onChange={(e) => {
                    const val = e.target.value as SquadRole;
                    setSquadRole(val);
                    applyCalculatedOverall(baseScore, competitionTier, val);
                  }}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  {(Object.keys(ROLE_LABELS) as SquadRole[]).map((roleKey) => (
                    <option key={roleKey} value={roleKey}>
                      {ROLE_LABELS[roleKey]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-semibold text-slate-300 mb-1">
                  <span>Base do Atleta:</span>
                  <span className="text-emerald-400 font-bold">{baseScore}</span>
                </div>
                <input
                  type="range"
                  min={40}
                  max={90}
                  value={baseScore}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setBaseScore(val);
                    applyCalculatedOverall(val, competitionTier, squadRole);
                  }}
                  className="w-full accent-emerald-500 cursor-pointer mt-2"
                />
              </div>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={handleScoutAthlete}
                disabled={aiBusy}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-950/60 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                <span>{aiBusy ? "⏳" : "✨"}</span>
                <span>{aiBusy ? "Pesquisando Histórico com IA..." : "Analisar e Preencher com IA"}</span>
              </button>

              {aiSuccess && (
                <span className="text-xs text-emerald-300 bg-emerald-950/80 border border-emerald-800/60 px-3 py-1 rounded-lg">
                  ✓ {aiSuccess}
                </span>
              )}
            </div>

            {aiError && (
              <div className="text-xs text-rose-300 bg-rose-950/80 border border-rose-800/60 p-2.5 rounded-xl">
                ⚠️ {aiError}
              </div>
            )}

            {visualPrompt && (
              <div className="text-xs text-slate-300 bg-slate-900 p-3 border border-slate-800 rounded-xl leading-relaxed">
                <b className="text-emerald-400">💡 Ideia visual para Caricatura / Ilustração:</b> {visualPrompt}
              </div>
            )}
          </div>

          {/* CARD BASIC FIELDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <Field label="Lado da Carta">
              <select
                value={side}
                onChange={(e) => setSide(e.target.value as "P" | "AI")}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="P">👤 Jogador (P)</option>
                <option value="AI">🤖 Adversário IA (AI)</option>
              </select>
            </Field>

            <Field label="Posição Tática" className="md:col-span-2">
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value as Position)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                {POSITIONS.map((p) => (
                  <option key={p} value={p}>
                    {p} — {POSITION_LABELS[p]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Nome / Apelido Retrô na Carta" className="md:col-span-3">
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-white font-bold uppercase rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="Ex: ROMARINHO PEIXE"
              />
            </Field>

            <Field label="Frase de Efeito (Crônica / Várzea)" className="md:col-span-3">
              <input
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="Ex: Bico na gaveta e faro de gol característico dos anos 90!"
              />
            </Field>
          </div>

          {/* ATTRIBUTES SECTION */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 md:p-5 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-200">Atributos da Posição ({POSITION_LABELS[position]})</span>
              <span className="text-slate-500 text-[11px]">Escala de 40 a 99</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
              {attrKeys.map((k) => (
                <Field key={k} label={ATTR_LABELS[k]}>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="range"
                      min={40}
                      max={99}
                      value={attrs[k] ?? 75}
                      onChange={(e) => setAttrs({ ...attrs, [k]: Number(e.target.value) })}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                    <input
                      type="number"
                      min={40}
                      max={99}
                      value={attrs[k] ?? 75}
                      onChange={(e) => setAttrs({ ...attrs, [k]: Number(e.target.value) })}
                      className="w-14 text-center bg-slate-900 border border-slate-800 text-white font-bold rounded-lg py-1 text-xs"
                    />
                  </div>
                </Field>
              ))}
            </div>
          </div>

          {/* PACK ATTACHMENT */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Vincular aos Pacotes & Molduras
            </label>
            <div className="flex flex-wrap gap-2">
              {packs.length === 0 && <span className="text-xs text-slate-500">Nenhum pacote cadastrado.</span>}
              {packs.map((p) => {
                const active = packIds.includes(p.id) || packIds.includes(p.slug) || (p.slug === FOUNDER_SLUG && packIds.includes("founder"));
                const theme = getPackTheme(p.slug);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePack(p)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
                      active
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-950 font-bold"
                        : "bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-white"
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-black/30"
                      style={{ backgroundColor: theme.border }}
                    />
                    <span>{active ? "✓ " : ""}{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex gap-2.5 flex-wrap pt-4 border-t border-slate-800">
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-emerald-950 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              💾 Salvar Carta
            </button>
            {!initial.id && onSaveAndNew && (
              <button
                type="button"
                onClick={handleSaveAndNew}
                disabled={!name.trim()}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-950 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                ➕ Salvar e Criar Próxima
              </button>
            )}
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl border border-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE MOLDURA / CARD STUDIO PREVIEW */}
        <div className="lg:sticky lg:top-20 bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col items-center gap-4 shadow-xl">
          <div className="text-center w-full">
            <div className="text-xs font-bold text-white uppercase tracking-wider">
              Moldura em Tempo Real
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Tema: <b className="text-emerald-400">{activeTheme.label}</b>
            </div>
          </div>

          {/* The Live Rendered Card */}
          <div className="py-2 transform transition-transform hover:scale-105 duration-200">
            <CardView card={previewCard} />
          </div>

          {/* Theme & Rarity Specs Box */}
          <div className="w-full bg-slate-900 border border-slate-800 p-3 text-xs space-y-2 rounded-xl text-slate-300">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Raridade:</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                rarity === "lendaria" ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : rarity === "epica" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : rarity === "rara" ? "bg-blue-500/20 text-blue-300 border border-blue-500/40" : "bg-slate-800 text-slate-300"
              }`}>
                {rarity.toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Borda / Molde:</span>
              <span className="font-mono text-white text-[11px] flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full border border-black/40" style={{ backgroundColor: activeTheme.border }} />
                {activeTheme.border}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Badge do Pacote:</span>
              <span className="font-mono text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-white">
                {activeTheme.badge ?? "Nenhum"}
              </span>
            </div>
          </div>
        </div>

      </div>
    </form>
  );
}

function Field({ label, children, className, help }: { label: string; children: React.ReactNode; className?: string; help?: string }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <div className="text-[11px] font-semibold text-slate-300 mb-1.5">{label}</div>
      {children}
      {help && <div className="mt-1 text-[11px] leading-snug text-slate-500">{help}</div>}
    </label>
  );
}
