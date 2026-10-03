import { useState, useEffect, useMemo } from "react";
import { getMasterCatalog } from "../economy/cardCatalog";
import { getPlayerInventory } from "../economy/economyService";
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

  // Statistics
  const totalCards = catalog.length || 1;
  const collectedCount = catalog.filter((c) => (inventory[c.id] ?? 0) >= 1).length;
  const progressPercent = Math.min(100, Math.max(0, Math.round((collectedCount / totalCards) * 100)));

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
  }, [catalog, inventory, statusFilter, posFilter, packFilter, sortOption]);

  const handleCardClick = (card: CatalogCard) => {
    sound.playCardFlip();
    setSelectedCard(card);
  };

  return (
    <div className="min-h-screen bg-arcade-blue text-arcade-cream flex flex-col p-3 sm:p-5 md:p-8 pb-32 md:pb-12">
      {/* ── 1. CABEÇALHO DO ÁLBUM & BOTÕES RÁPIDOS ── */}
      <div className="max-w-6xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <button
            type="button"
            onClick={() => {
              sound.playAttrSelect();
              onBack();
            }}
            className="font-arcade text-[10px] px-3 py-2 bg-arcade-dark text-arcade-yellow border-2 border-arcade-yellow hover:bg-arcade-red hover:text-white transition-colors cursor-pointer active:scale-95 shadow"
          >
            ← MENU
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

      {/* ── 4. GRID DE CARTAS COMPACTO (3~4 COLUNAS NO MOBILE - ESTILO CLASH ROYALE) ── */}
      <div className="max-w-6xl w-full mx-auto">
        {processedCards.length === 0 ? (
          <div className="w-full bg-arcade-dark/80 border-2 border-dashed border-arcade-yellow/40 rounded-2xl p-8 text-center my-6">
            <span className="text-4xl">🔍</span>
            <div className="font-arcade text-sm text-arcade-yellow mt-2">
              NENHUMA FIGURINHA ENCONTRADA
            </div>
            <p className="font-body text-xs text-arcade-cream/70 mt-1">
              Tente redefinir os filtros de posição ou coleção para ver mais cartas.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-2.5">
            {processedCards.map((card) => {
              const count = inventory[card.id] ?? 0;
              const isOwned = count >= 1;
              const rConf = RARITY_CONFIG[card.rarity];
              const t = getPackTheme(card.collection);

              /* CARTA FALTANTE (SILHUETA MISTERIOSA ESTILO CLASH ROYALE) */
              if (!isOwned) {
                return (
                  <div
                    key={card.id}
                    onClick={() => handleCardClick(card)}
                    className="aspect-[1/1.38] bg-slate-950/80 border-2 border-dashed border-slate-700/60 rounded-xl p-1.5 flex flex-col justify-between items-center text-center opacity-75 hover:opacity-100 hover:border-arcade-yellow/60 transition-all cursor-pointer shadow relative group active:scale-95"
                    title={`#${card.slotNumber} - Figurinha não obtida`}
                  >
                    {/* Topo: Número do Slot */}
                    <div className="w-full flex justify-between items-center px-0.5">
                      <span className="font-arcade text-[7.5px] text-slate-400">
                        #{card.slotNumber}
                      </span>
                      <span className="font-arcade text-[6.5px] text-slate-500 bg-black/50 px-1 py-0.2 rounded">
                        {card.position}
                      </span>
                    </div>

                    {/* Centro: Ícone de Silhueta / Cadeado */}
                    <div className="flex flex-col items-center my-auto">
                      <span className="text-xl sm:text-2xl text-slate-600 group-hover:text-arcade-yellow/70 transition-colors">
                        🔒
                      </span>
                    </div>

                    {/* Base: Rótulo Faltando */}
                    <div className="w-full bg-black/60 rounded-lg py-0.5 px-1">
                      <span className="font-arcade text-[7px] text-amber-400/80 block truncate">
                        FALTANDO
                      </span>
                    </div>
                  </div>
                );
              }

              /* CARTA COLADA (ARTE EM DESTAQUE COM MOLDURA RETRÔ) */
              return (
                <div
                  key={card.id}
                  onClick={() => handleCardClick(card)}
                  className={`aspect-[1/1.38] rounded-xl border-2 sm:border-3 p-1 flex flex-col justify-between cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-lg relative group overflow-hidden bg-slate-950`}
                  style={{
                    borderColor: rConf.borderColor,
                    boxShadow: card.rarity === "LENDA" ? "0 0 12px rgba(255,214,10,0.5)" : undefined,
                  }}
                >
                  {/* Selo de Duplicatas (+X no topo direito) */}
                  {count > 1 && (
                    <div className="absolute top-1 right-1 font-arcade text-[7px] sm:text-[8px] bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 px-1.5 py-0.2 border border-slate-950 font-black rounded-full shadow-md z-20">
                      +{count - 1}
                    </div>
                  )}

                  {/* Topo da Carta: OVR + Selo da Raridade */}
                  <div className="w-full flex justify-between items-start z-10">
                    <div
                      className="font-arcade text-[8.5px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-lg border border-black shadow text-white leading-none"
                      style={{ backgroundColor: rConf.badgeBg }}
                    >
                      {card.ovr}
                    </div>

                    {count <= 1 && (
                      <span className="font-arcade text-[6.5px] sm:text-[7.5px] bg-black/75 px-1 py-0.2 rounded text-white/90 font-bold border border-white/20">
                        {card.position}
                      </span>
                    )}
                  </div>

                  {/* Foto / Imagem do Jogador Centralizada */}
                  <div className="absolute inset-0 flex items-center justify-center p-1 overflow-hidden pointer-events-none">
                    {card.imageUrl ? (
                      <img
                        src={card.imageUrl}
                        alt={card.name}
                        className="w-full h-full object-cover object-top rounded-lg group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-arcade-blue/40 rounded-lg">
                        <span className="text-2xl text-arcade-cream/50">👤</span>
                      </div>
                    )}
                  </div>

                  {/* Base da Carta: Gradiente Preto com Nome do Jogador */}
                  <div className="w-full z-10 mt-auto bg-gradient-to-t from-black via-black/85 to-transparent pt-3 pb-0.5 px-0.5 rounded-b-lg text-center">
                    <div className="font-arcade text-[7.5px] sm:text-[9px] text-white font-bold truncate uppercase tracking-tight drop-shadow">
                      {card.name}
                    </div>
                    {/* Barra de repetições estilo Clash Royale se tiver cópias */}
                    {count > 1 ? (
                      <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-0.5 border border-black">
                        <div className="bg-amber-400 h-full w-full" />
                      </div>
                    ) : (
                      <div className="font-arcade text-[6px] text-arcade-cream/60 leading-none">
                        #{card.slotNumber}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
