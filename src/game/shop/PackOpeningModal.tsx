import { useState } from "react";
import type { CatalogCard } from "../economy/economyTypes";
import { RARITY_CONFIG } from "../economy/economyTypes";
import { sound } from "../audio";
import { ATTR_LABELS, POSITION_LABELS } from "../types";

type DrawnCard = {
  card: CatalogCard;
  wasNewInAlbum: boolean;
};

type Props = {
  packName: string;
  cards: DrawnCard[];
  onClose: () => void;
};

type Stage = "sealed" | "tearing" | "revealing" | "done";

export function PackOpeningModal({ packName, cards, onClose }: Props) {
  const [stage, setStage] = useState<Stage>("sealed");
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());

  const handleTearPack = () => {
    sound.playPackTear();
    setStage("tearing");
    setTimeout(() => {
      setStage("revealing");
    }, 450);
  };

  const handleRevealCard = (idx: number, card: CatalogCard) => {
    if (revealedIndices.has(idx)) return;
    const next = new Set(revealedIndices);
    next.add(idx);
    setRevealedIndices(next);

    if (card.rarity === "LENDA") {
      sound.playLegendaryReveal();
    } else {
      sound.playCardReveal();
    }

    if (next.size === cards.length) {
      setTimeout(() => {
        setStage("done");
      }, 500);
    }
  };

  const handleRevealAll = () => {
    const all = new Set(cards.map((_, i) => i));
    setRevealedIndices(all);
    sound.playCardReveal();
    setStage("done");
  };

  const handleFinish = () => {
    sound.playStickerStick();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-arcade-dark border-4 border-arcade-yellow max-w-3xl w-full p-6 shadow-arcade flex flex-col items-center text-center relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-arcade-yellow/10 rounded-full blur-3xl pointer-events-none" />

        <div className="font-arcade text-lg text-arcade-yellow mb-1 tracking-wider">
          {packName}
        </div>
        <div className="font-body text-xs text-arcade-cream/80 mb-6">
          {stage === "sealed" && "Rasgue o pacotinho para revelar as figurinhas!"}
          {stage === "revealing" && "Clique em cada figurinha para desvirar!"}
          {stage === "done" && "Figurinhas resgatadas com sucesso!"}
        </div>

        {/* STAGE: SEALED PACK */}
        {stage === "sealed" && (
          <div className="flex flex-col items-center gap-6 my-6">
            <div className="relative group cursor-pointer animate-pulse hover:scale-105 transition-transform" onClick={handleTearPack}>
              <div className="w-48 h-64 bg-gradient-to-br from-amber-500 via-yellow-400 to-amber-600 border-4 border-arcade-cream rounded-lg shadow-2xl flex flex-col items-center justify-between p-4 transform -rotate-1 hover:rotate-0 transition-transform">
                <div className="font-arcade text-xs text-arcade-dark border-2 border-arcade-dark px-2 py-0.5 bg-arcade-cream/80 rounded">
                  ZTT 90s
                </div>
                <div className="text-4xl animate-bounce">⚡⚽⚡</div>
                <div className="font-arcade text-sm text-arcade-dark">
                  PAC-FIGURINHAS
                </div>
                <div className="font-arcade text-[10px] text-arcade-dark/80">
                  {cards.length} FIGURINHAS
                </div>
              </div>
            </div>

            <button
              onClick={handleTearPack}
              className="font-arcade text-sm px-6 py-3 bg-arcade-red text-arcade-cream border-4 border-arcade-yellow shadow-arcade hover:bg-arcade-yellow hover:text-arcade-dark active:scale-95 transition-all"
            >
              ✂️ RASGAR PACOTINHO!
            </button>
          </div>
        )}

        {/* STAGE: TEARING ANIMATION */}
        {stage === "tearing" && (
          <div className="py-20 flex flex-col items-center gap-4">
            <div className="text-6xl animate-spin">✨</div>
            <div className="font-arcade text-sm text-arcade-yellow animate-bounce">
              RASGANDO...
            </div>
          </div>
        )}

        {/* STAGE: REVEALING & DONE */}
        {(stage === "revealing" || stage === "done") && (
          <div className="w-full flex flex-col items-center gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full justify-items-center">
              {cards.map((item, idx) => {
                const isFlipped = revealedIndices.has(idx);
                const rConf = RARITY_CONFIG[item.card.rarity];

                return (
                  <div
                    key={item.card.id + idx}
                    onClick={() => handleRevealCard(idx, item.card)}
                    className={`w-40 sm:w-44 h-60 rounded-sm cursor-pointer transition-all duration-300 transform perspective-1000 ${
                      isFlipped ? "rotate-0 scale-100" : "hover:-translate-y-2"
                    }`}
                  >
                    {!isFlipped ? (
                      /* Card Back */
                      <div className="w-full h-full bg-arcade-blue border-4 border-arcade-yellow rounded-sm p-3 flex flex-col items-center justify-between shadow-arcade">
                        <div className="font-arcade text-[10px] text-arcade-cream">
                          ?
                        </div>
                        <div className="font-arcade text-2xl text-arcade-yellow animate-pulse">
                          ⚽
                        </div>
                        <div className="font-arcade text-[9px] text-arcade-cream bg-arcade-dark px-2 py-1 border border-arcade-yellow">
                          CLIQUE
                        </div>
                      </div>
                    ) : (
                      /* Card Front */
                      <div
                        className={`w-full h-full bg-arcade-cream text-arcade-dark border-4 ${rConf.glowClass} flex flex-col justify-between p-2 rounded-sm shadow-arcade animate-in fade-in zoom-in-75 duration-300`}
                        style={{ borderColor: rConf.borderColor }}
                      >
                        {/* Header */}
                        <div className="flex justify-between items-center border-b-2 border-arcade-dark pb-1">
                          <span className="font-arcade text-[9px] text-arcade-red">
                            #{item.card.slotNumber}
                          </span>
                          <span
                            className="font-arcade text-[8px] px-1.5 py-0.5 rounded text-white"
                            style={{ backgroundColor: rConf.badgeBg }}
                          >
                            {rConf.label}
                          </span>
                        </div>

                        {/* Name & Position */}
                        <div className="my-1 text-center">
                          <div className="font-arcade text-xs text-arcade-dark truncate uppercase tracking-wider font-bold">
                            {item.card.name.toUpperCase()}
                          </div>
                          <div className="font-arcade text-[8px] text-arcade-dark/70">
                            {POSITION_LABELS[item.card.position]}
                          </div>
                        </div>

                        {/* OVR & Badge */}
                        <div className="flex justify-center items-center my-1">
                          <div className="font-arcade text-lg px-2 py-0.5 bg-arcade-dark text-arcade-yellow border border-arcade-yellow">
                            {item.card.ovr}
                          </div>
                        </div>

                        {/* Attributes Mini-table */}
                        <div className="grid grid-cols-3 gap-1 bg-arcade-dark/10 p-1 rounded text-[8px] font-arcade">
                          {Object.entries(item.card.attrs).slice(0, 3).map(([k, v]) => (
                            <div key={k} className="text-center">
                              <span className="text-arcade-dark/60 block text-[6px]">
                                {ATTR_LABELS[k as keyof typeof ATTR_LABELS]?.slice(0, 3)}
                              </span>
                              <span className="font-bold text-arcade-dark">{v}</span>
                            </div>
                          ))}
                        </div>

                        {/* Status Stamp: NEW vs DUPLICATE */}
                        <div className="mt-1 pt-1 border-t border-arcade-dark/30">
                          {item.wasNewInAlbum ? (
                            <div className="font-arcade text-[8px] bg-arcade-green text-arcade-cream py-0.5 px-1 rounded animate-pulse">
                              🌟 NOVA NO ÁLBUM!
                            </div>
                          ) : (
                            <div className="font-arcade text-[8px] bg-amber-500 text-arcade-dark py-0.5 px-1 rounded font-bold">
                              🔁 REPETIDA (+1)
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 mt-4">
              {stage === "revealing" && revealedIndices.size < cards.length && (
                <button
                  onClick={handleRevealAll}
                  className="font-arcade text-[10px] px-4 py-2 bg-arcade-blue text-arcade-cream border-2 border-arcade-yellow hover:bg-arcade-yellow hover:text-arcade-dark"
                >
                  DESVIRAR TODAS
                </button>
              )}

              {stage === "done" && (
                <button
                  onClick={handleFinish}
                  className="font-arcade text-sm px-6 py-3 bg-arcade-green text-arcade-cream border-4 border-arcade-yellow shadow-arcade hover:bg-arcade-yellow hover:text-arcade-dark active:scale-95 transition-all animate-bounce"
                >
                  📖 COLAR NO ÁLBUM & CONTINUAR
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
