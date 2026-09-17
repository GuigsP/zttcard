import { useEffect, useState } from "react";
import { sound } from "../audio";

export function RetroBoombox() {
  const [isPlaying, setIsPlaying] = useState(sound.isRadioPlaying());
  const [station, setStation] = useState(sound.getRadioStation());
  const [isMuted, setIsMuted] = useState(sound.isMuted());
  const [volume, setVolume] = useState(sound.getVolume());
  const [isPirate, setIsPirate] = useState(sound.getIsPirateMode());
  const [showEasterEggToast, setShowEasterEggToast] = useState(false);

  useEffect(() => {
    const unsubscribe = sound.subscribeRadio(() => {
      setIsPlaying(sound.isRadioPlaying());
      setStation(sound.getRadioStation());
      setIsMuted(sound.isMuted());
      setVolume(sound.getVolume());
      setIsPirate(sound.getIsPirateMode());
    });
    return unsubscribe;
  }, []);

  const handleTogglePlay = () => {
    sound.toggleRadio();
  };

  const handleNextStation = () => {
    sound.nextRadioStation();
  };

  const handleToggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
    setIsPlaying(sound.isRadioPlaying());
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    sound.setVolume(val);
  };

  const handleTriggerEasterEgg = () => {
    const active = sound.togglePirateMode();
    setShowEasterEggToast(true);
    setTimeout(() => setShowEasterEggToast(false), 2200);
  };

  return (
    <div
      className={`w-full rounded-md border-2 p-2.5 shadow-arcade text-arcade-cream select-none transition-all duration-300 ${
        isPirate
          ? "bg-[#181124] border-fuchsia-400/90 shadow-[0_0_12px_rgba(217,70,239,0.3)]"
          : "bg-[#12151e] border-arcade-yellow/80"
      }`}
    >
      {/* 1. TOPO: Antena + Alça / Easter Egg Trigger */}
      <div className="flex items-center justify-between mb-2">
        {/* Antena telescópica retrô */}
        <div className="flex items-center gap-1">
          <div className="w-2 h-1 bg-zinc-500 rounded-xs" />
          <div
            className={`h-0.5 transition-all duration-300 ${
              isPirate
                ? "bg-fuchsia-400"
                : "bg-gradient-to-r from-arcade-yellow to-arcade-cream"
            } ${isPlaying ? "w-10 -rotate-12 origin-left" : "w-5"}`}
          />
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              isPlaying
                ? isPirate
                  ? "bg-fuchsia-400 animate-ping"
                  : "bg-arcade-green animate-pulse"
                : "bg-zinc-600"
            }`}
          />
        </div>

        {/* Badge do Rádio / Botão Secreto de Easter Egg */}
        <button
          type="button"
          onClick={handleTriggerEasterEgg}
          className={`font-arcade text-[8px] px-2 py-0.5 rounded border transition-all flex items-center gap-1 cursor-pointer active:scale-95 ${
            isPirate
              ? "bg-fuchsia-950/80 text-fuchsia-300 border-fuchsia-400 shadow-[0_0_8px_rgba(217,70,239,0.5)]"
              : "bg-black/60 text-arcade-yellow border-arcade-yellow/40 hover:border-arcade-yellow"
          }`}
          title="Clique para alternar para a Rádio Pirata Secreta!"
        >
          <span>{isPirate ? "🏴‍☠️" : "📻"}</span>
          <span>{isPirate ? "RÁDIO PIRATA 90s" : "RÁDIO ZTT-90"}</span>
        </button>
      </div>

      {/* Toast flutuante de ativação do Easter Egg */}
      {showEasterEggToast && (
        <div className="mb-2 text-center bg-fuchsia-600 text-white font-arcade text-[8px] py-1 px-1.5 rounded shadow animate-bounce">
          {isPirate
            ? "🏴‍☠️ FREQUÊNCIA CLANDESTINA SINTONIZADA!"
            : "📻 VOLTANDO À PROGRAMAÇÃO OFICIAL!"}
        </div>
      )}

      {/* 2. RÉGUA DE SINTONIA ANALÓGICA (FM DIAL) - Limpa e sem quebra */}
      <div
        className={`rounded p-1.5 mb-2 border ${
          isPirate
            ? "bg-[#0b0713] border-fuchsia-500/40"
            : "bg-[#0a0c12] border-arcade-yellow/40"
        }`}
      >
        {/* Escala de Frequências em Linha Única */}
        <div className="flex justify-between text-[7px] font-arcade text-zinc-400 px-1 mb-1">
          <span>88</span>
          <span>94</span>
          <span>98</span>
          <span>104</span>
          <span>108</span>
        </div>

        {/* Trilha do Cursor com Agulha Deslizante */}
        <div className="relative h-2 w-full bg-black/80 rounded flex items-center overflow-hidden">
          <div
            className={`absolute top-0 bottom-0 w-1 transition-all duration-500 z-10 ${
              isPirate
                ? "bg-fuchsia-400 shadow-[0_0_8px_#e879f9]"
                : "bg-arcade-red shadow-[0_0_8px_#ff0055]"
            }`}
            style={{ left: `${station.freqPercent}%` }}
          />
          <div className="w-full flex justify-between px-2 text-[5px] text-zinc-700">
            <span>|</span>
            <span>|</span>
            <span>|</span>
            <span>|</span>
            <span>|</span>
            <span>|</span>
            <span>|</span>
          </div>
        </div>

        {/* Visor LCD da Estação Atual */}
        <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-zinc-800 text-[8px] font-arcade">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isPlaying
                  ? isPirate
                    ? "bg-fuchsia-400 shadow-[0_0_6px_#e879f9]"
                    : "bg-arcade-green shadow-[0_0_6px_#00ff66]"
                  : "bg-zinc-600"
              }`}
            />
            <span
              className={`font-bold ${
                isPirate ? "text-fuchsia-300" : "text-arcade-yellow"
              }`}
            >
              {station.freq} MHz
            </span>
          </div>
          <span className="text-zinc-300 font-bold truncate max-w-[125px]">
            {station.title}
          </span>
        </div>
      </div>

      {/* 3. CORPO CENTRAL: FITA K7 INTERATIVA + ALTO-FALANTE EQUALIZADOR */}
      <div className="grid grid-cols-[1.1fr_0.9fr] gap-2 mb-2">
        {/* Porta Fita K7 Clicável (Também ativa o Easter Egg!) */}
        <button
          type="button"
          onClick={handleTriggerEasterEgg}
          className={`rounded p-1.5 flex flex-col justify-between h-[60px] border transition-colors cursor-pointer group text-left ${
            isPirate
              ? "bg-[#140b20] border-fuchsia-400/40 hover:border-fuchsia-400"
              : "bg-[#0b0e16] border-zinc-700 hover:border-arcade-yellow/60"
          }`}
          title="Clique na fita K7 para sintonizar a Fita Pirata!"
        >
          {/* Janela dos Carretéis da Fita */}
          <div className="bg-black/90 rounded p-1 flex items-center justify-around h-7 border border-zinc-800 relative">
            {/* Rolo esquerdo */}
            <div
              className={`w-3.5 h-3.5 rounded-full border border-zinc-500 bg-zinc-800 flex items-center justify-center ${
                isPlaying ? "animate-spin" : ""
              }`}
              style={{ animationDuration: "2s" }}
            >
              <div
                className={`w-1 h-1 rounded-full ${
                  isPirate ? "bg-fuchsia-400" : "bg-arcade-yellow"
                }`}
              />
            </div>

            {/* Fita Central */}
            <div
              className={`h-2 px-1 text-[6px] font-arcade rounded-xs flex items-center justify-center ${
                isPirate
                  ? "bg-fuchsia-950 text-fuchsia-300 border border-fuchsia-500/40"
                  : "bg-amber-950/80 text-arcade-yellow/90 border border-amber-800/40"
              }`}
            >
              {isPirate ? "VIP-80s" : "K7-90"}
            </div>

            {/* Rolo direito */}
            <div
              className={`w-3.5 h-3.5 rounded-full border border-zinc-500 bg-zinc-800 flex items-center justify-center ${
                isPlaying ? "animate-spin" : ""
              }`}
              style={{ animationDuration: "2s" }}
            >
              <div
                className={`w-1 h-1 rounded-full ${
                  isPirate ? "bg-fuchsia-400" : "bg-arcade-yellow"
                }`}
              />
            </div>
          </div>

          {/* Gênero da Faixa */}
          <div className="flex justify-between items-center text-[7px] font-arcade text-zinc-400 pt-0.5">
            <span className="truncate">{station.genre}</span>
            <span className="text-[6px] opacity-60 group-hover:opacity-100 transition-opacity">
              {isPirate ? "★ PIRATA" : "★ 90s"}
            </span>
          </div>
        </button>

        {/* Alto-Falante com Equalizador */}
        <div
          className={`rounded p-1.5 flex flex-col items-center justify-center h-[60px] border ${
            isPirate
              ? "bg-[#140b20] border-fuchsia-400/40"
              : "bg-[#0b0e16] border-zinc-700"
          }`}
        >
          <div className="w-10 h-10 rounded-full border border-zinc-600 bg-black/80 flex items-center justify-center relative overflow-hidden">
            {/* Equalizador animado no centro */}
            {isPlaying ? (
              <div className="flex items-end gap-0.5 h-5 z-10">
                <div
                  className={`w-1 rounded-xs h-2.5 animate-bounce ${
                    isPirate ? "bg-fuchsia-400" : "bg-arcade-green"
                  }`}
                  style={{ animationDelay: "0.1s" }}
                />
                <div
                  className={`w-1 rounded-xs h-4.5 animate-bounce ${
                    isPirate ? "bg-purple-300" : "bg-arcade-yellow"
                  }`}
                  style={{ animationDelay: "0.3s" }}
                />
                <div
                  className={`w-1 rounded-xs h-3.5 animate-bounce ${
                    isPirate ? "bg-pink-500" : "bg-arcade-red"
                  }`}
                  style={{ animationDelay: "0.2s" }}
                />
              </div>
            ) : (
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-700 border border-zinc-500" />
            )}
          </div>
          <span className="font-arcade text-[6px] text-zinc-500 mt-0.5">
            STEREO
          </span>
        </div>
      </div>

      {/* 4. CONTROLE DE VOLUME ANALÓGICO */}
      <div className="flex items-center gap-1.5 px-2 py-1 mb-2 bg-black/60 rounded border border-zinc-800">
        <button
          type="button"
          onClick={() => sound.setVolume(Math.max(0, volume - 0.1))}
          className="text-[9px] hover:scale-110 transition-transform cursor-pointer select-none"
          title="Diminuir volume"
        >
          🔈
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-zinc-800 ${
            isPirate ? "accent-fuchsia-400" : "accent-arcade-yellow"
          }`}
          title={`Volume: ${isMuted ? 0 : Math.round(volume * 100)}%`}
        />
        <button
          type="button"
          onClick={() => sound.setVolume(Math.min(1, volume + 0.1))}
          className="text-[9px] hover:scale-110 transition-transform cursor-pointer select-none"
          title="Aumentar volume"
        >
          🔊
        </button>
        <span
          className={`font-arcade text-[7px] w-6 text-right font-bold tabular-nums ${
            isPirate ? "text-fuchsia-400" : "text-arcade-yellow"
          }`}
        >
          {isMuted ? "0%" : `${Math.round(volume * 100)}%`}
        </span>
      </div>

      {/* 5. BOTÕES ARCADE LIMPOS (CONTROLES) */}
      <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-zinc-800">
        {/* Play / Pausa */}
        <button
          type="button"
          onClick={handleTogglePlay}
          className={`font-arcade text-[8px] py-1.5 px-1 rounded border transition-all flex items-center justify-center gap-1 active:translate-y-0.5 cursor-pointer ${
            isPlaying
              ? isPirate
                ? "bg-fuchsia-500 text-white border-fuchsia-300 font-bold"
                : "bg-arcade-yellow text-arcade-dark border-arcade-yellow font-bold"
              : "bg-black/60 text-arcade-cream border-zinc-700 hover:border-zinc-500"
          }`}
          title={isPlaying ? "Pausar" : "Tocar Rádio"}
        >
          <span>{isPlaying ? "⏸" : "▶"}</span>
          <span>{isPlaying ? "PAUSA" : "TOCAR"}</span>
        </button>

        {/* Próxima Estação (Sintonia) */}
        <button
          type="button"
          onClick={handleNextStation}
          className="font-arcade text-[8px] py-1.5 px-1 rounded border border-zinc-700 bg-black/60 text-arcade-cream hover:border-arcade-yellow/80 hover:text-arcade-yellow transition-all flex items-center justify-center gap-1 active:translate-y-0.5 cursor-pointer"
          title="Sintonizar próxima estação"
        >
          <span>⏭</span>
          <span>TROCAR</span>
        </button>

        {/* Som / Mudo */}
        <button
          type="button"
          onClick={handleToggleMute}
          className={`font-arcade text-[8px] py-1.5 px-1 rounded border transition-all flex items-center justify-center gap-1 active:translate-y-0.5 cursor-pointer ${
            isMuted
              ? "bg-red-950/60 text-arcade-red border-red-800"
              : "bg-black/60 text-zinc-300 border-zinc-700 hover:text-arcade-yellow"
          }`}
          title={isMuted ? "Desmutar" : "Mutar som"}
        >
          <span>{isMuted ? "🔇" : "🔊"}</span>
          <span>{isMuted ? "MUDO" : "SOM"}</span>
        </button>
      </div>
    </div>
  );
}
