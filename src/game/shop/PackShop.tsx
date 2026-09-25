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

  const handleBuyPack = (pack: PackProduct, useAlternativeCurrency = false) => {
    setErrorMessage(null);

    if (pack.isDailyFree && !dailyStatus.canClaim) {
      sound.playPointLost();
      setErrorMessage("Pacote diário já resgatado. Aguarde o cronômetro do jornaleiro!");
      return;
    }

    if (pack.id === "lendas_90s") {
      if (useAlternativeCurrency) {
        // Pagamento com Conto (1.500)
        if (wallet.contos < 1500) {
          sound.playPointLost();
          setErrorMessage("Conto insuficiente! São necessários 1.500 Conto para a Caixa Lendas 90s.");
          return;
        }
      } else {
        // Pagamento com Fichas de Ouro (120)
        if (wallet.fichasOuro < 120) {
          sound.playPointLost();
          setErrorMessage("Fichas de Ouro insuficientes! Adquira na banca ou use 1.500 Conto.");
          return;
        }
      }
    } else if (!pack.isDailyFree && wallet.contos < pack.priceCoins) {
      sound.playPointLost();
      setErrorMessage("Conto insuficiente! Jogue partidas ou venda repetidas para acumular.");
      return;
    }

    const res = openPack(pack.id, useAlternativeCurrency);
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
      <div className="max-w-5xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              sound.playAttrSelect();
              onBack();
            }}
            className="font-arcade text-[10px] px-3 py-2 bg-arcade-dark text-arcade-yellow border-2 border-arcade-yellow hover:bg-arcade-red transition-colors shadow-arcade active:scale-95"
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

        {/* Saldo da Carteira (Contos + Fichas de Ouro) */}
        <div className="flex items-center gap-3">
          {/* Contos (Farm) */}
          <div className="flex items-center gap-2 bg-arcade-dark px-3 py-1.5 border-2 border-arcade-yellow shadow-arcade">
            <span className="text-lg">🪙</span>
            <div className="flex flex-col">
              <span className="font-arcade text-xs text-arcade-yellow font-bold">
                {wallet.contos.toLocaleString()}
              </span>
              <span className="font-arcade text-[8px] text-arcade-cream/70">
                CONTO
              </span>
            </div>
          </div>

          {/* Fichas de Ouro (Premium) */}
          <div className="flex items-center gap-2 bg-arcade-dark px-3 py-1.5 border-2 border-yellow-500 shadow-arcade">
            <span className="text-lg">🟡</span>
            <div className="flex flex-col">
              <span className="font-arcade text-xs text-yellow-400 font-bold">
                {wallet.fichasOuro.toLocaleString()}
              </span>
              <span className="font-arcade text-[8px] text-arcade-cream/70">
                FICHAS OURO
              </span>
            </div>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="max-w-5xl w-full mx-auto mb-6 p-3 bg-arcade-red border-2 border-arcade-yellow font-arcade text-xs text-arcade-cream text-center animate-shake shadow-arcade">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Store Packs Grid */}
      <div className="max-w-5xl w-full mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {STORE_PACKS.map((pack) => {
          const isFree = pack.isDailyFree;
          const isLendas = pack.id === "lendas_90s";

          return (
            <div
              key={pack.id}
              className={`bg-arcade-dark border-4 ${
                isLendas ? "border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.35)]" : "border-arcade-yellow"
              } p-5 shadow-arcade flex flex-col justify-between items-center text-center gap-4 relative group hover:scale-[1.02] transition-transform`}
            >
              {/* Top Badge */}
              <div
                className={`font-arcade text-xs px-3 py-1 border-2 font-bold ${
                  isLendas
                    ? "bg-yellow-400 text-arcade-dark border-arcade-dark animate-pulse"
                    : isFree
                    ? "bg-arcade-green text-arcade-cream border-arcade-dark"
                    : "bg-arcade-cream text-arcade-dark border-arcade-dark"
                }`}
              >
                {pack.badge}
              </div>

              {/* Pack Illustration */}
              <div
                className={`w-28 h-36 ${
                  isLendas
                    ? "bg-gradient-to-tr from-amber-500 via-yellow-300 to-yellow-500 border-4 border-yellow-200"
                    : "bg-gradient-to-tr from-amber-600 to-yellow-400 border-4 border-arcade-cream"
                } rounded shadow-lg flex flex-col items-center justify-center p-2 relative group-hover:rotate-2 transition-transform`}
              >
                <span className="text-3xl mb-1">{isLendas ? "👑" : "📦"}</span>
                <span className="font-arcade text-[9px] text-arcade-dark font-bold">
                  {pack.cardsCount} CARTAS
                </span>
                {pack.guaranteedRarity && (
                  <span className="font-arcade text-[7px] bg-arcade-dark text-arcade-yellow px-1 mt-1 rounded font-bold">
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

              {/* Action Button(s) */}
              <div className="w-full">
                {isFree ? (
                  dailyStatus.canClaim ? (
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
                ) : isLendas ? (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleBuyPack(pack, false)}
                      disabled={wallet.fichasOuro < 120}
                      className={`w-full font-arcade text-xs py-2.5 border-2 transition-all ${
                        wallet.fichasOuro >= 120
                          ? "bg-yellow-400 text-arcade-dark border-yellow-200 shadow-arcade hover:bg-yellow-300 active:scale-95 cursor-pointer font-bold"
                          : "bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed"
                      }`}
                    >
                      🟡 120 FICHAS OURO
                    </button>
                    <button
                      onClick={() => handleBuyPack(pack, true)}
                      disabled={wallet.contos < 1500}
                      className={`w-full font-arcade text-xs py-2.5 border-2 transition-all ${
                        wallet.contos >= 1500
                          ? "bg-arcade-yellow text-arcade-dark border-arcade-cream shadow-arcade hover:bg-arcade-red hover:text-arcade-cream active:scale-95 cursor-pointer"
                          : "bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed"
                      }`}
                    >
                      🪙 1.500 CONTO
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleBuyPack(pack)}
                    disabled={wallet.contos < pack.priceCoins}
                    className={`w-full font-arcade text-xs py-3 border-2 transition-all ${
                      wallet.contos >= pack.priceCoins
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
      <div className="max-w-5xl w-full mx-auto mt-10 p-4 bg-arcade-dark/70 border-2 border-arcade-yellow/40 text-center">
        <div className="font-arcade text-xs text-arcade-yellow mb-1">
          💡 COMO FUNCIONA A COLEÇÃO E O JORNALEIRO?
        </div>
        <p className="font-body text-xs text-arcade-cream/80 max-w-2xl mx-auto">
          A primeira cópia de qualquer figurinha vai direto e colada no seu <b>Álbum Virtual</b>. As repetidas vão para o seu <b>Montinho</b>, onde você pode reciclá-las por <b>Conto</b> (Comum = 6, Incomum = 20, Rara = 70, Lenda = 250) ou trocá-las com amigos na <b>Pracinha</b>!
        </p>
      </div>
    </div>
  );
}
