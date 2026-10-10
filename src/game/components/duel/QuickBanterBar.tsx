import { useState, useEffect } from "react";
import {
  QUICK_BANTER_OPTIONS,
  getAIReplyToBanter,
  type QuickBanterOption,
} from "../../aiTacticalEngine";
import { sound } from "../../audio";

type Props = {
  aiSpeech: string | null;
  onSetAiSpeech: (speech: string) => void;
  compact?: boolean;
};

/**
 * 🗣️ RODA DE RESENHA & TRASH TALK DE VÁRZEA
 * Balão da IA + 4 Respostas Rápidas do Jogador com tréplica imediata da IA.
 */
export function QuickBanterBar({ aiSpeech, onSetAiSpeech, compact = false }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [playerSpeech, setPlayerSpeech] = useState<string | null>(null);

  // Limpa a fala do jogador após 4 segundos
  useEffect(() => {
    if (!playerSpeech) return;
    const t = setTimeout(() => setPlayerSpeech(null), 4000);
    return () => clearTimeout(t);
  }, [playerSpeech]);

  const handleSendBanter = (opt: QuickBanterOption) => {
    sound.playCardFlip();
    setPlayerSpeech(opt.text);
    setIsOpen(false);

    // Tréplica da IA após 850ms
    setTimeout(() => {
      const reply = getAIReplyToBanter(opt.id);
      onSetAiSpeech(reply);
      sound.playAttrSelect();
    }, 850);
  };

  return (
    <div className="w-full flex flex-col items-center gap-1.5 animate-in fade-in duration-200">
      {/* 1. LINHA DE BALÕES DE FALA (IA & JOGADOR) */}
      <div className="w-full flex flex-col items-center gap-1 max-w-[360px] sm:max-w-md">
        {/* Balão do Jogador (se tiver falado recentemente) */}
        {playerSpeech && (
          <div className="w-full bg-arcade-yellow/95 border-2 border-arcade-dark text-arcade-dark rounded-xl px-2.5 py-1 shadow-md text-center animate-in zoom-in-95 duration-150">
            <span className="font-arcade text-[8px] sm:text-[9px] font-black uppercase tracking-wider block text-slate-900/80 mb-0.5">
              ⭐ VOCÊ RESPONDEU:
            </span>
            <span className="font-body text-xs sm:text-sm leading-tight font-bold">
              "{playerSpeech}"
            </span>
          </div>
        )}

        {/* Balão da IA Provocadora */}
        {aiSpeech && (
          <div className="w-full bg-slate-950/90 border-2 border-arcade-red/70 text-arcade-cream rounded-xl px-2.5 py-1 sm:py-1.5 shadow-lg text-center backdrop-blur-md relative group">
            <div className="flex items-center justify-between mb-0.5 px-0.5">
              <span className="font-arcade text-[7.5px] sm:text-[8px] text-arcade-red font-bold flex items-center gap-1">
                <span>🤖</span>
                <span>IA PROVOCADORA</span>
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="font-arcade text-[7.5px] sm:text-[8px] text-arcade-yellow hover:text-arcade-cream underline cursor-pointer active:scale-95"
                title="Responder à provocação da IA"
              >
                {isOpen ? "Fechar ✕" : "Responder 💬"}
              </button>
            </div>
            <div className="font-body text-[11px] sm:text-xs leading-tight text-arcade-cream font-medium">
              "{aiSpeech}"
            </div>
          </div>
        )}
      </div>

      {/* 2. GAVETA / RODA DE RESPOSTAS RÁPIDAS */}
      {isOpen ? (
        <div className="w-full max-w-[360px] sm:max-w-md bg-slate-900/95 border-2 border-arcade-yellow rounded-xl p-2 shadow-2xl backdrop-blur-md animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-arcade-yellow/30">
            <span className="font-arcade text-[8px] sm:text-[8.5px] text-arcade-yellow font-bold uppercase tracking-wider flex items-center gap-1">
              <span>🗣️</span>
              <span>RESENHA DE VÁRZEA (RESPOSTA RÁPIDA)</span>
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-arcade-cream/70 hover:text-arcade-cream text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {QUICK_BANTER_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSendBanter(opt)}
                className="flex items-center gap-1.5 bg-black/60 hover:bg-arcade-yellow hover:text-arcade-dark text-arcade-cream border border-arcade-yellow/40 rounded-lg px-2 py-1.5 transition-all text-left cursor-pointer active:scale-95 group shadow-sm"
              >
                <span className="text-sm shrink-0">{opt.emoji}</span>
                <span className="font-arcade text-[8px] sm:text-[8.5px] leading-tight font-bold group-hover:text-arcade-dark">
                  {opt.text}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Gatilho rápido se a gaveta estiver fechada e não houver fala da IA */
        !aiSpeech && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-1 font-arcade text-[7.5px] sm:text-[8px] text-arcade-cream/70 hover:text-arcade-yellow bg-black/40 hover:bg-black/60 border border-arcade-yellow/20 hover:border-arcade-yellow/50 rounded-full px-2.5 py-0.5 transition-all cursor-pointer active:scale-95"
            title="Mandar uma resenha para a IA"
          >
            <span>💬</span>
            <span>PROVOCAR A IA</span>
          </button>
        )
      )}
    </div>
  );
}
