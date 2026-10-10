import { useState, useMemo } from "react";
import type { Card, Difficulty, LastResult } from "../../types";
import { DIFFICULTY_LABELS } from "../../types";
import { getPlayerWallet } from "../../economy/economyService";
import { getMasterCatalog } from "../../economy/cardCatalog";
import { getPlayerLevel } from "../../playerLevel";
import { sound } from "../../audio";
import { LS_KEYS, readJSON, writeJSON } from "../../storage";
import type { StartScreenProps } from "../mobile/StartScreenMobile";

/**
 * 💻 START SCREEN DESKTOP (Exclusivo para PC / Monitores Widescreen >= 768px)
 * Inspirado fielmente no design arcade moderno do ZTT Card.
 * Blindado contra qualquer alteração feita no layout Mobile.
 */
export function StartScreenDesktop({
  onStart,
  onOpenTutorial,
  onPlayHuman,
  onOpenAlbum,
  onOpenShop,
  onOpenTrades,
  lastResult,
  initialPack,
}: StartScreenProps) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(() => {
    return readJSON<Difficulty>(LS_KEYS.difficulty) || "NORMAL";
  });
  const [selectedPack] = useState<string>(() => {
    return readJSON<string>(LS_KEYS.selectedCupPack) || initialPack || "copa-90";
  });
  const [playMode, setPlayMode] = useState<"solo" | "online">("solo");

  const wallet = getPlayerWallet();
  const playerLevel = getPlayerLevel();
  const catalog = getMasterCatalog() || [];

  // 4 cartas representativas do esquadrão ativo (Lateral, Atacante, Volante, Goleiro)
  const squadPreviewCards = useMemo(() => {
    const cards = catalog.filter((c) => c && c.position);
    const le = cards.find((c) => c.position === "LE" || c.position === "LD") || cards[0];
    const ata = cards.find((c) => c.position === "ATA" || c.position === "PD" || c.position === "PE") || cards[1];
    const vol = cards.find((c) => c.position === "VOL" || c.position === "MC" || c.position === "MEI") || cards[2];
    const gol = cards.find((c) => c.position === "GOL") || cards[3];
    return [
      le || { id: "1", name: "OLIVEIRA", position: "LE", ovr: 92 },
      ata || { id: "2", name: "FERREIRA", position: "ATA", ovr: 90 },
      vol || { id: "3", name: "SANTOS", position: "VOL", ovr: 88 },
      gol || { id: "4", name: "COSTA", position: "GOL", ovr: 89 },
    ];
  }, [catalog]);

  const handleSelectDifficulty = (d: Difficulty) => {
    sound.playAttrSelect();
    setSelectedDifficulty(d);
    writeJSON(LS_KEYS.difficulty, d);
  };

  const handlePlayNow = () => {
    sound.playWhistle();
    if (playMode === "online") {
      onPlayHuman();
    } else {
      onStart(selectedDifficulty, selectedPack);
    }
  };

  // Recompensas estimadas por dificuldade
  const rewards = useMemo(() => {
    if (selectedDifficulty === "EASY") return { coins: 30, xp: 15 };
    if (selectedDifficulty === "HARD") return { coins: 80, xp: 35 };
    return { coins: 50, xp: 20 };
  }, [selectedDifficulty]);

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#070e1b] text-arcade-cream flex flex-col justify-between p-4 sm:p-6 lg:p-8 select-none font-sans relative overflow-x-hidden">
      {/* Luz ambiente de estádio ao fundo */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(14,165,233,0.12),transparent_70%)]" />

      {/* ── 1. BARRA SUPERIOR (HEADER DE NAVEGAÇÃO & STATUS) ── */}
      <header className="w-full max-w-7xl mx-auto flex items-center justify-between pb-4 border-b border-slate-800/80 relative z-20">
        {/* Logo ZTT */}
        <div className="flex flex-col">
          <div className="font-arcade text-lg lg:text-xl font-black text-arcade-yellow tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            ZERO TO TOP
          </div>
          <div className="font-arcade text-[8px] text-cyan-400 tracking-widest uppercase -mt-0.5">
            CARD · DUELO RETRÔ
          </div>
        </div>

        {/* Abas Centrais de Navegação */}
        <nav className="flex items-center gap-1.5 lg:gap-3 bg-slate-950/70 border border-slate-800 rounded-xl p-1 shadow-inner">
          <button
            type="button"
            className="font-arcade text-[10.5px] px-4 py-1.5 bg-arcade-yellow text-zinc-950 rounded-lg font-bold shadow flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span>⚽</span>
            <span>JOGAR</span>
          </button>
          <button
            type="button"
            onClick={onOpenAlbum}
            className="font-arcade text-[10.5px] px-3.5 py-1.5 text-arcade-cream/80 hover:text-arcade-yellow hover:bg-slate-900 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>🎴</span>
            <span>ÁLBUM</span>
          </button>
          <button
            type="button"
            onClick={onOpenShop}
            className="font-arcade text-[10.5px] px-3.5 py-1.5 text-arcade-cream/80 hover:text-arcade-yellow hover:bg-slate-900 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>🪙</span>
            <span>BANCA</span>
          </button>
          <button
            type="button"
            onClick={onOpenTrades}
            className="font-arcade text-[10.5px] px-3.5 py-1.5 text-arcade-cream/80 hover:text-arcade-yellow hover:bg-slate-900 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>👟</span>
            <span>PRACINHA</span>
          </button>
        </nav>

        {/* Status do Jogador: Moedas, Pacotes, Nível e Configurações */}
        <div className="flex items-center gap-2.5">
          {/* Moedas */}
          <div
            onClick={onOpenShop}
            className="flex items-center gap-1.5 bg-slate-900/90 border border-amber-500/40 hover:border-amber-400 px-3 py-1.5 rounded-lg shadow cursor-pointer transition-all active:scale-95"
            title="Suas moedas. Clique para abrir a banca"
          >
            <span className="text-sm">🪙</span>
            <span className="font-arcade text-xs text-amber-300 font-bold">{wallet.coins}</span>
            <span className="w-4 h-4 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold ml-0.5">
              +
            </span>
          </div>

          {/* Pacotes Não Abertos */}
          <div
            onClick={onOpenShop}
            className="flex items-center gap-1.5 bg-slate-900/90 border border-arcade-yellow/40 hover:border-arcade-yellow px-3 py-1.5 rounded-lg shadow cursor-pointer transition-all active:scale-95"
            title="Pacotinhos para abrir"
          >
            <span className="text-sm">🃏</span>
            <span className="font-arcade text-xs text-arcade-yellow font-bold">
              {wallet.unopenedPacks ?? 0}
            </span>
          </div>

          {/* Nível do Treinador & XP */}
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-lg shadow">
            <span className="text-sm">👤</span>
            <div className="flex flex-col text-right">
              <span className="font-arcade text-[9.5px] text-arcade-yellow font-bold leading-none">
                NV. {playerLevel.level}
              </span>
              <span className="font-arcade text-[7px] text-slate-400 leading-none mt-0.5">
                {playerLevel.xp} XP
              </span>
            </div>
          </div>

          {/* Botão de Configurações / Tutorial */}
          <button
            type="button"
            onClick={onOpenTutorial}
            className="w-8 h-8 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700 flex items-center justify-center text-sm text-slate-300 hover:text-arcade-yellow transition-all cursor-pointer active:scale-90"
            title="Regras e configurações"
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* ── 2. CONTEÚDO PRINCIPAL (GRID 2x2 EM TELA CHEIA) ── */}
      <main className="w-full max-w-7xl mx-auto my-auto py-4 flex flex-col gap-4 relative z-10">
        {/* LINHA 1: HERO "ENTRAR EM CAMPO" + PAINEL DE DIFICULDADE */}
        <div className="grid grid-cols-12 gap-4 items-stretch">
          {/* Card Principal: Camisa 10 no Estádio (Hero Banner) */}
          <div className="col-span-8 relative overflow-hidden rounded-2xl border-2 border-slate-700/60 shadow-2xl min-h-[340px] flex flex-col justify-end p-8 group">
            {/* Imagem de Fundo com Camisa 10 iluminado no Estádio */}
            <img
              src="/hero-entrar-em-campo.jpg"
              alt="Entrar em Campo - ZTT Card"
              className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.88] contrast-[1.08] transition-transform duration-700 group-hover:scale-[1.02]"
            />
            {/* Gradiente escuro lateral para destacar os textos arcade */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/60 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-black/20 pointer-events-none" />

            {/* Conteúdo sobreposto */}
            <div className="relative z-10 max-w-lg">
              <h1 className="font-arcade text-3xl lg:text-4xl text-arcade-yellow font-black leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                ENTRAR
                <br />
                EM CAMPO
              </h1>
              <p className="font-body text-sm lg:text-base text-arcade-cream/90 font-medium max-w-md mt-2 drop-shadow">
                Enfrente a IA, monte seu esquadrão e mostre quem manda no jogo!
              </p>

              <button
                type="button"
                onClick={handlePlayNow}
                className="mt-6 font-arcade text-sm px-7 py-3.5 bg-arcade-yellow hover:bg-yellow-400 text-zinc-950 rounded-xl font-black shadow-[0_4px_0_#92400e,0_8px_16px_rgba(0,0,0,0.5)] active:translate-y-1 active:shadow-none transition-all cursor-pointer flex items-center gap-2.5 w-fit"
              >
                <span className="text-base">⚽</span>
                <span>JOGAR AGORA →</span>
              </button>
            </div>
          </div>

          {/* Painel Lateral: Modo de Jogo & Dificuldade da IA */}
          <div className="col-span-4 rounded-2xl border-2 border-slate-700/60 bg-[#091124] p-5 shadow-2xl flex flex-col justify-between">
            {/* Topo: Modo de Jogo */}
            <div>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-arcade-yellow text-zinc-950 flex items-center justify-center text-sm font-black shadow">
                    👤
                  </div>
                  <div className="font-arcade text-xs font-black text-arcade-cream uppercase tracking-wider">
                    {playMode === "solo" ? "SOLO VS IA" : "1v1 AMIGO"}
                  </div>
                </div>

                {/* Alternador Rápido de Modo */}
                <button
                  type="button"
                  onClick={() => setPlayMode(playMode === "solo" ? "online" : "solo")}
                  className="font-arcade text-[8px] text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                >
                  {playMode === "solo" ? "JOGAR X AMIGO" : "JOGAR X IA"}
                </button>
              </div>

              {/* Seletor de Dificuldade da IA */}
              <div className="mt-2">
                <div className="font-arcade text-[9px] text-slate-400 uppercase tracking-wider mb-2.5 font-bold">
                  ESCOLHA A DIFICULDADE
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {(["EASY", "NORMAL", "HARD"] as Difficulty[]).map((d) => {
                    const isActive = selectedDifficulty === d;
                    const label = d === "EASY" ? "FÁCIL" : d === "NORMAL" ? "MÉDIO" : "DIFÍCIL";
                    const stars = d === "EASY" ? "★" : d === "NORMAL" ? "★" : "★★";

                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleSelectDifficulty(d)}
                        className={`py-3 px-1 rounded-xl font-arcade text-[10px] font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                          isActive
                            ? "bg-arcade-yellow text-zinc-950 border-2 border-yellow-500 shadow-[0_0_12px_rgba(255,214,10,0.5)] font-black"
                            : "bg-slate-900/80 text-slate-300 border-2 border-slate-700/60 hover:border-slate-500 hover:text-white"
                        }`}
                      >
                        <span className="text-[11px] leading-none">{stars}</span>
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Recompensas da Partida */}
            <div className="mt-4 pt-3 border-t border-slate-800">
              <div className="font-arcade text-[9px] text-slate-400 uppercase tracking-wider mb-2 font-bold">
                RECOMPENSAS
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-amber-950/60 border border-amber-600/50 text-amber-300 font-arcade text-[10.5px] px-3 py-1.5 rounded-lg shadow-sm">
                  <span>🪙</span>
                  <span className="font-bold">+{rewards.coins}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-blue-950/60 border border-blue-600/50 text-blue-300 font-arcade text-[10.5px] px-3 py-1.5 rounded-lg shadow-sm">
                  <span className="font-bold text-[9px] bg-blue-500 text-white px-1 py-0.2 rounded">
                    XP
                  </span>
                  <span className="font-bold">+{rewards.xp}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LINHA 2: "SEU ESQUADRÃO" + "JORNADA DE CARREIRA" */}
        <div className="grid grid-cols-12 gap-4 items-stretch">
          {/* Box do Esquadrão Ativo */}
          <div className="col-span-8 rounded-2xl border-2 border-slate-700/60 bg-[#091124] p-5 shadow-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">👑</span>
                <span className="font-arcade text-xs text-arcade-cream font-black tracking-wider">
                  SEU ESQUADRÃO
                </span>
              </div>
              <button
                type="button"
                onClick={onOpenAlbum}
                className="font-arcade text-[9px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>VER ELENCO</span>
                <span>→</span>
              </button>
            </div>

            {/* 4 Cartas Douradas em Destaque */}
            <div className="grid grid-cols-4 gap-3">
              {squadPreviewCards.map((c, i) => (
                <div
                  key={`${c.id}-${i}`}
                  onClick={onOpenAlbum}
                  className="rounded-xl bg-gradient-to-b from-yellow-500/20 via-slate-900 to-black border-2 border-yellow-500/60 p-2 flex flex-col items-center justify-between shadow-lg hover:border-arcade-yellow hover:scale-[1.03] transition-all cursor-pointer group relative overflow-hidden"
                >
                  <div className="w-full flex items-center justify-between font-arcade text-[9px] mb-1">
                    <span className="text-arcade-yellow font-black text-xs leading-none">
                      {c.ovr ?? 88}
                    </span>
                    <span className="text-emerald-400 font-bold leading-none">{c.position}</span>
                  </div>

                  {/* Foto/Arte do Craque */}
                  <div className="w-16 h-16 rounded-lg bg-black/40 border border-yellow-500/30 flex items-center justify-center my-1 overflow-hidden relative">
                    <span className="text-2xl filter drop-shadow">⚽</span>
                  </div>

                  {/* Nome da Paródia */}
                  <div className="w-full text-center mt-1 pt-1 border-t border-yellow-500/30">
                    <span className="font-arcade text-[9px] text-arcade-cream font-bold truncate block group-hover:text-arcade-yellow">
                      {c.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Box da Jornada de Carreira */}
          <div className="col-span-4 rounded-2xl border-2 border-slate-700/60 bg-[#091124] p-5 shadow-2xl flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">🛡️</span>
              <span className="font-arcade text-xs text-arcade-cream font-black tracking-wider">
                JORNADA
              </span>
            </div>

            <div className="flex items-center gap-3 my-auto">
              {/* Diorama Thumbnail */}
              <div className="w-20 h-16 rounded-xl overflow-hidden border-2 border-emerald-500/60 shadow-md shrink-0 bg-emerald-950 relative">
                {playerLevel.arenaImage ? (
                  <img
                    src={playerLevel.arenaImage}
                    alt={playerLevel.title}
                    className="w-full h-full object-cover object-center filter brightness-90"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl">🏟️</div>
                )}
              </div>

              {/* Informações da Fase Atual */}
              <div className="flex-1 min-w-0">
                <div className="font-arcade text-[8.5px] text-slate-400 uppercase tracking-wider leading-none">
                  NÍVEL {playerLevel.level} · FASE {playerLevel.phase}
                </div>
                <div className="font-display text-base text-arcade-cream font-black uppercase truncate mt-1 leading-tight">
                  {playerLevel.title}
                </div>

                {/* Barra de Progresso de XP */}
                <div className="mt-2">
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-700">
                    <div
                      className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(255,200,0,0.8)]"
                      style={{ width: `${playerLevel.progressPercent}%` }}
                    />
                  </div>
                  <div className="font-arcade text-[7.5px] text-slate-400 text-right mt-0.5">
                    {playerLevel.xp} / {playerLevel.nextLevelXp} XP
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── 3. RODAPÉ INFERIOR (LEMA & PLAYER DE RÁDIO DOCADO) ── */}
      <footer className="w-full max-w-7xl mx-auto flex items-center justify-between pt-3 border-t border-slate-800/80 text-slate-500 text-[10px] font-arcade relative z-20">
        <div className="tracking-widest uppercase text-slate-400">
          COLECIONE · MONTE · CONQUISTE
        </div>

        {/* Status do Som Retrô */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-700/80 rounded-full px-3 py-1 text-slate-300 font-arcade text-[9px] shadow-sm">
            <span>🎵</span>
            <span>90.0 RETRÔ MIX</span>
            <span className="text-[8px] text-slate-500">▾</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
