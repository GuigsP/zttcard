import { getPlayerWallet } from "../economy/economyService";
import { sound } from "../audio";

type Props = {
  activeScreen?: "start" | "album" | "shop" | "trades";
  onOpenAlbum: () => void;
  onOpenShop: () => void;
  onOpenTrades: () => void;
  onHome?: () => void;
};

export function EconomyHeader({
  activeScreen,
  onOpenAlbum,
  onOpenShop,
  onOpenTrades,
  onHome,
}: Props) {
  const wallet = getPlayerWallet();

  return (
    <header className="w-full bg-arcade-dark border-b-4 border-arcade-yellow px-3 py-2 flex flex-wrap items-center justify-between gap-2 shadow-arcade z-20">
      <div className="flex items-center gap-2">
        {onHome && activeScreen !== "start" && (
          <button
            onClick={() => {
              sound.playAttrSelect();
              onHome();
            }}
            className="font-arcade text-[10px] px-2.5 py-1.5 bg-arcade-red text-arcade-cream border-2 border-arcade-cream hover:bg-arcade-yellow hover:text-arcade-dark transition-colors"
          >
            ← MENU
          </button>
        )}
        <div className="flex items-center gap-1.5 bg-arcade-blue/60 px-3 py-1 border-2 border-arcade-yellow rounded-sm">
          <span className="text-base animate-bounce">🪙</span>
          <span className="font-arcade text-xs text-arcade-yellow font-bold tracking-wider">
            ZTT$ {wallet.coins.toLocaleString()}
          </span>
        </div>
      </div>

      <nav className="flex items-center gap-2">
        <button
          onClick={() => {
            sound.playAttrSelect();
            onOpenAlbum();
          }}
          className={`font-arcade text-[10px] px-3 py-1.5 border-2 transition-all flex items-center gap-1.5 ${
            activeScreen === "album"
              ? "bg-arcade-yellow text-arcade-dark border-arcade-cream shadow-arcade scale-105"
              : "bg-arcade-blue text-arcade-cream border-arcade-yellow hover:bg-arcade-yellow hover:text-arcade-dark"
          }`}
        >
          <span>📖</span>
          <span>ÁLBUM</span>
        </button>

        <button
          onClick={() => {
            sound.playAttrSelect();
            onOpenShop();
          }}
          className={`font-arcade text-[10px] px-3 py-1.5 border-2 transition-all flex items-center gap-1.5 relative ${
            activeScreen === "shop"
              ? "bg-arcade-green text-arcade-cream border-arcade-yellow shadow-arcade scale-105"
              : "bg-arcade-green/80 text-arcade-cream border-arcade-yellow hover:bg-arcade-green"
          }`}
        >
          <span>📰</span>
          <span>BANCA DE JORNAL</span>
        </button>

        <button
          onClick={() => {
            sound.playAttrSelect();
            onOpenTrades();
          }}
          className={`font-arcade text-[10px] px-3 py-1.5 border-2 transition-all flex items-center gap-1.5 ${
            activeScreen === "trades"
              ? "bg-purple-600 text-arcade-cream border-arcade-yellow shadow-arcade scale-105"
              : "bg-purple-900 text-arcade-cream border-arcade-yellow hover:bg-purple-700"
          }`}
        >
          <span>🌳</span>
          <span>A PRACINHA</span>
        </button>
      </nav>
    </header>
  );
}
