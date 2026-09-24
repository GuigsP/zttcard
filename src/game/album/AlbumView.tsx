import { useState } from "react";
import { getMasterCatalog } from "../economy/cardCatalog";
import { getPlayerInventory } from "../economy/economyService";
import type { CatalogCard } from "../economy/economyTypes";
import { RARITY_CONFIG } from "../economy/economyTypes";
import { ATTR_LABELS, POSITION_LABELS } from "../types";
import { sound } from "../audio";

type Props = {
  onBack: () => void;
  onOpenShop: () => void;
};

type FilterType = "all" | "collected" | "missing";

export function AlbumView({ onBack, onOpenShop }: Props) {
  const catalog = getMasterCatalog();
  const inventory = getPlayerInventory();

  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedCard, setSelectedCard] = useState<CatalogCard | null>(null);

  // Statistics
  const totalCards = catalog.length;
  const collectedCount = catalog.filter((c) => (inventory[c.id] ?? 0) >= 1).length;
  const progressPercent = Math.round((collectedCount / totalCards) * 100);

  const filteredCards = catalog.filter((card) => {
    const isOwned = (inventory[card.id] ?? 0) >= 1;
    if (filter === "collected") return isOwned;
    if (filter === "missing") return !isOwned;
    return true;
  });

  return (
    <div className="min-h-screen bg-arcade-blue text-arcade-cream flex flex-col p-4 md:p-8">
      {/* Detail Modal */}
      {selectedCard && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedCard(null)}
        >
          <div
            className="bg-arcade-dark border-4 border-arcade-yellow max-w-sm w-full p-6 shadow-arcade text-center relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedCard(null)}
              className="absolute top-3 right-3 font-arcade text-xs text-arcade-yellow hover:text-arcade-red"
            >
              ✕
            </button>

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
            {selectedCard.imageUrl && (
              <div className="w-32 h-32 mx-auto my-2 rounded-xl overflow-hidden border-3 border-arcade-yellow shadow-arcade bg-arcade-dark/40">
                <img
                  src={selectedCard.imageUrl}
                  alt={selectedCard.name}
                  className="w-full h-full object-cover object-top"
                  loading="lazy"
                />
              </div>
            )}

            <div className="font-arcade text-xl text-arcade-yellow mb-1 uppercase tracking-wider flex items-center justify-center gap-2">
              {selectedCard.clubBadgeUrl && (
                <span>
                  {typeof selectedCard.clubBadgeUrl === "string" && (selectedCard.clubBadgeUrl.startsWith("http") || selectedCard.clubBadgeUrl.startsWith("/")) ? (
                    <img src={selectedCard.clubBadgeUrl} alt="Escudo" className="w-6 h-6 object-contain inline-block drop-shadow" />
                  ) : (
                    <span className="text-lg">{String(selectedCard.clubBadgeUrl)}</span>
                  )}
                </span>
              )}
              <span>{(selectedCard.name || "").toUpperCase()}</span>
            </div>
            <div className="font-arcade text-[10px] text-arcade-cream/80 mb-3">
              {POSITION_LABELS[selectedCard.position] ?? selectedCard.position ?? "JOGADOR"}
            </div>

            <div className="flex justify-center items-center gap-3 my-4">
              <div className="font-arcade text-3xl px-3 py-1 bg-arcade-blue text-arcade-yellow border-2 border-arcade-yellow">
                {selectedCard.ovr}
              </div>
              <div
                className="font-arcade text-xs px-2.5 py-1 text-white border-2 border-white rounded"
                style={{ backgroundColor: RARITY_CONFIG[selectedCard.rarity].badgeBg }}
              >
                {RARITY_CONFIG[selectedCard.rarity].label}
              </div>
            </div>

            {selectedCard.quote && (
              <div className="font-display italic text-arcade-cream/90 bg-arcade-blue/40 p-3 border-2 border-arcade-yellow/30 text-xs mb-4">
                "{selectedCard.quote}"
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 bg-arcade-blue/30 p-2 border border-arcade-yellow/40 text-[9px] font-arcade mb-4">
              {Object.entries(selectedCard.attrs).map(([k, v]) => (
                <div key={k} className="text-center">
                  <span className="text-arcade-cream/60 block text-[7px]">
                    {ATTR_LABELS[k as keyof typeof ATTR_LABELS]?.slice(0, 3)}
                  </span>
                  <span className="font-bold text-arcade-yellow text-xs">{v}</span>
                </div>
              ))}
            </div>

            <div className="font-arcade text-[9px] text-arcade-cream/70">
              CÓPIAS EM POSSE:{" "}
              <b className="text-arcade-yellow">{inventory[selectedCard.id] ?? 0}</b> (1 no álbum,{" "}
              {Math.max(0, (inventory[selectedCard.id] ?? 0) - 1)} repetidas)
            </div>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="max-w-6xl w-full mx-auto flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              sound.playAttrSelect();
              onBack();
            }}
            className="font-arcade text-[10px] px-3 py-2 bg-arcade-dark text-arcade-yellow border-2 border-arcade-yellow hover:bg-arcade-red transition-colors"
          >
            ← VOLTAR
          </button>
          <div>
            <h1 className="font-arcade text-xl md:text-2xl text-arcade-yellow drop-shadow-[2px_2px_0_var(--arcade-dark)]">
              ÁLBUM DE FIGURINHAS
            </h1>
            <p className="font-body text-xs text-arcade-cream/80">
              Coleção Retrô Anos 90 · Todas as 66 Figurinhas
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            sound.playAttrSelect();
            onOpenShop();
          }}
          className="font-arcade text-[10px] px-4 py-2.5 bg-arcade-green text-arcade-cream border-2 border-arcade-yellow shadow-arcade hover:bg-arcade-yellow hover:text-arcade-dark transition-all flex items-center gap-2"
        >
          <span>📰</span>
          <span>BANCA DE JORNAL</span>
        </button>
      </div>

      {/* Progress Bar Card */}
      <div className="max-w-6xl w-full mx-auto bg-arcade-dark border-4 border-arcade-yellow p-4 shadow-arcade mb-6">
        <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
          <span className="font-arcade text-xs text-arcade-yellow">
            PROGRESSO DO ÁLBUM
          </span>
          <span className="font-arcade text-xs text-arcade-cream">
            {collectedCount} de {totalCards} Figurinhas ({progressPercent}%)
          </span>
        </div>

        {/* Bar */}
        <div className="w-full h-4 bg-arcade-blue border-2 border-arcade-yellow overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-arcade-yellow to-amber-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="max-w-6xl w-full mx-auto flex gap-2 mb-6">
        <button
          onClick={() => setFilter("all")}
          className={`font-arcade text-[10px] px-4 py-2 border-2 transition-all ${
            filter === "all"
              ? "bg-arcade-yellow text-arcade-dark border-arcade-cream font-bold"
              : "bg-arcade-dark text-arcade-cream border-arcade-yellow/60 hover:bg-arcade-blue"
          }`}
        >
          TODAS ({totalCards})
        </button>
        <button
          onClick={() => setFilter("collected")}
          className={`font-arcade text-[10px] px-4 py-2 border-2 transition-all ${
            filter === "collected"
              ? "bg-arcade-yellow text-arcade-dark border-arcade-cream font-bold"
              : "bg-arcade-dark text-arcade-cream border-arcade-yellow/60 hover:bg-arcade-blue"
          }`}
        >
          COLADAS ({collectedCount})
        </button>
        <button
          onClick={() => setFilter("missing")}
          className={`font-arcade text-[10px] px-4 py-2 border-2 transition-all ${
            filter === "missing"
              ? "bg-arcade-yellow text-arcade-dark border-arcade-cream font-bold"
              : "bg-arcade-dark text-arcade-cream border-arcade-yellow/60 hover:bg-arcade-blue"
          }`}
        >
          FALTANDO ({totalCards - collectedCount})
        </button>
      </div>

      {/* Sticker Album Grid */}
      <div className="max-w-6xl w-full mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {filteredCards.map((card) => {
          const count = inventory[card.id] ?? 0;
          const isOwned = count >= 1;
          const rConf = RARITY_CONFIG[card.rarity];

          if (!isOwned) {
            /* Missing Sticker Silhouette */
            return (
              <div
                key={card.id}
                className="aspect-[3/4] bg-arcade-dark/80 border-2 border-dashed border-arcade-cream/30 rounded p-2 flex flex-col justify-between items-center text-center opacity-60 hover:opacity-90 transition-opacity"
              >
                <span className="font-arcade text-[9px] text-arcade-cream/50">
                  #{card.slotNumber}
                </span>
                <div className="flex flex-col items-center">
                  <span className="text-2xl text-arcade-cream/40 mb-1">👤</span>
                  <span className="font-arcade text-[8px] text-arcade-cream/60">
                    {POSITION_LABELS[card.position]}
                  </span>
                </div>
                <span className="font-arcade text-[7px] text-arcade-yellow/60 bg-arcade-blue/40 px-1 py-0.5 rounded">
                  FALTANDO
                </span>
              </div>
            );
          }

          /* Glued Sticker */
          return (
            <div
              key={card.id}
              onClick={() => {
                sound.playCardFlip();
                setSelectedCard(card);
              }}
              className={`aspect-[3/4] bg-arcade-cream text-arcade-dark border-4 ${rConf.glowClass} rounded-sm p-2 flex flex-col justify-between cursor-pointer hover:scale-105 active:scale-95 transition-transform shadow-arcade relative group`}
              style={{ borderColor: rConf.borderColor }}
            >
              {/* Duplicates badge in album */}
              {count > 1 && (
                <div className="absolute -top-2 -right-2 font-arcade text-[8px] bg-amber-500 text-arcade-dark px-1.5 py-0.5 border-2 border-arcade-dark font-bold rounded-full shadow z-10">
                  +{count - 1}
                </div>
              )}

              {/* Slot Header */}
              <div className="flex justify-between items-center border-b border-arcade-dark/20 pb-0.5">
                <span className="font-arcade text-[8px] text-arcade-red font-bold">
                  #{card.slotNumber}
                </span>
                <span
                  className="font-arcade text-[6px] px-1 py-0.2 rounded text-white"
                  style={{ backgroundColor: rConf.badgeBg }}
                >
                  {rConf.label}
                </span>
              </div>

              {/* Name & Position */}
              <div className="text-center my-0.5">
                <div className="font-arcade text-[10px] text-arcade-dark truncate font-bold uppercase tracking-wider">
                  {card.name.toUpperCase()}
                </div>
                <div className="font-arcade text-[7px] text-arcade-dark/70">
                  {POSITION_LABELS[card.position]}
                </div>
              </div>

              {/* OVR */}
              <div className="flex justify-center my-0.5">
                <div className="font-arcade text-xs px-1.5 py-0.5 bg-arcade-dark text-arcade-yellow border border-arcade-yellow">
                  {card.ovr}
                </div>
              </div>

              {/* Mini Stats */}
              <div className="grid grid-cols-3 gap-0.5 bg-arcade-dark/5 p-0.5 rounded text-[7px] font-arcade text-center">
                {Object.entries(card.attrs).slice(0, 3).map(([k, v]) => (
                  <div key={k}>
                    <span className="text-arcade-dark/50 block text-[5px]">
                      {ATTR_LABELS[k as keyof typeof ATTR_LABELS]?.slice(0, 3)}
                    </span>
                    <span className="font-bold text-arcade-dark">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
