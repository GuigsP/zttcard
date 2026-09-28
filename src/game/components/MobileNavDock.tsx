import { useEffect, useState } from "react";
import { sound } from "../audio";
import { canClaimDailyFree, getDuplicatesList, getPlayerInventory } from "../economy/economyService";
import { getMasterCatalog } from "../economy/cardCatalog";

export type LobbyScreen = "start" | "shop" | "album" | "trades" | "carteira";

type Props = {
  activeScreen: LobbyScreen | string;
  onChangeScreen: (screen: LobbyScreen) => void;
};

export function MobileNavDock({ activeScreen, onChangeScreen }: Props) {
  const [dailyStatus, setDailyStatus] = useState(canClaimDailyFree());
  const [duplicatesCount, setDuplicatesCount] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);

  useEffect(() => {
    // Atualiza contadores
    const updateStats = () => {
      setDailyStatus(canClaimDailyFree());
      const dups = getDuplicatesList() || [];
      setDuplicatesCount(dups.length);

      const catalog = getMasterCatalog() || [];
      const inventory = getPlayerInventory() || {};
      const totalCards = catalog.length || 1;
      const collected = catalog.filter((c) => c && (inventory[c.id] ?? 0) >= 1).length;
      setProgressPercent(Math.min(100, Math.max(0, Math.round((collected / totalCards) * 100))));
    };

    updateStats();
    const interval = setInterval(updateStats, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSelect = (screen: LobbyScreen) => {
    sound.playAttrSelect();
    onChangeScreen(screen);
  };

  const isCurrent = (screen: LobbyScreen) => {
    if (screen === "start" && (activeScreen === "start" || activeScreen === "jogar")) return true;
    return activeScreen === screen;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none md:hidden">
      <nav
        aria-label="Navegação Principal"
        className="pointer-events-auto w-full bg-arcade-dark/95 backdrop-blur-md border-t-3 border-arcade-yellow px-2 sm:px-4 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-end justify-between shadow-[0_-4px_25px_rgba(0,0,0,0.8)]"
      >
        {/* 1. BANCA (Loja) */}
        <DockTabButton
          active={isCurrent("shop")}
          icon="📰"
          label="BANCA"
          badge={dailyStatus.canClaim ? "GRÁTIS!" : undefined}
          badgeColor="bg-emerald-500 text-white animate-pulse"
          onClick={() => handleSelect("shop")}
        />

        {/* 2. ÁLBUM (Coleção) */}
        <DockTabButton
          active={isCurrent("album")}
          icon="📖"
          label="ÁLBUM"
          badge={`${progressPercent}%`}
          badgeColor="bg-arcade-blue text-arcade-yellow border border-arcade-yellow/40"
          onClick={() => handleSelect("album")}
        />

        {/* 3. JOGAR (HERO BUTTON CENTRAL - Estilo Clash Royale) */}
        <button
          type="button"
          onClick={() => handleSelect("start")}
          className={`flex flex-col items-center justify-center -mt-6 relative transition-all duration-200 active:scale-95 group cursor-pointer focus:outline-none shrink-0 px-2 ${
            isCurrent("start") ? "scale-105" : "hover:scale-105"
          }`}
          title="Jogar Duelo"
        >
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border-3 shadow-2xl transition-all duration-200 relative ${
              isCurrent("start")
                ? "bg-gradient-to-b from-arcade-yellow via-amber-400 to-amber-500 border-arcade-cream text-arcade-dark shadow-[0_0_24px_rgba(255,204,0,0.85)] ring-2 ring-arcade-yellow/60"
                : "bg-gradient-to-b from-arcade-blue via-slate-900 to-slate-950 border-arcade-yellow text-arcade-yellow hover:border-arcade-cream shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
            }`}
          >
            <span className="transform group-hover:rotate-12 group-active:rotate-45 transition-transform duration-200 select-none">
              ⚽
            </span>
            {/* Brilho pulsante no botão principal */}
            {isCurrent("start") && (
              <span className="absolute inset-0 rounded-2xl bg-white/20 animate-pulse pointer-events-none" />
            )}
          </div>
          <span
            className={`font-arcade text-[9px] mt-1 tracking-wider uppercase ${
              isCurrent("start")
                ? "text-arcade-yellow font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
                : "text-arcade-cream/70"
            }`}
          >
            BATALHA
          </span>
        </button>

        {/* 4. PRACINHA (Mercado & Trocas) */}
        <DockTabButton
          active={isCurrent("trades")}
          icon="🌳"
          label="PRACINHA"
          badge={duplicatesCount > 0 ? `${duplicatesCount}x` : undefined}
          badgeColor="bg-amber-500 text-arcade-dark font-bold"
          onClick={() => handleSelect("trades")}
        />

        {/* 5. CARTEIRA (Economia & Perfil) */}
        <DockTabButton
          active={isCurrent("carteira")}
          icon="🪙"
          label="CARTEIRA"
          onClick={() => handleSelect("carteira")}
        />
      </nav>
    </div>
  );
}

function DockTabButton({
  active,
  icon,
  label,
  badge,
  badgeColor = "bg-arcade-yellow text-arcade-dark",
  onClick,
}: {
  active: boolean;
  icon: string;
  label: string;
  badge?: string;
  badgeColor?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex flex-col items-center justify-center py-1 px-1 relative transition-all duration-150 active:scale-90 cursor-pointer focus:outline-none ${
        active ? "text-arcade-yellow" : "text-arcade-cream/60 hover:text-arcade-cream"
      }`}
    >
      <div className="relative flex items-center justify-center">
        <span
          className={`text-xl transition-all duration-200 select-none ${
            active
              ? "scale-115 drop-shadow-[0_2px_6px_rgba(255,204,0,0.5)]"
              : "opacity-75 hover:opacity-100"
          }`}
        >
          {icon}
        </span>
        {badge && (
          <span
            className={`absolute -top-1.5 -right-3 font-arcade text-[7px] leading-tight px-1 py-0.5 rounded-full font-bold shadow ${badgeColor}`}
          >
            {badge}
          </span>
        )}
      </div>

      <span
        className={`font-arcade text-[8px] mt-0.5 tracking-wider truncate max-w-full ${
          active ? "font-bold text-arcade-yellow" : "text-arcade-cream/70"
        }`}
      >
        {label}
      </span>

      {/* Ponto indicador de aba ativa estilo Clash Royale */}
      {active && (
        <span className="w-1.5 h-1.5 rounded-full bg-arcade-yellow mt-0.5 shadow-[0_0_8px_rgba(255,204,0,0.9)] animate-in fade-in zoom-in duration-150" />
      )}
    </button>
  );
}
