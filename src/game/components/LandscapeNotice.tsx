import { useEffect, useState } from "react";

export function LandscapeNotice() {
  const [isPortraitMobile, setIsPortraitMobile] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      if (typeof window === "undefined") return;
      const isMobile = window.innerWidth <= 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
      const isPortrait = window.innerHeight > window.innerWidth;
      setIsPortraitMobile(isMobile && isPortrait);
    };

    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);

    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, []);

  if (!isPortraitMobile || dismissed) return null;

  return (
    <div className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-4 z-50 animate-in slide-in-from-bottom duration-300 pointer-events-auto">
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-2 border-arcade-yellow rounded-xl p-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.85),0_0_12px_rgba(255,214,10,0.35)] flex items-center justify-between gap-3 text-arcade-cream">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-arcade-yellow/20 border border-arcade-yellow/60 flex items-center justify-center shrink-0">
            <span className="text-base animate-bounce">🔄</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-arcade text-[8.5px] text-arcade-yellow font-black uppercase tracking-wider leading-none">
              DICA DO TREINADOR
            </span>
            <span className="font-body text-[11px] text-arcade-cream/90 leading-tight mt-0.5 truncate">
              Vire o celular na horizontal para a melhor experiência! 📱⚽
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="font-arcade text-[8px] bg-arcade-blue/70 hover:bg-arcade-yellow hover:text-arcade-dark text-arcade-cream border border-arcade-yellow/50 rounded px-2 py-1 transition-all cursor-pointer shrink-0 active:scale-95"
          title="Fechar aviso"
        >
          OK
        </button>
      </div>
    </div>
  );
}
