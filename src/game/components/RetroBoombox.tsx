import { useEffect, useState } from "react";
import { sound } from "../audio";

interface RetroBoomboxProps {
  floating?: boolean;
  defaultExpanded?: boolean;
  currentScreen?: string;
  isInMatch?: boolean;
}

export function RetroBoombox({
  floating = false,
  defaultExpanded = false,
  currentScreen,
  isInMatch = false,
}: RetroBoomboxProps = {}) {
  const inMatch = isInMatch || currentScreen === "playing";
  const [isPlaying, setIsPlaying] = useState(sound.isRadioPlaying());
  const [station, setStation] = useState(sound.getRadioStation());
  const [isMuted, setIsMuted] = useState(sound.isMuted());
  const [volume, setVolume] = useState(sound.getVolume());
  const [isTapeMode, setIsTapeMode] = useState(sound.getIsPirateMode());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [playbackTime, setPlaybackTime] = useState(sound.getCurrentPlaybackTime());
  const [trackNumber, setTrackNumber] = useState(sound.getCurrentTrackNumber());
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ztt.walkman.expanded");
      if (saved !== null) return saved === "true";
    }
    return defaultExpanded;
  });

  const toggleExpanded = (val: boolean) => {
    setIsExpanded(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("ztt.walkman.expanded", String(val));
    }
  };

  useEffect(() => {
    const unsubscribe = sound.subscribeRadio(() => {
      setIsPlaying(sound.isRadioPlaying());
      setStation(sound.getRadioStation());
      setIsMuted(sound.isMuted());
      setVolume(sound.getVolume());
      setIsTapeMode(sound.getIsPirateMode());
      setPlaybackTime(sound.getCurrentPlaybackTime());
      setTrackNumber(sound.getCurrentTrackNumber());
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setPlaybackTime(sound.getCurrentPlaybackTime());
      setTrackNumber(sound.getCurrentTrackNumber());
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  function formatSeconds(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2400);
  };

  const handleTogglePlay = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const nextState = sound.toggleRadio();
    setIsPlaying(nextState);
  };

  const handleNextStation = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    sound.nextRadioStation();
    setStation(sound.getRadioStation());
    setTrackNumber(sound.getCurrentTrackNumber());
    setPlaybackTime(sound.getCurrentPlaybackTime());
  };

  const handleToggleMute = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const muted = sound.toggleMute();
    setIsMuted(muted);
    setIsPlaying(sound.isRadioPlaying());
    setVolume(sound.getVolume());
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    sound.setVolume(val);
  };

  const handleVolumeDown = () => {
    sound.playCardFlip();
    const newVol = Math.max(0, Math.round((volume - 0.1) * 10) / 10);
    setVolume(newVol);
    sound.setVolume(newVol);
  };

  const handleVolumeUp = () => {
    sound.playCardFlip();
    const newVol = Math.min(1, Math.round((volume + 0.1) * 10) / 10);
    setVolume(newVol);
    sound.setVolume(newVol);
  };

  // Inserir Fita K7 com efeito sonoro mecânico
  const handleInsertTape = () => {
    sound.playTapeMode();
    showToast("📼 FITA K7 INSERIDA - TOCANDO MIXTAPE!");
  };

  // Alternar para o sintonizador FM oficial
  const handleSwitchToFm = () => {
    sound.playFmRadioMode();
    showToast("📻 SINTONIZADOR FM ATIVADO!");
  };

  // 0. Versão Miniatura Flutuante (Gadget Retrô Recolhido)
  if (floating && !isExpanded) {
    const positionClass = inMatch
      ? "fixed top-[46px] right-2 sm:top-auto sm:bottom-4 sm:right-4 md:bottom-6 md:right-6 z-40"
      : "fixed bottom-[68px] sm:bottom-20 md:bottom-6 right-3 sm:right-6 z-40";

    return (
      <div className={`${positionClass} flex items-center select-none animate-in fade-in duration-200`}>
        {/* Mobile (< sm): Barra retrô compacta com Play/Pause, Próxima Estação e Expandir */}
        <div className="flex sm:hidden items-center gap-1 bg-gradient-to-r from-[#ffcc00] to-[#e6b800] border-2 border-zinc-950 rounded-full py-1 px-1.5 shadow-[0_4px_0_#18181b,0_8px_16px_rgba(0,0,0,0.6)]">
          <button
            type="button"
            onClick={handleTogglePlay}
            className="w-7 h-7 rounded-full bg-zinc-950 hover:bg-zinc-800 text-arcade-yellow flex items-center justify-center text-[10px] font-bold active:scale-90 transition-transform shadow cursor-pointer shrink-0"
            title={isPlaying ? "Pausar rádio" : "Tocar rádio"}
            aria-label={isPlaying ? "Pausar rádio" : "Tocar rádio"}
          >
            {isPlaying ? "⏸" : "▶"}
          </button>

          <button
            type="button"
            onClick={handleNextStation}
            className="w-6 h-6 rounded-full bg-zinc-900/20 hover:bg-zinc-900/40 text-zinc-950 flex items-center justify-center text-[9px] font-bold active:scale-90 transition-transform cursor-pointer shrink-0"
            title="Próxima estação de rádio"
            aria-label="Próxima estação de rádio"
          >
            ⏭
          </button>

          <button
            type="button"
            onClick={() => toggleExpanded(true)}
            className="flex items-center gap-1 pr-1 pl-0.5 text-zinc-950 cursor-pointer active:scale-95"
            title={`Estação: ${station.title}. Toque para abrir o Walkman`}
            aria-label="Abrir Walkman"
          >
            <span className="font-arcade text-[7.5px] font-black text-[#172554] max-w-[70px] truncate leading-none">
              {station.freq}
            </span>
            <span className="font-arcade text-[8px] font-black leading-none">📻</span>
            {isPlaying && (
              <span className="flex h-1.5 w-1.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-600 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-600"></span>
              </span>
            )}
          </button>
        </div>

        {/* Tablet & Desktop (>= sm): Pílula completa estilizada anos 90 */}
        <div className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-[#ffcc00] to-[#e6b800] border-2 border-zinc-950 rounded-full px-3 py-1.5 shadow-[0_4px_0_#18181b,0_10px_25px_rgba(0,0,0,0.6)] text-zinc-950">
          <button
            type="button"
            onClick={handleTogglePlay}
            className="w-7 h-7 rounded-full bg-zinc-950 hover:bg-zinc-800 text-arcade-yellow flex items-center justify-center text-xs font-bold active:scale-90 transition-transform shadow cursor-pointer"
            title={isPlaying ? "Pausar som" : "Tocar som"}
          >
            {isPlaying ? "⏸" : "▶"}
          </button>

          <button
            type="button"
            onClick={() => toggleExpanded(true)}
            className="flex items-center gap-2 pl-0.5 pr-1 text-left cursor-pointer group"
            title="Clique para abrir o Walkman Esportivo Completo"
          >
            <div className="flex flex-col">
              <span className="font-arcade text-[6.5px] font-black tracking-wider text-zinc-900 leading-none">
                SPORTS 90
              </span>
              <span className="font-arcade text-[8.5px] font-bold text-[#172554] leading-tight truncate max-w-[115px]">
                {isTapeMode ? station.title : `${station.freq} ${station.title}`}
              </span>
            </div>

            {isPlaying && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-600 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              </span>
            )}

            <div className="w-5 h-5 rounded-full bg-zinc-900/15 group-hover:bg-zinc-900/30 flex items-center justify-center text-[9px] text-zinc-900 font-bold transition-colors">
              ▲
            </div>
          </button>
        </div>
      </div>
    );
  }

  const walkmanContent = (
    <div className={`w-full rounded-2xl border-3 border-zinc-900 bg-gradient-to-b from-[#ffcc00] to-[#e6b800] p-3 shadow-[0_5px_0_#18181b,0_10px_20px_rgba(0,0,0,0.5)] text-zinc-900 select-none relative overflow-hidden transition-all duration-300 ${floating ? "shadow-[0_15px_40px_rgba(0,0,0,0.85),0_5px_0_#18181b]" : ""}`}>
      {/* Detalhe de textura esportiva: Friso lateral azul escuro */}
      <div className="absolute top-0 right-0 bottom-0 w-2.5 bg-[#172554] border-l-2 border-zinc-900 pointer-events-none" />

      {/* 1. TOPO: Plug P2 + Logo ALL WEATHER SPORTS + Chave Seletora FM/K7 + Botão Minimizar */}
      <div className="flex items-center justify-between mb-2 pr-2">
        {/* Plug P2 de Fone com fio retrô */}
        <div className="flex items-center gap-1.5" title="Conector de fone 3.5mm">
          <div className="w-3.5 h-3.5 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center shadow-inner">
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
          </div>
          <div className="h-0.5 w-4 bg-zinc-900 rounded-full" />
        </div>

        {/* Logo Estilo Esportivo Anos 90 */}
        <div className="text-center">
          <div className="text-[7px] font-sans font-black tracking-widest text-zinc-800 uppercase leading-none">
            ALL WEATHER
          </div>
          <div className="font-display text-sm tracking-wider text-[#172554] font-black -rotate-1 drop-shadow-[0_1px_0_rgba(255,255,255,0.7)] leading-none mt-0.5">
            SPORTS 90
          </div>
        </div>

        {/* Chave Seletora Mecânica: FM ↔ K7 + Botão Minimizar */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={isTapeMode ? handleSwitchToFm : handleInsertTape}
            className="flex items-center gap-1 bg-zinc-900 hover:bg-zinc-800 text-arcade-yellow text-[8px] font-arcade px-2 py-1 rounded-md border border-zinc-700 shadow active:scale-95 transition-all cursor-pointer"
            title={isTapeMode ? "Alternar para Rádio FM" : "Alternar para Mixtape Fita K7"}
          >
            <span>{isTapeMode ? "📼" : "📻"}</span>
            <span className="font-bold">{isTapeMode ? "K7" : "FM"}</span>
          </button>

          {floating && (
            <button
              type="button"
              onClick={() => toggleExpanded(false)}
              className="flex items-center gap-1 bg-zinc-950 hover:bg-zinc-800 text-arcade-yellow border border-zinc-700 font-arcade text-[8px] font-bold px-2 py-1 rounded-md shadow active:scale-95 transition-all cursor-pointer"
              title="Recolher rádio para pílula compacta"
            >
              <span>▾</span>
              <span>RECOLHER</span>
            </button>
          )}
        </div>
      </div>

      {/* Feedback Toast flutuante rápido */}
      {toastMessage && (
        <div className="mb-2 text-center bg-[#172554] text-arcade-yellow font-arcade text-[8px] py-1 px-2 rounded font-bold shadow animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* 2. CENTRO: GRELHA CIRCULAR AZUL DO ALTO-FALANTE + ARO PRATEADO (ICÔNICO) */}
      <div className="flex items-center justify-center my-2 relative">
        {/* Aro Cromado Prateado com Parafusos Rebitados */}
        <div className="w-24 h-24 rounded-full bg-gradient-to-b from-zinc-200 via-zinc-400 to-zinc-500 p-1.5 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),0_4px_8px_rgba(0,0,0,0.4)] border-2 border-zinc-800 relative flex items-center justify-center">
          {/* 4 Parafusos / Rebites nos cantos do aro */}
          <div className="absolute top-1 left-3 w-1 h-1 rounded-full bg-zinc-700 border border-zinc-400" />
          <div className="absolute top-1 right-3 w-1 h-1 rounded-full bg-zinc-700 border border-zinc-400" />
          <div className="absolute bottom-1 left-3 w-1 h-1 rounded-full bg-zinc-700 border border-zinc-400" />
          <div className="absolute bottom-1 right-3 w-1 h-1 rounded-full bg-zinc-700 border border-zinc-400" />

          {/* Grelha Azul Esportiva com Fendas Inclinadas */}
          <div
            className={`w-full h-full rounded-full bg-[#1e40af] border-2 border-zinc-900 flex flex-col items-center justify-center gap-1 overflow-hidden shadow-inner transition-transform duration-300 ${
              isPlaying ? "scale-[1.02]" : "scale-100"
            }`}
          >
            {/* Ranhuras da Grelha que pulsam suavemente quando a música toca */}
            <div className={`w-8 h-1 bg-zinc-950/60 rounded-full transition-all duration-300 ${isPlaying ? "opacity-100 scale-x-110" : "opacity-70"}`} />
            <div className={`w-12 h-1 bg-zinc-950/60 rounded-full transition-all duration-300 ${isPlaying ? "opacity-100 scale-x-105" : "opacity-70"}`} />
            <div className={`w-14 h-1 bg-zinc-950/70 rounded-full transition-all duration-300 ${isPlaying ? "opacity-100 scale-x-110" : "opacity-70"}`} />
            <div className={`w-12 h-1 bg-zinc-950/60 rounded-full transition-all duration-300 ${isPlaying ? "opacity-100 scale-x-105" : "opacity-70"}`} />
            <div className={`w-8 h-1 bg-zinc-950/60 rounded-full transition-all duration-300 ${isPlaying ? "opacity-100 scale-x-110" : "opacity-70"}`} />
          </div>

          {/* LED de Energia (Verde aceso se ligado, apagado se parado) */}
          <div
            className={`absolute -top-1 right-0 w-3 h-3 rounded-full border border-zinc-900 transition-all ${
              isPlaying
                ? "bg-arcade-green shadow-[0_0_8px_#22c55e]"
                : "bg-zinc-600"
            }`}
            title={isPlaying ? "Aparelho em reprodução" : "Em pausa"}
          />
        </div>
      </div>

      {/* 3. VISOR LCD COMPACTO: Mostra Faixa + Estação + Gênero + Tempo */}
      <div className="bg-[#0f172a] border-2 border-zinc-900 rounded-lg p-1.5 mb-2 shadow-inner text-arcade-cream">
        <div className="flex items-center justify-between font-arcade text-[8px]">
          <div className="flex items-center gap-1.5 truncate max-w-[155px]">
            <span className="w-1.5 h-1.5 rounded-full bg-arcade-green animate-pulse shrink-0" />
            <span className="font-bold text-arcade-yellow truncate">
              {isTapeMode ? `📼 ${station.title}` : `📻 ${station.freq} ${station.title}`}
            </span>
          </div>
          <span className="text-arcade-green font-bold tabular-nums text-[9px]">
            {formatSeconds(playbackTime.current)}
          </span>
        </div>
        <div className="flex items-center justify-between text-[7px] text-zinc-400 font-sans mt-0.5 px-0.5">
          <span className="truncate text-zinc-300 font-medium">{station.genre}</span>
          <span className="font-mono text-zinc-400 shrink-0 ml-1">FAIXA {trackNumber}</span>
        </div>
      </div>

      {/* 4. CONTROLE DE VOLUME DISCRETO */}
      <div className="flex items-center justify-between bg-zinc-900/15 rounded-md px-2 py-1 mb-2.5 border border-zinc-900/30">
        <span className="text-[7.5px] font-arcade font-bold text-zinc-800 flex items-center gap-1">
          <span>VOL</span>
          <span>{isMuted ? "0%" : `${Math.round(volume * 100)}%`}</span>
        </span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          className="w-24 h-1.5 rounded-lg appearance-none cursor-pointer bg-zinc-900 accent-[#1e40af]"
          title={`Volume: ${isMuted ? 0 : Math.round(volume * 100)}%`}
        />
      </div>

      {/* 5. OS 3 BOTÕES ESSENCIAIS ESTILO WALKMAN */}
      <div className="grid grid-cols-3 gap-1.5">
        {/* Botão 1: PLAY / PAUSA */}
        <button
          type="button"
          onClick={handleTogglePlay}
          className={`py-2 px-1 rounded-lg border-2 border-zinc-950 font-arcade text-[8px] font-bold flex items-center justify-center gap-1 transition-all active:translate-y-0.5 cursor-pointer shadow-[0_2px_0_#18181b] ${
            isPlaying
              ? "bg-[#1e40af] text-white shadow-inner"
              : "bg-zinc-900 text-arcade-yellow hover:bg-zinc-800"
          }`}
          title={isPlaying ? "Pausar som" : "Tocar som"}
        >
          <span>{isPlaying ? "⏸" : "▶"}</span>
          <span>{isPlaying ? "PAUSA" : "PLAY"}</span>
        </button>

        {/* Botão 2: TROCAR FAIXA / ESTAÇÃO */}
        <button
          type="button"
          onClick={handleNextStation}
          className="py-2 px-1 rounded-lg border-2 border-zinc-950 bg-zinc-900 hover:bg-zinc-800 text-arcade-cream font-arcade text-[8px] font-bold flex items-center justify-center gap-1 transition-all active:translate-y-0.5 cursor-pointer shadow-[0_2px_0_#18181b]"
          title="Próxima faixa ou estação de rádio"
        >
          <span>⏭</span>
          <span>TROCAR</span>
        </button>

        {/* Botão 3: SOM / MUDO */}
        <button
          type="button"
          onClick={handleToggleMute}
          className={`py-2 px-1 rounded-lg border-2 border-zinc-950 font-arcade text-[8px] font-bold flex items-center justify-center gap-1 transition-all active:translate-y-0.5 cursor-pointer shadow-[0_2px_0_#18181b] ${
            isMuted
              ? "bg-rose-900 text-rose-200"
              : "bg-zinc-900 text-arcade-cream hover:text-arcade-yellow hover:bg-zinc-800"
          }`}
          title={isMuted ? "Desmutar som" : "Silenciar som"}
        >
          <span>{isMuted ? "🔇" : "🔊"}</span>
          <span>{isMuted ? "MUDO" : "SOM"}</span>
        </button>
      </div>

      {/* Botão Inferior de Ação Rápida: Recolher para Pílula */}
      {floating && (
        <button
          type="button"
          onClick={() => toggleExpanded(false)}
          className="w-full mt-2.5 py-1.5 bg-zinc-950/20 hover:bg-zinc-950/35 rounded-lg text-zinc-950 font-arcade text-[7.5px] font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-zinc-950/30"
          title="Minimizar rádio para o modo pílula"
        >
          <span>▾</span>
          <span>RECOLHER PARA PÍLULA FLUTUANTE</span>
        </button>
      )}
    </div>
  );

  if (floating) {
    return (
      <div
        className="fixed inset-0 z-40 md:inset-auto md:bottom-6 md:right-6 flex items-end sm:items-center md:items-start justify-center md:justify-end p-3 md:p-0 bg-black/65 md:bg-transparent backdrop-blur-xs md:backdrop-blur-none animate-in fade-in duration-200"
        onClick={(e) => {
          if (e.target === e.currentTarget) toggleExpanded(false);
        }}
      >
        <div className="w-full max-w-sm md:w-80 shadow-[0_15px_40px_rgba(0,0,0,0.85),0_5px_0_#18181b] rounded-2xl animate-in zoom-in-95 slide-in-from-bottom-4 md:slide-in-from-bottom-0 duration-200">
          {walkmanContent}
        </div>
      </div>
    );
  }

  return walkmanContent;
}
