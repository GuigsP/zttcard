import { useState, useEffect } from "react";
import {
  canClaimDailyFree,
  getPlayerWallet,
  openPack,
  STORE_PACKS,
} from "../economy/economyService";
import type { CatalogCard, PackProduct } from "../economy/economyTypes";
import { PackOpeningModal } from "./PackOpeningModal";
import { sound } from "../audio";

type Props = {
  onBack: () => void;
};

export function PackShop({ onBack }: Props) {
  const [wallet, setWallet] = useState(getPlayerWallet());
  const [dailyStatus, setDailyStatus] = useState(canClaimDailyFree());
  const [openingCards, setOpeningCards] = useState<{ card: CatalogCard; wasNewInAlbum: boolean }[] | null>(null);
  const [openedPackName, setOpenedPackName] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Update timer every second
  useEffect(() => {
    const timer = setInterval(() => {
      setDailyStatus(canClaimDailyFree());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatRemainingTime = (ms: number): string => {
    const totalSecs = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hours.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleBuyPack = (pack: PackProduct) => {
    setErrorMessage(null);
    if (!pack.isDailyFree && wallet.coins < pack.priceCoins) {
      sound.playPointLost();
      setErrorMessage("Moedas ZTT insuficientes! Ganhe jogando partidas ou vendendo repetidas.");
      return;
    }

    if (pack.isDailyFree && !dailyStatus.canClaim) {
      sound.playPointLost();
      setErrorMessage("Pacote diário já resgatado. Aguarde o cronômetro!");
      return;
    }

    const res = openPack(pack.id);
    if (!res.success) {
      sound.playPointLost();
      setErrorMessage(res.error ?? "Erro ao abrir pacote.");
      return;
    }

    sound.playCoinEarn();
    setWallet(getPlayerWallet());
    setOpenedPackName(pack.name);
    setOpeningCards(res.cards);
  };

  const handleCloseOpening = () => {
    setOpeningCards(null);
    setWallet(getPlayerWallet());
    setDailyStatus(canClaimDailyFree());
  };

  return (
    <div className="min-h-screen bg-arcade-blue text-arcade-cream flex flex-col p-4 md:p-8">
      {openingCards && (
        <PackOpeningModal
          packName={openedPackName}
          cards={openingCards}
          onClose={handleCloseOpening}
        />
      )}

      {/* Header */}
      <div className="max-w-4xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
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
              <span>📰</span>
              <span>BANCA DE JORNAL</span>
            </h1>
            <p className="font-body text-xs text-arcade-cream/80">
              Compre pacotinhos com o jornaleiro, cole no álbum e monte sua coleção dos anos 90!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-arcade-dark px-4 py-2 border-2 border-arcade-yellow shadow-arcade">
          <span className="text-xl">🪙</span>
          <div className="flex flex-col">
            <span className="font-arcade text-xs text-arcade-yellow font-bold">
              {wallet.coins.toLocaleString()}
            </span>
            <span className="font-arcade text-[8px] text-arcade-cream/70">
              SUAS MOEDAS
            </span>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="max-w-4xl w-full mx-auto mb-6 p-3 bg-arcade-red border-2 border-arcade-yellow font-arcade text-xs text-arcade-cream text-center animate-shake">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Store Packs Grid */}
      <div className="max-w-4xl w-full mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {STORE_PACKS.map((pack) => {
          const isFree = pack.isDailyFree;
          const canClaim = isFree ? dailyStatus.canClaim : wallet.coins >= pack.priceCoins;

          return (
            <div
              key={pack.id}
              className="bg-arcade-dark border-4 border-arcade-yellow p-5 shadow-arcade flex flex-col justify-between items-center text-center gap-4 relative group hover:scale-[1.02] transition-transform"
            >
              {/* Top Badge */}
              <div className="font-arcade text-xs px-3 py-1 bg-arcade-cream text-arcade-dark border-2 border-arcade-dark font-bold">
                {pack.badge}
              </div>

              {/* Pack Illustration */}
              <div className="w-28 h-36 bg-gradient-to-tr from-amber-600 to-yellow-400 border-4 border-arcade-cream rounded shadow-lg flex flex-col items-center justify-center p-2 relative group-hover:rotate-2 transition-transform">
                <span className="text-3xl mb-1">📦</span>
                <span className="font-arcade text-[9px] text-arcade-dark font-bold">
                  {pack.cardsCount} CARTAS
                </span>
                {pack.guaranteedRarity && (
                  <span className="font-arcade text-[7px] bg-arcade-dark text-arcade-yellow px-1 mt-1 rounded">
                    ★ {pack.guaranteedRarity} ★
                  </span>
                )}
              </div>

              <div>
                <h3 className="font-arcade text-sm text-arcade-yellow mb-1">
                  {pack.name}
                </h3>
                <p className="font-body text-xs text-arcade-cream/80 min-h-[36px]">
                  {pack.description}
                </p>
              </div>

              {/* Action Button */}
              <div className="w-full">
                {isFree ? (
                  canClaim ? (
                    <button
                      onClick={() => handleBuyPack(pack)}
                      className="w-full font-arcade text-xs py-3 bg-arcade-green text-arcade-cream border-2 border-arcade-yellow shadow-arcade hover:bg-arcade-yellow hover:text-arcade-dark active:scale-95 transition-all animate-bounce"
                    >
                      🎁 RESGATAR GRÁTIS!
                    </button>
                  ) : (
                    <div className="w-full font-arcade text-[10px] py-2 bg-slate-800 text-slate-400 border-2 border-slate-600 flex flex-col items-center">
                      <span>DISPONÍVEL EM</span>
                      <span className="text-arcade-yellow font-bold text-xs mt-0.5">
                        {formatRemainingTime(dailyStatus.msRemaining)}
                      </span>
                    </div>
                  )
                ) : (
                  <button
                    onClick={() => handleBuyPack(pack)}
                    disabled={!canClaim}
                    className={`w-full font-arcade text-xs py-3 border-2 transition-all ${
                      canClaim
                        ? "bg-arcade-yellow text-arcade-dark border-arcade-cream shadow-arcade hover:bg-arcade-red hover:text-arcade-cream active:scale-95 cursor-pointer"
                        : "bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed"
                    }`}
                  >
                    🪙 ABRIR POR {pack.priceCoins}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info footer */}
      <div className="max-w-4xl w-full mx-auto mt-10 p-4 bg-arcade-dark/70 border-2 border-arcade-yellow/40 text-center">
        <div className="font-arcade text-xs text-arcade-yellow mb-1">
          💡 COMO FUNCIONA A COLEÇÃO?
        </div>
        <p className="font-body text-xs text-arcade-cream/80 max-w-2xl mx-auto">
          A primeira cópia de qualquer figurinha que você tirar na <b>Banca de Jornal</b> vai automaticamente e de forma permanente para o seu <b>Álbum Virtual</b>. As cópias repetidas vão para o seu <b>Montinho</b>, onde você pode vendê-las ou trocá-las na <b>Pracinha</b> com outros jogadores!
        </p>
      </div>
    </div>
  );
}
