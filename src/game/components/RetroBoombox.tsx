import { useEffect, useState } from "react";
import { sound } from "../audio";

export function RetroBoombox() {
  const [isPlaying, setIsPlaying] = useState(sound.isRadioPlaying());
  const [station, setStation] = useState(sound.getRadioStation());
  const [isMuted, setIsMuted] = useState(sound.isMuted());
  const [volume, setVolume] = useState(sound.getVolume());
  const [isTapeMode, setIsTapeMode] = useState(sound.getIsPirateMode());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = sound.subscribeRadio(() => {
      setIsPlaying(sound.isRadioPlaying());
      setStation(sound.getRadioStation());
      setIsMuted(sound.isMuted());
      setVolume(sound.getVolume());
      setIsTapeMode(sound.getIsPirateMode());
    });
    return unsubscribe;
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2400);
  };

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

  return (
    <div className="w-full rounded-md border-2 border-arcade-yellow/80 bg-[#12151e] p-2.5 shadow-arcade text-arcade-cream select-none transition-all duration-300">
      {/* 1. TOPO: Antena telescópica retrô + Badge da Rádio */}
      <div className="flex items-center justify-between mb-2">
        {/* Antena telescópica retrô */}
        <div className="flex items-center gap-1">
          <div className="w-2 h-1 bg-zinc-500 rounded-xs" />
          <div
            className={`h-0.5 bg-gradient-to-r from-arcade-yellow to-arcade-cream transition-all duration-300 ${
              isPlaying ? "w-10 -rotate-12 origin-left" : "w-5"
            }`}
          />
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              isPlaying ? "bg-arcade-green animate-pulse" : "bg-zinc-600"
            }`}
          />
        </div>

        {/* Badge do Rádio / Seletor de Modo FM vs Fita */}
        <button
          type="button"
          onClick={isTapeMode ? handleSwitchToFm : handleInsertTape}
          className="font-arcade text-[8px] px-2 py-0.5 rounded border border-arcade-yellow/40 bg-black/60 text-arcade-yellow hover:border-arcade-yellow transition-all flex items-center gap-1 cursor-pointer active:scale-95"
          title={isTapeMode ? "Clique para voltar para FM" : "Clique para ouvir Fita K7"}
        >
          <span>{isTapeMode ? "📼" : "📻"}</span>
          <span>{isTapeMode ? "FITA K7 (MIXTAPE)" : "RÁDIO ZTT-90"}</span>
        </button>
      </div>

      {/* Toast flutuante de feedback */}
      {toastMessage && (
        <div className="mb-2 text-center bg-arcade-yellow text-arcade-dark font-arcade text-[8px] py-1 px-1.5 rounded font-bold shadow animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* 2. RÉGUA DE SINTONIA ANALÓGICA (FM DIAL) */}
      <div className="rounded p-1.5 mb-2 border bg-[#0a0c12] border-arcade-yellow/40">
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
            className="absolute top-0 bottom-0 w-1 transition-all duration-500 z-10 bg-arcade-red shadow-[0_0_8px_#ff0055]"
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
                  ? "bg-arcade-green shadow-[0_0_6px_#00ff66]"
                  : "bg-zinc-600"
              }`}
            />
            <span className="font-bold text-arcade-yellow">
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
        {/* Porta Fita K7 Clicável */}
        <button
          type="button"
          onClick={handleInsertTape}
          className="rounded p-1.5 flex flex-col justify-between h-[60px] border bg-[#0b0e16] border-zinc-700 hover:border-arcade-yellow/80 transition-colors cursor-pointer group text-left"
          title="Clique na fita K7 para inserir e tocar!"
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
              <div className="w-1 h-1 rounded-full bg-arcade-yellow" />
            </div>

            {/* Fita Central */}
            <div className="h-2 px-1 text-[6px] font-arcade rounded-xs flex items-center justify-center bg-amber-950/80 text-arcade-yellow/90 border border-amber-800/40">
              {isTapeMode ? "MIXTAPE" : "K7-90"}
            </div>

            {/* Rolo direito */}
            <div
              className={`w-3.5 h-3.5 rounded-full border border-zinc-500 bg-zinc-800 flex items-center justify-center ${
                isPlaying ? "animate-spin" : ""
              }`}
              style={{ animationDuration: "2s" }}
            >
              <div className="w-1 h-1 rounded-full bg-arcade-yellow" />
            </div>
          </div>

          {/* Gênero da Faixa */}
          <div className="flex justify-between items-center text-[7px] font-arcade text-zinc-400 pt-0.5">
            <span className="truncate">{station.genre}</span>
            <span className="text-[6px] text-arcade-yellow opacity-70 group-hover:opacity-100 transition-opacity font-bold">
              {isTapeMode ? "★ FITA" : "★ FM"}
            </span>
          </div>
        </button>

        {/* Alto-Falante com Equalizador */}
        <div className="rounded p-1.5 flex flex-col items-center justify-center h-[60px] border bg-[#0b0e16] border-zinc-700">
          <div className="w-10 h-10 rounded-full border border-zinc-600 bg-black/80 flex items-center justify-center relative overflow-hidden">
            {/* Equalizador animado no centro */}
            {isPlaying ? (
              <div className="flex items-end gap-0.5 h-5 z-10">
                <div
                  className="w-1 rounded-xs h-2.5 animate-bounce bg-arcade-green"
                  style={{ animationDelay: "0.1s" }}
                />
                <div
                  className="w-1 rounded-xs h-4.5 animate-bounce bg-arcade-yellow"
                  style={{ animationDelay: "0.3s" }}
                />
                <div
                  className="w-1 rounded-xs h-3.5 animate-bounce bg-arcade-red"
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

      {/* 4. CONTROLE DE VOLUME DEDICADO (- VOL / SLIDER / + VOL) */}
      <div className="bg-[#0a0c12] border border-arcade-yellow/40 rounded p-1.5 mb-2">
        <div className="flex items-center justify-between text-[7px] font-arcade text-zinc-400 mb-1 px-0.5">
          <span className="flex items-center gap-1 text-arcade-yellow">
            <span>🔈</span>
            <span>VOLUME</span>
          </span>
          <span className="font-bold text-arcade-cream tabular-nums">
            {isMuted ? "0% (MUDO)" : `${Math.round(volume * 100)}%`}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Botão VOL - */}
          <button
            type="button"
            onClick={handleVolumeDown}
            className="font-arcade text-[8px] py-1 px-2 rounded border border-zinc-700 bg-black/80 text-arcade-cream hover:border-arcade-yellow hover:text-arcade-yellow active:translate-y-0.5 cursor-pointer font-bold"
            title="Diminuir Volume (-10%)"
          >
            - VOL
          </button>

          {/* Slider de Volume Analógico */}
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-black/90 accent-arcade-yellow border border-zinc-800"
            title={`Volume: ${isMuted ? 0 : Math.round(volume * 100)}%`}
          />

          {/* Botão VOL + */}
          <button
            type="button"
            onClick={handleVolumeUp}
            className="font-arcade text-[8px] py-1 px-2 rounded border border-zinc-700 bg-black/80 text-arcade-cream hover:border-arcade-yellow hover:text-arcade-yellow active:translate-y-0.5 cursor-pointer font-bold"
            title="Aumentar Volume (+10%)"
          >
            + VOL
          </button>
        </div>
      </div>

      {/* 5. BOTÕES DE CONTROLE PRINCIPAIS */}
      <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-zinc-800">
        {/* Play / Pausa */}
        <button
          type="button"
          onClick={handleTogglePlay}
          className={`font-arcade text-[8px] py-2 px-1 rounded border transition-all flex items-center justify-center gap-1 active:translate-y-0.5 cursor-pointer shadow ${
            isPlaying
              ? "bg-arcade-yellow text-arcade-dark border-arcade-yellow font-bold shadow-[0_0_8px_rgba(255,215,0,0.4)]"
              : "bg-black/80 text-arcade-cream border-zinc-700 hover:border-zinc-500"
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
          className="font-arcade text-[8px] py-2 px-1 rounded border border-zinc-700 bg-black/80 text-arcade-cream hover:border-arcade-yellow hover:text-arcade-yellow transition-all flex items-center justify-center gap-1 active:translate-y-0.5 cursor-pointer shadow"
          title="Sintonizar próxima estação"
        >
          <span>⏭</span>
          <span>TROCAR</span>
        </button>

        {/* Som / Mudo */}
        <button
          type="button"
          onClick={handleToggleMute}
          className={`font-arcade text-[8px] py-2 px-1 rounded border transition-all flex items-center justify-center gap-1 active:translate-y-0.5 cursor-pointer shadow ${
            isMuted
              ? "bg-red-950/80 text-arcade-red border-red-700 font-bold shadow-[0_0_8px_rgba(255,0,85,0.4)]"
              : "bg-black/80 text-arcade-cream border-zinc-700 hover:border-arcade-yellow hover:text-arcade-yellow"
          }`}
          title={isMuted ? "Desmutar som" : "Silenciar som"}
        >
          <span>{isMuted ? "🔇" : "🔊"}</span>
          <span>{isMuted ? "MUDO" : "SOM"}</span>
        </button>
      </div>
    </div>
  );
}
