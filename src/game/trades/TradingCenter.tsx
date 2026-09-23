import { useState } from "react";
import {
  buyMarketListing,
  createTradeListing,
  getDuplicatesList,
  getMarketListings,
  getPlayerInventory,
  sellDuplicateCard,
} from "../economy/economyService";
import { getCardById, getMasterCatalog } from "../economy/cardCatalog";
import { readIdentity, ensurePlayerId } from "../storage";
import { RARITY_CONFIG } from "../economy/economyTypes";
import { sound } from "../audio";
import { POSITION_LABELS } from "../types";

type Props = {
  onBack: () => void;
  onOpenShop: () => void;
};

type Tab = "duplicates" | "market" | "p2p";

export function TradingCenter({ onBack, onOpenShop }: Props) {
  const [tab, setTab] = useState<Tab>("duplicates");
  const [duplicates, setDuplicates] = useState(getDuplicatesList());
  const [listings, setListings] = useState(getMarketListings());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Listing Modal State
  const [listingCardId, setListingCardId] = useState<string | null>(null);
  const [listingPrice, setListingPrice] = useState<number>(50);

  // P2P Room State
  const [p2pCode, setP2pCode] = useState("");
  const [p2pSelectedMyCard, setP2pSelectedMyCard] = useState<string | null>(null);
  const [p2pActiveRoom, setP2pActiveRoom] = useState<string | null>(null);

  const identity = readIdentity() ?? {
    playerId: ensurePlayerId(),
    nickname: "Colecionador",
    avatar: "av1",
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSellDuplicate = (cardId: string) => {
    const res = sellDuplicateCard(cardId);
    if (res.success) {
      sound.playCoinEarn();
      setDuplicates(getDuplicatesList());
      showToast(`Figurinha vendida! +${res.earnedCoins} Moedas ZTT.`);
    } else {
      sound.playPointLost();
      showToast("Não foi possível vender. Você só pode vender figurinhas repetidas!");
    }
  };

  const handleCreateListing = () => {
    if (!listingCardId) return;
    const res = createTradeListing(
      identity.playerId,
      identity.nickname,
      identity.avatar,
      listingCardId,
      listingPrice,
      null,
    );
    if (res.success) {
      sound.playCoinEarn();
      setDuplicates(getDuplicatesList());
      setListings(getMarketListings());
      setListingCardId(null);
      showToast("Anúncio publicado na Feira do Álbum!");
    } else {
      sound.playPointLost();
      showToast(res.error ?? "Erro ao publicar anúncio.");
    }
  };

  const handleBuyListing = (listingId: string) => {
    const res = buyMarketListing(listingId, identity.playerId);
    if (res.success) {
      sound.playCoinEarn();
      setListings(getMarketListings());
      setDuplicates(getDuplicatesList());
      showToast("Compra realizada com sucesso! Figurinha adicionada ao álbum.");
    } else {
      sound.playPointLost();
      showToast(res.error ?? "Erro na compra.");
    }
  };

  const handleStartP2P = () => {
    if (!p2pCode.trim()) {
      showToast("Insira um código de 5 letras para a sala.");
      return;
    }
    sound.playAttrSelect();
    setP2pActiveRoom(p2pCode.toUpperCase());
  };

  return (
    <div className="min-h-screen bg-arcade-blue text-arcade-cream flex flex-col p-4 md:p-8">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-arcade-dark border-2 border-arcade-yellow px-4 py-2 text-arcade-yellow font-arcade text-xs shadow-arcade animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="max-w-5xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
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
            <h1 className="font-arcade text-xl md:text-2xl text-arcade-yellow drop-shadow-[2px_2px_0_var(--arcade-dark)] flex items-center gap-2">
              <span>🌳</span>
              <span>A PRACINHA</span>
            </h1>
            <p className="font-body text-xs text-arcade-cream/80">
              O ponto de encontro dos colecionadores! Negocie no montinho, anuncie ou troque com amigos!
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            sound.playAttrSelect();
            onOpenShop();
          }}
          className="font-arcade text-[10px] px-4 py-2 bg-arcade-green text-arcade-cream border-2 border-arcade-yellow shadow-arcade hover:bg-arcade-yellow hover:text-arcade-dark flex items-center gap-1.5"
        >
          <span>📰</span>
          <span>IR À BANCA DE JORNAL</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="max-w-5xl w-full mx-auto flex gap-2 mb-6">
        <button
          onClick={() => {
            sound.playAttrSelect();
            setTab("duplicates");
          }}
          className={`font-arcade text-[10px] px-4 py-2.5 border-2 transition-all flex items-center gap-1.5 ${
            tab === "duplicates"
              ? "bg-amber-500 text-arcade-dark border-arcade-cream font-bold shadow-arcade scale-105"
              : "bg-arcade-dark text-arcade-cream border-arcade-yellow/60 hover:bg-arcade-blue"
          }`}
        >
          <span>🥞</span>
          <span>MEU MONTINHO ({duplicates.reduce((acc, d) => acc + d.duplicatesCount, 0)})</span>
        </button>

        <button
          onClick={() => {
            sound.playAttrSelect();
            setTab("market");
          }}
          className={`font-arcade text-[10px] px-4 py-2.5 border-2 transition-all flex items-center gap-1.5 ${
            tab === "market"
              ? "bg-arcade-yellow text-arcade-dark border-arcade-cream font-bold shadow-arcade scale-105"
              : "bg-arcade-dark text-arcade-cream border-arcade-yellow/60 hover:bg-arcade-blue"
          }`}
        >
          <span>🎪</span>
          <span>FEIRINHA DA PRAÇA</span>
        </button>

        <button
          onClick={() => {
            sound.playAttrSelect();
            setTab("p2p");
          }}
          className={`font-arcade text-[10px] px-4 py-2.5 border-2 transition-all flex items-center gap-1.5 ${
            tab === "p2p"
              ? "bg-purple-600 text-arcade-cream border-arcade-cream font-bold shadow-arcade scale-105"
              : "bg-arcade-dark text-arcade-cream border-arcade-yellow/60 hover:bg-arcade-blue"
          }`}
        >
          <span>🤝</span>
          <span>BATER CARA / TROCA 1X1</span>
        </button>
      </div>

      {/* TAB 1: MEU MONTINHO (DUPLICATES) */}
      {tab === "duplicates" && (
        <div className="max-w-5xl w-full mx-auto flex flex-col gap-4">
          <div className="bg-arcade-dark border-2 border-arcade-yellow/60 p-3 text-xs font-body text-arcade-cream/80 flex items-center justify-between">
            <span>
              Regra da Praça: A 1ª cópia fica <b>sempre colada no seu Álbum</b>. Apenas as cópias repetidas (2ª em diante) podem ser vendidas ou trocadas!
            </span>
          </div>

          {duplicates.length === 0 ? (
            <div className="bg-arcade-dark border-4 border-arcade-yellow p-12 text-center shadow-arcade">
              <div className="text-4xl mb-3">🥞</div>
              <div className="font-arcade text-sm text-arcade-yellow mb-2">
                SEU MONTINHO ESTÁ VAZIO!
              </div>
              <p className="font-body text-xs text-arcade-cream/70 max-w-md mx-auto mb-4">
                Você não possui figurinhas repetidas no momento. Passe na <b>Banca de Jornal</b> para abrir pacotinhos e conseguir repetidas!
              </p>
              <button
                onClick={onOpenShop}
                className="font-arcade text-xs px-4 py-2.5 bg-arcade-green text-arcade-cream border-2 border-arcade-yellow shadow-arcade hover:bg-arcade-yellow hover:text-arcade-dark flex items-center justify-center gap-1.5 mx-auto"
              >
                <span>📰</span>
                <span>COMPRAR PACOTES NA BANCA</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {duplicates.map(({ card, duplicatesCount, sellPrice }) => {
                const rConf = RARITY_CONFIG[card.rarity];

                return (
                  <div
                    key={card.id}
                    className="bg-arcade-dark border-4 border-arcade-yellow p-4 flex flex-col justify-between shadow-arcade relative"
                  >
                    {/* Badge */}
                    <div className="absolute top-2 right-2 font-arcade text-[9px] bg-amber-500 text-arcade-dark px-2 py-0.5 rounded font-bold">
                      {duplicatesCount}x REPETIDA
                    </div>

                    <div>
                      <div className="font-arcade text-[9px] text-arcade-red mb-1">
                        #{card.slotNumber} · {card.position}
                      </div>
                      <div className="font-arcade text-sm text-arcade-yellow truncate mb-1 uppercase tracking-wider">
                        {card.name.toUpperCase()}
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-arcade text-xs px-1.5 py-0.5 bg-arcade-blue text-arcade-yellow border border-arcade-yellow">
                          OVR {card.ovr}
                        </span>
                        <span
                          className="font-arcade text-[7px] px-1.5 py-0.5 text-white rounded"
                          style={{ backgroundColor: rConf.badgeBg }}
                        >
                          {rConf.label}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-2 border-t border-arcade-yellow/30">
                      {card.isExclusive ? (
                        <div className="bg-amber-950/80 border border-amber-500/50 p-2 text-center rounded">
                          <span className="font-arcade text-[8px] text-amber-300 flex items-center justify-center gap-1">
                            <span>⭐</span>
                            <span>FIGURINHA EXCLUSIVA DE APOIADOR (NÃO NEGOCIÁVEL)</span>
                          </span>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleSellDuplicate(card.id)}
                            className="w-full font-arcade text-[9px] py-2 bg-arcade-green text-arcade-cream border-2 border-arcade-dark hover:bg-arcade-yellow hover:text-arcade-dark transition-all flex items-center justify-center gap-1"
                          >
                            <span>🪙</span>
                            <span>VENDER (+{sellPrice})</span>
                          </button>

                          <button
                            onClick={() => {
                              setListingCardId(card.id);
                              setListingPrice(sellPrice);
                            }}
                            className="w-full font-arcade text-[9px] py-2 bg-arcade-blue text-arcade-cream border-2 border-arcade-yellow hover:bg-arcade-yellow hover:text-arcade-dark transition-all"
                          >
                            🎪 ANUNCIAR NA FEIRA
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Modal Anunciar */}
          {listingCardId && (
            <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
              <div className="bg-arcade-dark border-4 border-arcade-yellow max-w-sm w-full p-5 shadow-arcade">
                <div className="font-arcade text-sm text-arcade-yellow mb-2">
                  ANUNCIAR NA FEIRA
                </div>
                <p className="font-body text-xs text-arcade-cream/80 mb-4">
                  Defina o valor em moedas ZTT que deseja receber pela sua figurinha repetida:
                </p>

                <div className="flex items-center gap-2 mb-4 bg-arcade-blue/40 p-2 border border-arcade-yellow">
                  <span className="text-xl">🪙</span>
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    value={listingPrice}
                    onChange={(e) => setListingPrice(Number(e.target.value))}
                    className="w-full bg-transparent text-arcade-yellow font-arcade text-sm outline-none"
                  />
                  <span className="font-arcade text-[9px] text-arcade-cream/60">
                    MOEDAS
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setListingCardId(null)}
                    className="flex-1 font-arcade text-[10px] py-2 bg-slate-700 text-slate-300 hover:bg-slate-600"
                  >
                    CANCELAR
                  </button>
                  <button
                    onClick={handleCreateListing}
                    className="flex-1 font-arcade text-[10px] py-2 bg-arcade-green text-arcade-cream border-2 border-arcade-yellow hover:bg-arcade-yellow hover:text-arcade-dark"
                  >
                    PUBLICAR
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FEIRA DO ÁLBUM (MARKETPLACE) */}
      {tab === "market" && (
        <div className="max-w-5xl w-full mx-auto flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {listings
              .filter((l) => l.status === "active")
              .map((item) => {
                const card = getCardById(item.offeredCardId);
                if (!card) return null;
                const rConf = RARITY_CONFIG[card.rarity];
                const isMyListing = item.sellerId === identity.playerId;

                return (
                  <div
                    key={item.id}
                    className="bg-arcade-dark border-4 border-arcade-yellow p-4 shadow-arcade flex flex-col justify-between"
                  >
                    <div>
                      {/* Seller header */}
                      <div className="flex items-center justify-between border-b border-arcade-yellow/30 pb-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">👤</span>
                          <span className="font-arcade text-[9px] text-arcade-cream">
                            {item.sellerNickname}
                          </span>
                        </div>
                        {isMyListing && (
                          <span className="font-arcade text-[8px] bg-arcade-blue px-1.5 py-0.5 rounded text-arcade-yellow">
                            SEU ANÚNCIO
                          </span>
                        )}
                      </div>

                      {/* Card Details */}
                      <div className="font-arcade text-[9px] text-arcade-red">
                        #{card.slotNumber} · {POSITION_LABELS[card.position]}
                      </div>
                      <div className="font-arcade text-sm text-arcade-yellow truncate my-1 uppercase tracking-wider">
                        {card.name.toUpperCase()}
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-arcade text-xs px-1.5 py-0.5 bg-arcade-blue text-arcade-yellow border border-arcade-yellow">
                          OVR {card.ovr}
                        </span>
                        <span
                          className="font-arcade text-[7px] px-1.5 py-0.5 text-white rounded"
                          style={{ backgroundColor: rConf.badgeBg }}
                        >
                          {rConf.label}
                        </span>
                      </div>
                    </div>

                    {/* Buy Action */}
                    <div className="pt-2 border-t border-arcade-yellow/30">
                      {isMyListing ? (
                        <div className="font-arcade text-[9px] text-center text-arcade-cream/60 py-2">
                          Aguardando comprador ({item.priceCoins} 🪙)
                        </div>
                      ) : (
                        <button
                          onClick={() => handleBuyListing(item.id)}
                          className="w-full font-arcade text-xs py-2.5 bg-arcade-green text-arcade-cream border-2 border-arcade-dark hover:bg-arcade-yellow hover:text-arcade-dark shadow-arcade flex items-center justify-center gap-1.5 transition-all active:scale-95"
                        >
                          <span>🪙</span>
                          <span>COMPRAR POR {item.priceCoins} MOEDAS</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 3: TROCA COM AMIGOS (P2P CODE) */}
      {tab === "p2p" && (
        <div className="max-w-2xl w-full mx-auto bg-arcade-dark border-4 border-arcade-yellow p-6 shadow-arcade text-center">
          {!p2pActiveRoom ? (
            <div className="flex flex-col items-center gap-4">
              <div className="text-4xl">🤝</div>
              <div className="font-arcade text-sm text-arcade-yellow">
                MESA DE TROCA DIRETA (P2P)
              </div>
              <p className="font-body text-xs text-arcade-cream/80 max-w-md">
                Combine com seu amigo, crie ou digite o código de 5 letras da sala de troca e selecionem uma figurinha repetida de cada lado!
              </p>

              <div className="flex flex-col sm:flex-row gap-2 w-full max-w-sm">
                <input
                  type="text"
                  maxLength={5}
                  placeholder="CÓDIGO (EX: COPA9)"
                  value={p2pCode}
                  onChange={(e) => setP2pCode(e.target.value.toUpperCase())}
                  className="bg-arcade-blue text-arcade-yellow font-arcade text-center tracking-widest text-sm p-3 border-2 border-arcade-yellow outline-none uppercase placeholder:text-arcade-cream/40"
                />
                <button
                  onClick={handleStartP2P}
                  className="font-arcade text-xs px-5 py-3 bg-arcade-green text-arcade-cream border-2 border-arcade-yellow hover:bg-arcade-yellow hover:text-arcade-dark"
                >
                  ENTRAR NA SALA
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="flex justify-between items-center w-full border-b border-arcade-yellow pb-2">
                <span className="font-arcade text-xs text-arcade-yellow">
                  SALA DE TROCA: <b className="text-arcade-cream">{p2pActiveRoom}</b>
                </span>
                <button
                  onClick={() => setP2pActiveRoom(null)}
                  className="font-arcade text-[9px] text-arcade-red hover:underline"
                >
                  SAIR DA SALA
                </button>
              </div>

              <p className="font-body text-xs text-arcade-cream/80">
                Selecione qual figurinha do seu Montinho você quer colocar na mesa:
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full my-3 max-h-60 overflow-y-auto">
                {duplicates.filter(({ card }) => !card.isExclusive).map(({ card }) => (
                  <button
                    key={card.id}
                    onClick={() => setP2pSelectedMyCard(card.id)}
                    className={`p-2 border-2 text-left transition-all ${
                      p2pSelectedMyCard === card.id
                        ? "bg-arcade-yellow text-arcade-dark border-arcade-cream scale-105"
                        : "bg-arcade-blue text-arcade-cream border-arcade-yellow/60 hover:bg-arcade-yellow/20"
                    }`}
                  >
                    <div className="font-arcade text-[8px] text-arcade-red">
                      #{card.slotNumber} · {card.position}
                    </div>
                    <div className="font-arcade text-[10px] truncate uppercase tracking-wider">
                      {card.name.toUpperCase()}
                    </div>
                  </button>
                ))}
              </div>

              {p2pSelectedMyCard && (
                <div className="w-full bg-arcade-blue/50 p-4 border-2 border-arcade-yellow text-center">
                  <div className="font-arcade text-xs text-arcade-yellow mb-2">
                    FIGURINHA SELECIONADA NA MESA!
                  </div>
                  <button
                    onClick={() => {
                      sound.playStickerStick();
                      showToast("Proposta de troca enviada para a sala!");
                    }}
                    className="font-arcade text-xs px-6 py-2.5 bg-arcade-green text-arcade-cream border-2 border-arcade-yellow shadow-arcade hover:bg-arcade-yellow hover:text-arcade-dark"
                  >
                    CONFIRMAR TROCA 🤝
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
