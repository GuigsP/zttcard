import { useState, useEffect, useMemo } from "react";
import { getMasterCatalog } from "../economy/cardCatalog";
import { addCardToInventory, addCoins, getPlayerInventory } from "../economy/economyService";
import type { CatalogCard, CardRarity } from "../economy/economyTypes";
import { RARITY_CONFIG } from "../economy/economyTypes";
import { ATTR_LABELS, POSITION_LABELS } from "../types";
import { sound } from "../audio";
import { listPacks, getCachedPacks, listAllCards, cardBelongsToPack, type DBPack } from "../cardsRepo";
import { getPackTheme } from "../packThemes";

type Props = {
  onBack: () => void;
  onOpenShop: () => void;
  onOpenTrades?: () => void;
};

type StatusFilter = "all" | "collected" | "missing";
type PositionFilter = "ALL" | "GOL" | "DEF" | "MEI" | "ATA";
type SortOption = "number" | "ovr" | "rarity" | "name";

const RARITY_ORDER: Record<CardRarity, number> = {
  LENDA: 4,
  RARA: 3,
  INCOMUM: 2,
  COMUM: 1,
};

export function AlbumView({ onBack, onOpenShop, onOpenTrades }: Props) {
  const [catalog, setCatalog] = useState<CatalogCard[]>(() => getMasterCatalog());
  const inventory = getPlayerInventory();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [posFilter, setPosFilter] = useState<PositionFilter>("ALL");
  const [packFilter, setPackFilter] = useState<string>("ALL");
  const [sortOption, setSortOption] = useState<SortOption>("number");
  const [selectedCard, setSelectedCard] = useState<CatalogCard | null>(null);
  const [activeAlbumSlug, setActiveAlbumSlug] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [rewardRefresh, setRewardRefresh] = useState(0);
  const [rewardNotice, setRewardNotice] = useState<string | null>(null);

  const [availablePacks, setAvailablePacks] = useState<DBPack[]>(() => getCachedPacks());

  useEffect(() => {
    listAllCards().then(() => {
      setCatalog(getMasterCatalog());
    });
    listPacks().then((packs) => {
      if (packs && packs.length > 0) {
        setAvailablePacks(packs);
      }
    });
  }, []);

  useEffect(() => { setCurrentPage(0); }, [packFilter, statusFilter, posFilter, sortOption]);

  // Statistics for the selected album, or the whole catalog when no album is selected.
  const scopedCards = packFilter === "ALL" ? catalog : catalog.filter((card) =>
    cardBelongsToPack(card as any, packFilter, availablePacks) ||
    (card.pack_ids ?? []).includes(packFilter) || card.collection === packFilter
  );
  const totalCards = scopedCards.length || 1;
  const collectedCount = scopedCards.filter((c) => (inventory[c.id] ?? 0) >= 1).length;
  const progressPercent = Math.min(100, Math.max(0, Math.round((collectedCount / totalCards) * 100)));
  const rewardMilestones = [
    { percent: 25, title: "Primeiros passos", description: "Chegue a 25% da coleção", coins: 100, card: false },
    { percent: 50, title: "Meio caminho", description: "Complete metade do álbum", coins: 150, card: true },
    { percent: 75, title: "Quase lá", description: "Alcance 75% da coleção", coins: 250, card: false },
    { percent: 100, title: "Álbum completo", description: "Cole todas as figurinhas", coins: 500, card: true },
  ];
  const rewardStorageKey = activeAlbumSlug ? `ztt.albumRewards.${activeAlbumSlug}` : "";
  const claimedRewards: number[] = useMemo(() => {
    if (!rewardStorageKey || typeof window === "undefined") return [];
    try {
      const parsed = JSON.parse(window.localStorage.getItem(rewardStorageKey) || "[]");
      return Array.isArray(parsed) ? parsed.filter((value) => typeof value === "number") : [];
    } catch { return []; }
  }, [rewardStorageKey, rewardRefresh]);
  const claimMilestone = (milestone: typeof rewardMilestones[number]) => {
    if (!activeAlbumSlug || claimedRewards.includes(milestone.percent) || progressPercent < milestone.percent) return;
    addCoins(milestone.coins);
    let cardRewardName = "";
    if (milestone.card && scopedCards.length > 0) {
      const missing = scopedCards.filter((card) => (getPlayerInventory()[card.id] ?? 0) < 1);
      const pool = missing.length > 0 ? missing : scopedCards;
      const rewardCard = pool[Math.floor(Math.random() * pool.length)];
      if (rewardCard) {
        addCardToInventory(rewardCard.id);
        cardRewardName = rewardCard.name;
        setCatalog([...catalog]);
      }
    }
    const nextClaimed = [...claimedRewards, milestone.percent];
    if (typeof window !== "undefined") window.localStorage.setItem(rewardStorageKey, JSON.stringify(nextClaimed));
    setRewardRefresh((value) => value + 1);
    setRewardNotice(`Meta de ${milestone.percent}% resgatada! +${milestone.coins} contos${cardRewardName ? ` e figurinha: ${cardRewardName}` : ""}.`);
    sound.playCardFlip();
  };


  // Filtered & Sorted Cards
  const processedCards = useMemo(() => {
    return catalog
      .filter((card) => {
        const isOwned = (inventory[card.id] ?? 0) >= 1;

        // 1. Status Filter
        if (statusFilter === "collected" && !isOwned) return false;
        if (statusFilter === "missing" && isOwned) return false;

        // 2. Position Filter
        if (posFilter !== "ALL") {
          const pos = (card.position || "").toUpperCase();
          if (posFilter === "GOL" && pos !== "GOL") return false;
          if (posFilter === "DEF" && !["ZAD", "ZAE", "LD", "LE", "DEF", "ZAG"].includes(pos)) return false;
          if (posFilter === "MEI" && !["VOL", "MEI", "MEI 8", "MEI 10"].includes(pos)) return false;
          if (posFilter === "ATA" && !["ATA", "PD", "PE", "CA"].includes(pos)) return false;
        }

        // 3. Collection/Pack Filter
        if (packFilter !== "ALL") {
          const belongs =
            cardBelongsToPack(card as any, packFilter, availablePacks) ||
            (card.pack_ids ?? []).includes(packFilter) ||
            card.collection === packFilter;
          if (!belongs) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOption === "ovr") return (b.ovr ?? 70) - (a.ovr ?? 70);
        if (sortOption === "rarity") {
          return (RARITY_ORDER[b.rarity] ?? 0) - (RARITY_ORDER[a.rarity] ?? 0);
        }
        if (sortOption === "name") return (a.name || "").localeCompare(b.name || "");
        return (a.slotNumber ?? 0) - (b.slotNumber ?? 0); // "number" default
      });
  }, [catalog, inventory, statusFilter, posFilter, packFilter, sortOption, availablePacks]);

  const handleCardClick = (card: CatalogCard) => {
    sound.playCardFlip();
    setSelectedCard(card);
  };

  if (!activeAlbumSlug) {
    const sortedPacks = [...availablePacks].sort((a, b) => a.sort_order - b.sort_order);
    const getPackCards = (slug: string) => catalog.filter((card) =>
      cardBelongsToPack(card as any, slug, availablePacks) ||
      (card.pack_ids ?? []).includes(slug) ||
      card.collection === slug
    );
    const openAlbum = (slug: string) => {
      sound.playCardFlip();
      setActiveAlbumSlug(slug);
      setPackFilter(slug);
      setStatusFilter("all");
      setPosFilter("ALL");
      setSortOption("number");
    };

    return (
      <div className="relative min-h-screen min-h-[100dvh] overflow-hidden bg-[#07101f] px-4 py-5 pb-32 text-arcade-cream sm:px-7 md:px-10 md:pb-12">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_-10%,rgba(29,78,216,.18),transparent_70%)]" />
        <div className="pointer-events-none fixed inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,.25)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.25)_1px,transparent_1px)] [background-size:32px_32px]" />
        <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => { sound.playAttrSelect(); onBack(); }} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-lg text-slate-300 transition hover:border-arcade-yellow/50 hover:text-arcade-yellow" aria-label="Voltar ao menu">←</button>
            <div><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-300">Arquivo de colecionador</p><h1 className="mt-1 font-display text-3xl font-black uppercase leading-none tracking-wide text-white sm:text-4xl">Sua estante</h1></div>
          </div>
          <button type="button" onClick={() => { sound.playAttrSelect(); onOpenShop(); }} className="inline-flex items-center gap-2 rounded-xl bg-arcade-yellow px-3 py-2.5 text-[10px] font-black uppercase tracking-wide text-[#101522] transition hover:bg-yellow-300 sm:px-4 sm:text-xs"><span>＋</span><span className="hidden sm:inline">Buscar figurinhas</span><span className="sm:hidden">Banca</span></button>
        </header>
        <main className="relative z-10 mx-auto w-full max-w-6xl py-7 sm:py-9">
          <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <p className="text-xs leading-relaxed text-slate-400 sm:text-sm">Cada edição conta uma história. Abra um álbum e continue preenchendo suas páginas.</p>
            <div className="flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-300 sm:self-auto"><span className="text-base">📚</span><span><strong className="text-white">{sortedPacks.length}</strong> {sortedPacks.length === 1 ? "álbum na estante" : "álbuns na estante"}</span></div>
          </div>
          {sortedPacks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-6 py-16 text-center"><div className="text-4xl">📚</div><h2 className="mt-4 font-display text-2xl font-bold uppercase text-white">Sua estante está esperando</h2><p className="mt-2 text-sm text-slate-400">As coleções aparecerão aqui assim que estiverem disponíveis.</p></div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedPacks.map((pack, index) => {
                const packCards = getPackCards(pack.slug);
                const owned = packCards.filter((card) => (inventory[card.id] ?? 0) >= 1).length;
                const total = packCards.length;
                const percent = total > 0 ? Math.round((owned / total) * 100) : 0;
                const theme = getPackTheme(pack.slug);
                const yearMatch = pack.name.match(/(?:19|20)\d{2}|\b\d{2}\b/);
                const year = yearMatch?.[0] ?? String(90 + index);
                const accent = theme?.accent || "#ffd60a";
                const isSpecial = !pack.is_active;
                return (
                  <button key={pack.id} type="button" onClick={() => openAlbum(pack.slug)} className="group relative flex min-h-[238px] overflow-hidden rounded-2xl border border-white/10 bg-[#0b1728] p-3 text-left shadow-[0_18px_45px_rgba(0,0,0,.22)] transition duration-200 hover:-translate-y-1 hover:border-white/25 hover:shadow-[0_24px_55px_rgba(0,0,0,.38)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arcade-yellow">
                    <div className="relative flex w-[43%] min-w-[118px] max-w-[160px] shrink-0 flex-col justify-between overflow-hidden rounded-lg border border-black/40 p-3 shadow-[5px_5px_0_rgba(0,0,0,.35)]" style={{ background: `linear-gradient(155deg, ${theme?.topBg || "#172554"} 0%, #081222 68%, ${accent}33 100%)` }}>
                      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "repeating-linear-gradient(135deg, transparent 0 9px, rgba(255,255,255,.2) 9px 10px)" }} />
                      <div className="absolute left-0 top-0 h-full w-2 border-r border-white/10 bg-black/25" />
                      <div className="relative pl-1"><span className="block text-[8px] font-black uppercase tracking-[.2em]" style={{ color: accent }}>ZERO TO TOP</span><span className="mt-1 block font-display text-4xl font-black leading-none text-white drop-shadow sm:text-5xl">{year}</span></div>
                      <div className="relative flex flex-col items-center py-1"><span className="text-4xl drop-shadow-[0_4px_8px_rgba(0,0,0,.7)] transition duration-200 group-hover:scale-110 sm:text-5xl">{pack.slug.includes("copa") ? "🏆" : "⚽"}</span><span className="mt-2 text-center font-display text-sm font-black uppercase leading-tight text-white sm:text-base">{pack.name}</span></div>
                      <div className="relative flex items-center justify-between border-t border-white/20 pt-2"><span className="text-[7px] font-bold uppercase tracking-wider text-white/65">Coleção</span><span className="text-[10px] font-black" style={{ color: accent }}>ZTT</span></div>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-between py-1 pl-4 pr-1">
                      <div><div className="flex items-start justify-between gap-2"><span className="text-[9px] font-bold uppercase tracking-[.18em] text-slate-500">Álbum {String(index + 1).padStart(2, "0")}</span>{isSpecial && <span className="rounded-full border border-purple-300/20 bg-purple-300/10 px-2 py-1 text-[8px] font-bold text-purple-200">Especial</span>}</div><h2 className="mt-2 font-display text-xl font-black uppercase leading-tight text-white transition group-hover:text-arcade-yellow sm:text-2xl">{pack.name}</h2><p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">{pack.description || "Uma coleção para descobrir e completar."}</p></div>
                      <div className="mt-4"><div className="mb-2 flex items-center justify-between gap-2 text-[10px]"><span className="font-semibold text-slate-300">{owned} de {total} figurinhas</span><span className="font-black" style={{ color: accent }}>{percent}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-black/50"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${percent}%`, backgroundColor: accent }} /></div><div className="mt-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-wide text-slate-500 transition group-hover:text-white"><span>{percent === 100 && total > 0 ? "Coleção completa" : owned === 0 ? "Comece a coleção" : "Continuar álbum"}</span><span className="text-base" style={{ color: accent }}>→</span></div></div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          <div className="mt-7 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-xs text-slate-500"><span className="text-lg">💡</span><p>Abra uma edição para consultar suas figurinhas. As repetidas continuam no seu inventário e podem ser trocadas na Pracinha.</p></div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-arcade-blue text-arcade-cream flex flex-col p-3 sm:p-5 md:p-8 pb-32 md:pb-12">
      {/* ── 1. CABEÇALHO DO ÁLBUM & BOTÕES RÁPIDOS ── */}
      <div className="max-w-6xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <button
            type="button"
            onClick={() => {
              sound.playAttrSelect();
              setActiveAlbumSlug(null);
              setPackFilter("ALL");
            }}
            className="font-arcade text-[10px] px-3 py-2 bg-arcade-dark text-arcade-yellow border-2 border-arcade-yellow hover:bg-arcade-red hover:text-white transition-colors cursor-pointer active:scale-95 shadow"
          >
            ← ESTANTE
          </button>
          <div className="text-right sm:text-left">
            <h1 className="font-arcade text-lg sm:text-2xl text-arcade-yellow drop-shadow-[2px_2px_0_var(--arcade-dark)] leading-tight">
              COLEÇÃO DE FIGURINHAS
            </h1>
            <p className="font-body text-[10px] sm:text-xs text-arcade-cream/80">
              Todas as cartas, lendas retrô e coleções temáticas
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            sound.playAttrSelect();
            onOpenShop();
          }}
          className="w-full sm:w-auto font-arcade text-[10px] px-4 py-2.5 bg-arcade-green text-arcade-cream border-2 border-arcade-yellow shadow-arcade hover:bg-arcade-yellow hover:text-arcade-dark transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
        >
          <span>📰</span>
          <span>COMPRAR PACOTES NA BANCA</span>
        </button>
      </div>

      {/* ── 2. CARD DE PROGRESSO DA COLEÇÃO (ESTILO CLASH ROYALE) ── */}
      <div className="max-w-6xl w-full mx-auto bg-gradient-to-b from-arcade-dark to-slate-950 border-3 border-arcade-yellow rounded-2xl p-3.5 sm:p-4 shadow-xl mb-4 relative overflow-hidden">
        <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">📖</span>
            <span className="font-arcade text-xs sm:text-sm text-arcade-yellow font-bold tracking-wide">
              NA COLEÇÃO: {collectedCount} / {totalCards}
            </span>
          </div>
          <span className="font-arcade text-xs text-amber-300 font-bold bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 rounded-full">
            {progressPercent}% COMPLETO
          </span>
        </div>

        {/* Barra de Progresso com Glow */}
        <div className="w-full h-3 sm:h-3.5 bg-black/70 rounded-full overflow-hidden border border-arcade-yellow/40 p-0.5">
          <div
            className="h-full bg-gradient-to-r from-arcade-yellow via-amber-400 to-amber-500 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(255,200,0,0.8)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* ── METAS E RECOMPENSAS EXCLUSIVAS DESTA COLEÇÃO ── */}
      <section className="mx-auto mb-5 w-full max-w-6xl rounded-2xl border border-amber-300/25 bg-gradient-to-br from-[#151d30] to-[#090f1c] p-4 shadow-lg">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div><p className="font-arcade text-[9px] uppercase tracking-[.2em] text-amber-300">Jornada da coleção</p><h2 className="mt-1 font-display text-xl font-black uppercase text-white">Metas e recompensas</h2></div>
          <span className="text-[10px] text-slate-400">Cada álbum tem seu próprio progresso</span>
        </div>
        {rewardNotice && <div role="status" className="mb-3 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-200">{rewardNotice}</div>}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {rewardMilestones.map((milestone) => {
            const claimed = claimedRewards.includes(milestone.percent);
            const unlocked = progressPercent >= milestone.percent;
            return <div key={milestone.percent} className={`rounded-xl border p-3 transition ${claimed ? "border-emerald-400/30 bg-emerald-400/[.07]" : unlocked ? "border-amber-300/50 bg-amber-300/[.07]" : "border-white/10 bg-black/20"}`}>
              <div className="flex items-center justify-between gap-2"><span className="font-arcade text-[10px] text-amber-200">{milestone.percent}%</span><span className="text-sm">{claimed ? "✓" : milestone.card ? "🎴" : "🪙"}</span></div>
              <p className="mt-2 text-sm font-bold text-white">{milestone.title}</p>
              <p className="mt-1 min-h-8 text-[10px] leading-relaxed text-slate-400">{milestone.description}</p>
              <p className="mt-2 text-[10px] font-bold text-amber-200">+{milestone.coins} contos{milestone.card ? " + figurinha" : ""}</p>
              <button type="button" disabled={!unlocked || claimed} onClick={() => claimMilestone(milestone)} className="mt-3 w-full rounded-lg border border-amber-200/25 px-2 py-2 font-arcade text-[8px] transition hover:bg-amber-200/10 disabled:cursor-not-allowed disabled:opacity-35">{claimed ? "RESGATADA" : unlocked ? "RESGATAR" : `FALTAM ${Math.max(0, milestone.percent - progressPercent)}%`}</button>
            </div>;
          })}
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-slate-500">As metas contam figurinhas únicas coladas neste álbum. Recompensas ficam salvas por coleção; cartas bônus priorizam uma figurinha que ainda falta.</p>
      </section>

      {/* ── 3. BARRA DE FILTROS & ORDENAÇÃO POR TOQUE (TOUCH-FRIENDLY) ── */}
      <div className="max-w-6xl w-full mx-auto flex flex-col gap-2.5 mb-5 bg-arcade-dark/85 backdrop-blur-md p-3 rounded-2xl border-2 border-arcade-yellow/40 shadow">
        
        {/* Linha 1: Status (Todas / Obtidas / Faltando) */}
        <div className="grid grid-cols-3 gap-1.5 w-full">
          <button
            type="button"
            onClick={() => {
              sound.playAttrSelect();
              setStatusFilter("all");
            }}
            className={`py-1.5 px-2 rounded-xl font-arcade text-[9px] sm:text-xs transition-all cursor-pointer text-center ${
              statusFilter === "all"
                ? "bg-arcade-yellow text-arcade-dark font-bold shadow scale-[1.02]"
                : "bg-arcade-blue/50 text-arcade-cream/70 hover:bg-arcade-blue hover:text-arcade-cream"
            }`}
          >
            TODAS ({totalCards})
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playAttrSelect();
              setStatusFilter("collected");
            }}
            className={`py-1.5 px-2 rounded-xl font-arcade text-[9px] sm:text-xs transition-all cursor-pointer text-center ${
              statusFilter === "collected"
                ? "bg-emerald-500 text-arcade-dark font-bold shadow scale-[1.02]"
                : "bg-arcade-blue/50 text-arcade-cream/70 hover:bg-arcade-blue hover:text-arcade-cream"
            }`}
          >
            OBTIDAS ({collectedCount})
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playAttrSelect();
              setStatusFilter("missing");
            }}
            className={`py-1.5 px-2 rounded-xl font-arcade text-[9px] sm:text-xs transition-all cursor-pointer text-center ${
              statusFilter === "missing"
                ? "bg-rose-600 text-white font-bold shadow scale-[1.02]"
                : "bg-arcade-blue/50 text-arcade-cream/70 hover:bg-arcade-blue hover:text-arcade-cream"
            }`}
          >
            FALTANDO ({totalCards - collectedCount})
          </button>
        </div>

        {/* Linha 2: Pílulas de Posição em Campo (Toque Rápido) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
          {(["ALL", "GOL", "DEF", "MEI", "ATA"] as PositionFilter[]).map((pos) => {
            const label =
              pos === "ALL"
                ? "TODAS AS POSIÇÕES"
                : pos === "GOL"
                ? "🧤 GOL"
                : pos === "DEF"
                ? "🛡️ DEFESAS"
                : pos === "MEI"
                ? "⚙️ MEIAS"
                : "⚡ ATACANTES";

            const isActive = posFilter === pos;
            return (
              <button
                key={pos}
                type="button"
                onClick={() => {
                  sound.playAttrSelect();
                  setPosFilter(pos);
                }}
                className={`py-1 px-2.5 rounded-lg font-arcade text-[8px] sm:text-[9.5px] whitespace-nowrap transition-all cursor-pointer shrink-0 border ${
                  isActive
                    ? "bg-gradient-to-r from-arcade-yellow to-amber-500 text-arcade-dark border-arcade-cream font-bold shadow"
                    : "bg-arcade-dark/90 text-arcade-cream/70 border-arcade-yellow/30 hover:border-arcade-yellow hover:text-arcade-cream"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Linha 3: Dropdowns Retrô de Coleção e Ordenação */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-arcade-yellow/20">
          {/* Dropdown de Coleções / Decks */}
          <div className="flex items-center gap-1.5 bg-arcade-blue/50 border border-arcade-yellow/40 rounded-xl px-2.5 py-1">
            <span className="text-xs">🏆</span>
            <select
              value={packFilter}
              onChange={(e) => {
                sound.playAttrSelect();
                setPackFilter(e.target.value);
              }}
              className="bg-transparent font-arcade text-[9px] sm:text-xs text-arcade-yellow focus:outline-none w-full cursor-pointer"
            >
              <option value="ALL" className="bg-arcade-dark text-arcade-cream">
                📦 Todas as Coleções
              </option>
              {availablePacks.map((p) => (
                <option key={p.id} value={p.slug} className="bg-arcade-dark text-arcade-cream">
                  {p.is_active ? "🏆" : "🔒"} {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Dropdown de Ordenação */}
          <div className="flex items-center gap-1.5 bg-arcade-blue/50 border border-arcade-yellow/40 rounded-xl px-2.5 py-1">
            <span className="text-xs">⚡</span>
            <select
              value={sortOption}
              onChange={(e) => {
                sound.playAttrSelect();
                setSortOption(e.target.value as SortOption);
              }}
              className="bg-transparent font-arcade text-[9px] sm:text-xs text-arcade-yellow focus:outline-none w-full cursor-pointer"
            >
              <option value="number" className="bg-arcade-dark text-arcade-cream">
                🔢 Ordenar: Por Número (#)
              </option>
              <option value="ovr" className="bg-arcade-dark text-arcade-cream">
                ⚡ Ordenar: Por Força (OVR ↓)
              </option>
              <option value="rarity" className="bg-arcade-dark text-arcade-cream">
                ⭐ Ordenar: Por Raridade
              </option>
              <option value="name" className="bg-arcade-dark text-arcade-cream">
                🔤 Ordenar: Por Nome (A-Z)
              </option>
            </select>
          </div>
        </div>

      </div>

      {/* ── 4. ÁLBUM ABERTO: PÁGINA DUPLA ── */}
      {(() => {
        const PAGE_SIZE = 12;
        const pageCount = Math.max(1, Math.ceil(processedCards.length / PAGE_SIZE));
        const safePage = Math.min(currentPage, pageCount - 1);
        const visibleCards = processedCards.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
        const leftCards = visibleCards.slice(0, 6);
        const rightCards = visibleCards.slice(6, 12);
        const renderSlot = (card: CatalogCard | undefined, slotIndex: number) => {
          const slotNumber = card?.slotNumber ?? (safePage * PAGE_SIZE + slotIndex + 1);
          if (!card) {
            return (
              <div key={`empty-${slotNumber}`} className="relative flex aspect-[3/4] min-h-0 flex-col items-center justify-center rounded-md border border-dashed border-amber-900/40 bg-black/10 text-amber-950/60">
                <span className="font-arcade text-[9px]">#{slotNumber}</span>
                <span className="mt-1 text-lg opacity-40">⚽</span>
                <span className="mt-1 text-[7px] font-bold uppercase tracking-widest">Espaço livre</span>
              </div>
            );
          }
          const count = inventory[card.id] ?? 0;
          const isOwned = count >= 1;
          const rarity = RARITY_CONFIG[card.rarity];
          return (
            <button key={card.id} type="button" onClick={() => handleCardClick(card)} title={isOwned ? `#${card.slotNumber} — ${card.name}` : `#${card.slotNumber} — Figurinha faltando`} className={`relative flex aspect-[3/4] min-h-0 flex-col overflow-hidden rounded-md border p-1 text-center transition duration-200 hover:-translate-y-0.5 active:scale-95 ${isOwned ? "border-amber-700/70 bg-[#10251e] shadow-[0_2px_5px_rgba(0,0,0,.2)]" : "border-dashed border-stone-500/70 bg-stone-900/10 opacity-80 hover:opacity-100"}`} style={isOwned ? { borderColor: rarity.borderColor } : undefined}>
              <div className="relative z-10 flex items-center justify-between gap-1 text-[8px] font-black text-stone-700"><span>#{card.slotNumber}</span><span>{isOwned ? card.position : "???"}</span></div>
              {isOwned && card.imageUrl ? <img src={card.imageUrl} alt={card.name} loading="lazy" className="absolute inset-1 h-[calc(100%-2rem)] w-[calc(100%-.5rem)] rounded object-cover object-top opacity-90" /> : null}
              <div className={`relative z-10 m-auto flex flex-col items-center justify-center ${isOwned ? "text-white" : "text-stone-500"}`}>
                {!isOwned ? <><span className="text-xl sm:text-2xl">👤</span><span className="mt-1 font-arcade text-[7px]">FALTANDO</span></> : !card.imageUrl ? <span className="text-2xl">👤</span> : null}
              </div>
              <div className={`relative z-10 mt-auto rounded-sm px-0.5 py-1 ${isOwned ? "bg-black/75 text-white" : "bg-stone-950/60 text-stone-500"}`}>
                <span className="block truncate text-[7px] font-black uppercase sm:text-[9px]">{isOwned ? card.name : "Figurinha faltante"}</span>
                {isOwned && count > 1 ? <span className="text-[7px] font-black text-amber-300">+{count - 1} REP.</span> : null}
              </div>
            </button>
          );
        };
        return (
          <section className="mx-auto w-full max-w-6xl" aria-label="Páginas do álbum">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
              <div><p className="font-arcade text-[10px] text-arcade-yellow">EDIÇÃO ABERTA</p><p className="mt-1 text-[10px] text-arcade-cream/60">Cada espaço numerado guarda uma figurinha da coleção.</p></div>
              <span className="rounded-full border border-amber-300/30 bg-black/20 px-3 py-1.5 font-arcade text-[9px] text-amber-200">PÁGINAS {safePage * 2 + 1}–{Math.min(safePage * 2 + 2, pageCount * 2)}</span>
            </div>
            <div key={safePage} className="grid grid-cols-1 gap-3 animate-in fade-in slide-in-from-right-3 duration-300 md:grid-cols-2 md:gap-0">
              {[leftCards, rightCards].map((pageCards, pageSide) => (
                <div key={pageSide} className={`relative overflow-hidden border-y-4 border-amber-950/70 bg-[#e8d6a8] p-3 shadow-xl sm:p-5 ${pageSide === 0 ? "rounded-t-xl md:rounded-l-xl md:rounded-tr-none border-l-4 md:border-r border-r-amber-950/20" : "rounded-b-xl md:rounded-r-xl md:rounded-bl-none border-r-4 md:border-l-0"}`}>
                  <div className="pointer-events-none absolute inset-0 opacity-25" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent 0 27px, rgba(101,72,34,.14) 28px 29px)" }} />
                  <div className="relative mb-3 flex items-center justify-between border-b border-amber-950/25 pb-2"><span className="font-display text-[10px] font-black uppercase tracking-[.2em] text-amber-950/70">{pageSide === 0 ? "Memórias do futebol" : "Lendas da edição"}</span><span className="font-arcade text-[8px] text-amber-950/60">{safePage * 2 + pageSide + 1}</span></div>
                  <div className="relative grid grid-cols-3 gap-2 sm:gap-3">
                    {Array.from({ length: 6 }, (_, i) => renderSlot(pageCards[i], pageSide * 6 + i))}
                  </div>
                  <div className="relative mt-3 border-t border-amber-950/20 pt-2 text-center font-display text-[9px] italic text-amber-950/50">Zero To Top · Álbum de figurinhas</div>
                  {pageSide === 0 ? <div className="pointer-events-none absolute right-0 top-0 h-full w-3 bg-gradient-to-l from-amber-950/10 to-transparent" /> : <div className="pointer-events-none absolute left-0 top-0 h-full w-3 bg-gradient-to-r from-amber-950/10 to-transparent" />}
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-arcade-yellow/20 bg-arcade-dark/70 p-3">
              <button type="button" disabled={safePage === 0} onClick={() => { sound.playCardFlip(); setCurrentPage((p) => Math.max(0, p - 1)); }} className="flex items-center gap-2 rounded-lg border border-amber-300/30 bg-black/25 px-3 py-2 font-arcade text-[9px] text-amber-100 transition hover:bg-amber-300/10 disabled:cursor-not-allowed disabled:opacity-30"><span>←</span><span className="hidden sm:inline">PÁGINA ANTERIOR</span><span className="sm:hidden">ANTERIOR</span></button>
              <div className="text-center"><p className="font-arcade text-[9px] text-arcade-cream">{pageCount === 1 ? "ÚNICA ABERTURA" : `ABERTURA ${safePage + 1} DE ${pageCount}`}</p><p className="mt-1 text-[9px] text-arcade-cream/50">{processedCards.length} figurinhas nesta visualização</p></div>
              <button type="button" disabled={safePage >= pageCount - 1} onClick={() => { sound.playCardFlip(); setCurrentPage((p) => Math.min(pageCount - 1, p + 1)); }} className="flex items-center gap-2 rounded-lg border border-amber-300/30 bg-black/25 px-3 py-2 font-arcade text-[9px] text-amber-100 transition hover:bg-amber-300/10 disabled:cursor-not-allowed disabled:opacity-30"><span className="hidden sm:inline">PRÓXIMA PÁGINA</span><span className="sm:hidden">PRÓXIMA</span><span>→</span></button>
            </div>
          </section>
        );
      })()}

      {/* ── 5. BOTTOM SHEET DE DETALHES DA CARTA (GAVETA INFERIOR) ── */}
      {selectedCard && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedCard(null)}
        >
          <div
            className="bg-arcade-dark border-t-4 sm:border-4 border-arcade-yellow rounded-t-3xl sm:rounded-2xl max-w-sm w-full p-5 shadow-2xl text-center relative max-h-[90vh] flex flex-col overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Puxador Tátil da Gaveta Mobile */}
            <div className="w-12 h-1.5 rounded-full bg-zinc-600 mx-auto mb-2 sm:hidden shrink-0" />

            {/* Botão Fechar no Topo */}
            <button
              type="button"
              onClick={() => setSelectedCard(null)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-arcade-blue border border-arcade-yellow text-arcade-yellow hover:bg-arcade-red hover:text-white flex items-center justify-center font-bold text-sm cursor-pointer"
            >
              ✕
            </button>

            {/* Cabeçalho da Figurinha */}
            <div className="font-arcade text-xs text-arcade-red mb-1">
              FIGURINHA #{selectedCard.slotNumber}
            </div>

            {selectedCard.isExclusive && (
              <div className="mb-1.5">
                <span className="font-arcade text-[8px] bg-amber-500/20 text-amber-300 border border-amber-500/60 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  <span>⭐</span>
                  <span>COLEÇÃO EXCLUSIVA DE APOIADOR</span>
                </span>
              </div>
            )}

            {/* Foto do Jogador Ampliada */}
            {selectedCard.imageUrl && (
              <div className="w-32 h-32 mx-auto my-2 rounded-2xl overflow-hidden border-3 border-arcade-yellow shadow-xl bg-arcade-dark/40">
                <img
                  src={selectedCard.imageUrl}
                  alt={selectedCard.name}
                  className="w-full h-full object-cover object-top"
                  loading="lazy"
                />
              </div>
            )}

            {/* Nome e Escudo do Clube */}
            <div className="font-arcade text-xl text-arcade-yellow mb-0.5 uppercase tracking-wider flex items-center justify-center gap-2">
              {selectedCard.clubBadgeUrl && (
                <span>
                  {typeof selectedCard.clubBadgeUrl === "string" &&
                  (selectedCard.clubBadgeUrl.startsWith("http") || selectedCard.clubBadgeUrl.startsWith("/")) ? (
                    <img
                      src={selectedCard.clubBadgeUrl}
                      alt="Escudo"
                      className="w-6 h-6 object-contain inline-block drop-shadow"
                    />
                  ) : (
                    <span className="text-lg">{String(selectedCard.clubBadgeUrl)}</span>
                  )}
                </span>
              )}
              <span>{selectedCard.name}</span>
            </div>

            {/* Posição */}
            <div className="font-arcade text-[10px] text-arcade-cream/80 mb-2">
              {POSITION_LABELS[selectedCard.position] ?? selectedCard.position ?? "JOGADOR"}
            </div>

            {/* Badges de Força (OVR) e Raridade */}
            <div className="flex justify-center items-center gap-3 my-2">
              <div className="font-arcade text-2xl px-3 py-1 bg-arcade-blue text-arcade-yellow border-2 border-arcade-yellow rounded-lg">
                {selectedCard.ovr}
              </div>
              <div
                className="font-arcade text-xs px-2.5 py-1 text-white border-2 border-white rounded-lg shadow"
                style={{ backgroundColor: RARITY_CONFIG[selectedCard.rarity].badgeBg }}
              >
                {RARITY_CONFIG[selectedCard.rarity].label}
              </div>
            </div>

            {/* Citação / Frase Marcante */}
            {selectedCard.quote && (
              <div className="font-display italic text-arcade-cream/90 bg-arcade-blue/40 p-2.5 border-2 border-arcade-yellow/30 text-xs mb-3 rounded-lg">
                "{selectedCard.quote}"
              </div>
            )}

            {/* Grade dos 6 Atributos */}
            <div className="grid grid-cols-3 gap-1.5 bg-arcade-blue/30 p-2 border border-arcade-yellow/40 rounded-xl text-[9px] font-arcade mb-3">
              {Object.entries(selectedCard.attrs).map(([k, v]) => (
                <div key={k} className="text-center bg-black/30 p-1 rounded-lg">
                  <span className="text-arcade-cream/60 block text-[7px]">
                    {ATTR_LABELS[k as keyof typeof ATTR_LABELS]?.slice(0, 3)}
                  </span>
                  <span className="font-bold text-arcade-yellow text-xs">{v}</span>
                </div>
              ))}
            </div>

            {/* Resumo de Cópias */}
            <div className="font-arcade text-[9px] text-arcade-cream/80 mb-3 bg-black/40 py-1.5 px-3 rounded-xl border border-arcade-yellow/20">
              CÓPIAS EM POSSE:{" "}
              <b className="text-arcade-yellow">{inventory[selectedCard.id] ?? 0}</b>{" "}
              {(inventory[selectedCard.id] ?? 0) >= 1
                ? `(1 no álbum, ${Math.max(0, (inventory[selectedCard.id] ?? 0) - 1)} repetidas)`
                : "(Ainda não obtida)"}
            </div>

            {/* Botões de Ação na Base da Gaveta */}
            <div className="flex flex-col gap-2 mt-auto">
              {(inventory[selectedCard.id] ?? 0) > 1 && onOpenTrades && (
                <button
                  type="button"
                  onClick={() => {
                    sound.playAttrSelect();
                    setSelectedCard(null);
                    onOpenTrades();
                  }}
                  className="w-full font-arcade text-xs py-2.5 bg-purple-700 hover:bg-purple-600 text-white border-2 border-arcade-yellow rounded-xl shadow cursor-pointer active:scale-95 transition-all"
                >
                  🤝 VENDER / TROCAR NA PRACINHA
                </button>
              )}

              {!(inventory[selectedCard.id] ?? 0) && (
                <button
                  type="button"
                  onClick={() => {
                    sound.playAttrSelect();
                    setSelectedCard(null);
                    onOpenShop();
                  }}
                  className="w-full font-arcade text-xs py-2.5 bg-arcade-green hover:bg-emerald-500 text-white border-2 border-arcade-yellow rounded-xl shadow cursor-pointer active:scale-95 transition-all"
                >
                  📰 BUSCAR PACOTES NA BANCA
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedCard(null)}
                className="w-full font-arcade text-xs py-2 bg-arcade-dark text-arcade-cream/80 border border-arcade-yellow/40 rounded-xl hover:text-white cursor-pointer active:scale-95 transition-all"
              >
                FECHAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
