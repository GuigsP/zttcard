import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import type { Difficulty, LastResult } from "../types";
import { DIFFICULTY_LABELS } from "../types";
import { CUP_PACKS, getPackTheme, type PackTheme } from "../packThemes";
import {
  listPacks,
  getCachedPacks,
  canCurrentPlayerAccessPack,
  isPackExclusive,
  grantExclusiveCardsToOwner,
  ADMIN_EMAILS,
  type DBPack,
} from "../cardsRepo";
import { supabase } from "@/integrations/supabase/client";
import { OnlineBadge } from "../multiplayer/OnlineBadge";
import {
  canClaimDailyFree,
  getDuplicatesList,
  getPlayerInventory,
  getPlayerWallet,
} from "../economy/economyService";
import { getMasterCatalog } from "../economy/cardCatalog";
import { getPlayerLevel } from "../playerLevel";
import { sound } from "../audio";
import { RetroBoombox } from "./RetroBoombox";
import { FeedbackButton } from "@/components/FeedbackButton";

type Props = {
  onStart: (d: Difficulty, cupPackSlug: string) => void;
  onOpenTutorial: () => void;
  onPlayHuman: () => void;
  onOpenAlbum: () => void;
  onOpenShop: () => void;
  onOpenTrades: () => void;
  lastResult: LastResult | null;
  initialPack: string;
};

type MenuSection = "jogar" | "album" | "banca" | "pracinha" | "carteira" | "tutorial";
type GameStep = "select_mode" | "config_ai";

const DIFFS: { key: Difficulty; desc: string }[] = [
  { key: "EASY", desc: "IA joga solta. Ideal para aquecer." },
  { key: "NORMAL", desc: "IA escolhe o melhor atributo dela." },
  { key: "HARD", desc: "IA compara com sua mão e joga sujo." },
];

export function StartScreen({
  onStart,
  onOpenTutorial,
  onPlayHuman,
  onOpenAlbum,
  onOpenShop,
  onOpenTrades,
  lastResult,
  initialPack,
}: Props) {
  const [activeSection, setActiveSection] = useState<MenuSection>("jogar");
  const [gameStep, setGameStep] = useState<GameStep>("select_mode");
  const [selectedPack, setSelectedPack] = useState<string>(initialPack);

  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const email = data?.user?.email?.toLowerCase().trim();
      if (email && ADMIN_EMAILS.includes(email)) {
        setIsAdminUser(true);
      }
    }).catch(() => {});
  }, []);

  const [availablePacks, setAvailablePacks] = useState<DBPack[]>(() => {
    return getCachedPacks().filter(
      (p) => p.is_active && p.slug !== "founder" && p.slug !== "fundador" && canCurrentPlayerAccessPack(p)
    );
  });

  useEffect(() => {
    grantExclusiveCardsToOwner();
    listPacks().then((all) => {
      const filtered = all.filter(
        (p) => p.is_active && p.slug !== "founder" && p.slug !== "fundador" && canCurrentPlayerAccessPack(p)
      );
      if (filtered.length > 0) {
        setAvailablePacks(filtered);
      }
      grantExclusiveCardsToOwner();
    });
  }, []);

  const wallet = getPlayerWallet();
  const playerLevel = getPlayerLevel();
  const inventory = getPlayerInventory() || {};
  const catalog = getMasterCatalog() || [];
  const duplicates = getDuplicatesList() || [];
  const dailyStatus = canClaimDailyFree();

  const totalCards = catalog.length || 1;
  const collectedCards = catalog.filter((c) => c && (inventory[c.id] ?? 0) >= 1).length;
  const progressPercent = Math.min(100, Math.max(0, Math.round((collectedCards / totalCards) * 100)));

  const selectSection = (sec: MenuSection) => {
    sound.playAttrSelect();
    setActiveSection(sec);
    if (sec === "jogar") setGameStep("select_mode");
  };

  return (
    <div className="min-h-screen bg-arcade-blue text-arcade-cream flex flex-col relative selection:bg-arcade-yellow selection:text-arcade-dark">
      {/* 0. TOP STATUS BAR UNIFICADO (Mobile & Desktop) */}
      <header className="sticky top-0 z-40 bg-arcade-dark/95 backdrop-blur-md border-b-2 md:border-b-3 border-arcade-yellow px-3 sm:px-6 py-2.5 flex items-center justify-between shadow-lg">
        {/* Esquerda: Logo do Jogo */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => selectSection("jogar")}
            className="text-left group cursor-pointer active:scale-95 transition-transform"
            title="Ir para o início"
          >
            <h1 className="font-arcade text-lg sm:text-xl md:text-2xl text-arcade-yellow drop-shadow-[2px_2px_0_var(--arcade-dark)] tracking-wider leading-none">
              ZERO TO TOP
            </h1>
            <div className="font-display text-[9px] sm:text-xs text-arcade-cream/80 tracking-widest mt-0.5">
              CARD · DUELO RETRÔ
            </div>
          </button>
        </div>

        {/* Direita: Perfil do Jogador & Recursos (Nível, ZTT$, Online, Ajuda, Admin) */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Nível & Progresso XP (Clicável -> abre Carteira / Perfil) */}
          <button
            type="button"
            onClick={() => selectSection("carteira")}
            className="flex items-center gap-1.5 sm:gap-2 bg-arcade-blue/70 hover:bg-arcade-blue border border-arcade-yellow/60 hover:border-arcade-yellow rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 active:scale-95 transition-all cursor-pointer shadow-sm"
            title="Ver Perfil e Carteira"
          >
            <span className="text-xs sm:text-sm">⭐</span>
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-1 leading-none">
                <span className="font-arcade text-[9px] sm:text-[10px] text-arcade-yellow font-bold">
                  NV. {playerLevel.level}
                </span>
                <span className="hidden sm:inline font-arcade text-[7.5px] text-arcade-cream/70">
                  ({playerLevel.xp} XP)
                </span>
              </div>
              <div className="w-12 sm:w-20 bg-black/60 h-1 sm:h-1.5 rounded-full overflow-hidden mt-1 border border-arcade-yellow/30">
                <div
                  className="bg-gradient-to-r from-arcade-yellow to-amber-500 h-full transition-all duration-300"
                  style={{ width: `${playerLevel.progressPercent}%` }}
                />
              </div>
            </div>
          </button>

          {/* Saldo de Moedas ZTT$ (Clicável -> abre Carteira) */}
          <button
            type="button"
            onClick={() => selectSection("carteira")}
            className="flex items-center gap-1.5 sm:gap-2 bg-arcade-blue/70 hover:bg-arcade-blue border border-arcade-yellow/60 hover:border-arcade-yellow rounded-lg px-2 sm:px-3.5 py-1 sm:py-1.5 active:scale-95 transition-all shadow-sm cursor-pointer"
            title="Sua Carteira ZTT$"
          >
            <span className="text-sm sm:text-base animate-bounce">🪙</span>
            <span className="font-arcade text-[10px] sm:text-xs text-arcade-yellow font-bold leading-none">
              ZTT$ {wallet.coins.toLocaleString()}
            </span>
          </button>

          {/* Online Status Badge */}
          <div className="flex items-center">
            <OnlineBadge compact />
          </div>

          {/* Painel Admin (se admin logado) */}
          {isAdminUser && (
            <Link
              to="/admin"
              className="font-arcade text-[9px] bg-arcade-red/90 hover:bg-arcade-red text-white border border-arcade-yellow/60 rounded-lg px-2 py-1 flex items-center gap-1 transition-colors shadow"
              title="Painel Administrativo"
            >
              <span>⚙️</span>
              <span className="hidden sm:inline">ADMIN</span>
            </Link>
          )}

          {/* Como Jogar / Ajuda */}
          <button
            type="button"
            onClick={() => selectSection("tutorial")}
            title="Como Jogar"
            aria-label="Como Jogar"
            className={`h-7 sm:h-8 px-2 sm:px-2.5 flex items-center justify-center gap-1 rounded-lg border text-xs active:scale-95 transition-all cursor-pointer ${
              activeSection === "tutorial"
                ? "bg-arcade-yellow text-arcade-dark border-arcade-cream font-bold"
                : "bg-arcade-blue/70 border-arcade-yellow/60 text-arcade-cream hover:bg-arcade-yellow hover:text-arcade-dark"
            }`}
          >
            <span>❓</span>
            <span className="hidden sm:inline font-arcade text-[9px]">AJUDA</span>
          </button>

          {/* Feedback */}
          <FeedbackButton inline />
        </div>
      </header>

      {/* 1. PAINEL CENTRAL DINÂMICO (CENTER STAGE) */}
      <main className="flex-1 flex flex-col justify-start items-center p-3 sm:p-6 md:p-8 relative overflow-y-auto pb-28 md:pb-32">
        <div className="w-full max-w-4xl flex flex-col items-center">
          {/* SEÇÃO 1: JOGAR */}
          {activeSection === "jogar" && (
            <div className="w-full flex flex-col items-center animate-in fade-in duration-200">
              {gameStep === "select_mode" && (
                <>
                  <div className="text-center mb-6">
                    <div className="font-arcade text-xs text-arcade-yellow tracking-wider mb-1">
                      ESCOLHA O MODO DE JOGO
                    </div>
                    <div className="font-display text-2xl text-arcade-cream">
                      PRONTO PARA ENTRAR EM CAMPO?
                    </div>
                  </div>

                  <div className="mb-6">
                    <OnlineBadge />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                    {/* Botão Jogar vs IA */}
                    <button
                      onClick={() => {
                        sound.playAttrSelect();
                        setGameStep("config_ai");
                      }}
                      className="group bg-arcade-cream text-arcade-dark border-4 border-arcade-dark hover:border-arcade-yellow hover:bg-arcade-yellow shadow-arcade p-6 text-left transition-all hover:scale-[1.02] flex flex-col justify-between min-h-[160px] relative"
                    >
                      <div className="absolute top-3 right-3 font-arcade text-[8px] bg-red-900 text-white px-2 py-0.5 border border-arcade-yellow">
                        IA LV. {playerLevel.level}
                      </div>
                      <div>
                        <div className="font-arcade text-xl text-arcade-red group-hover:text-arcade-dark flex items-center justify-between mb-2">
                          <span>🤖 VS COMPUTADOR</span>
                          <span className="text-2xl">⚽</span>
                        </div>
                        <p className="font-body text-xs text-arcade-dark/90 leading-relaxed">
                          Partida solo contra a IA adaptativa. Ela aprende com suas jogadas, calibra ao seu nível e rende <b>ZTT$</b> a cada vitória!
                        </p>
                      </div>
                      <div className="font-arcade text-[10px] text-arcade-red group-hover:text-arcade-dark mt-3 font-bold">
                        JOGAR AGORA ➔
                      </div>
                    </button>

                    {/* Botão Jogar vs Humano */}
                    <button
                      onClick={() => {
                        sound.playAttrSelect();
                        onPlayHuman();
                      }}
                      className="group bg-arcade-yellow text-arcade-dark border-4 border-arcade-dark hover:border-arcade-red hover:bg-arcade-red hover:text-arcade-cream shadow-arcade p-6 text-left transition-all hover:scale-[1.02] flex flex-col justify-between min-h-[160px] relative"
                    >
                      <div className="absolute top-3 right-3 font-arcade text-[8px] bg-arcade-dark text-arcade-yellow px-2 py-0.5 border border-arcade-yellow">
                        AO VIVO
                      </div>
                      <div>
                        <div className="font-arcade text-xl text-arcade-red group-hover:text-arcade-cream flex items-center justify-between mb-2">
                          <span>⚔️ VS HUMANO (1x1)</span>
                        </div>
                        <p className="font-body text-xs text-arcade-dark group-hover:text-arcade-cream leading-relaxed">
                          Duelo online em tempo real. Crie uma sala, mande o código pro seu amigo e dispute com Traps e Pênaltis!
                        </p>
                      </div>
                      <div className="font-arcade text-[10px] text-arcade-red group-hover:text-arcade-cream mt-3 font-bold">
                        CRIAR OU ENTRAR NA SALA ➔
                      </div>
                    </button>
                  </div>
                </>
              )}

              {/* Configuração da Partida vs IA */}
              {gameStep === "config_ai" && (
                <div className="w-full max-w-lg bg-arcade-dark border-4 border-arcade-yellow p-6 shadow-arcade flex flex-col gap-5">
                  <div className="flex items-center justify-between border-b border-arcade-yellow/30 pb-3">
                    <button
                      onClick={() => setGameStep("select_mode")}
                      className="font-arcade text-[10px] px-3 py-1.5 bg-arcade-blue text-arcade-cream border border-arcade-yellow hover:bg-arcade-red"
                    >
                      ← VOLTAR
                    </button>
                    <span className="font-arcade text-xs text-arcade-yellow">
                      CONFIGURAR DUELO VS IA
                    </span>
                  </div>

                  {lastResult && (
                    <div className="font-arcade text-[10px] bg-arcade-blue/50 text-arcade-yellow p-2 border border-arcade-yellow text-center">
                      ÚLTIMO JOGO: {lastResult.goals.p} × {lastResult.goals.ai} ·{" "}
                      {DIFFICULTY_LABELS[lastResult.difficulty]}
                    </div>
                  )}

                  {/* Card Informativo de Calibração da IA */}
                  <div className="bg-arcade-blue/40 border border-arcade-yellow/60 p-3 text-left">
                    <div className="flex items-center gap-1.5 font-arcade text-[9px] text-arcade-yellow mb-1">
                      <span>🧠</span>
                      <span>IA TÁTICA COM MEMÓRIA NO SUPABASE</span>
                    </div>
                    <p className="font-body text-[11px] text-arcade-cream/90 leading-relaxed">
                      A máquina calibra sua inteligência ao seu <b>Nível {playerLevel.level} ({playerLevel.title})</b>. Conforme você sobe na carreira, ela joga mais pesado, antecipa seus descartes e reage com falas retrô provocadoras!
                    </p>
                  </div>

                  {/* Seleção de Pacote de Copa ou Exclusivo */}
                  <div>
                    <div className="font-arcade text-[10px] text-arcade-yellow mb-1">
                      1. ESCOLHA O BARALHO / COPA
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {availablePacks.map((p) => {
                        const t = getPackTheme(p.slug);
                        const isExcl = isPackExclusive(p);
                        const isSelected = selectedPack === p.slug;
                        return (
                          <button
                            key={p.slug}
                            type="button"
                            onClick={() => {
                              sound.playAttrSelect();
                              setSelectedPack(p.slug);
                            }}
                            className={`p-2 border-2 text-center transition-all relative ${
                              isSelected
                                ? "bg-arcade-yellow text-arcade-dark border-arcade-cream scale-105 shadow"
                                : "bg-arcade-blue text-arcade-cream border-arcade-yellow/50 hover:bg-arcade-blue/80"
                            }`}
                          >
                            {isExcl && (
                              <div className="absolute -top-2 -right-1 font-arcade text-[7px] bg-amber-500 text-arcade-dark px-1.5 py-0.2 border border-black rounded-full font-bold shadow">
                                ⭐ EXCLUSIVO
                              </div>
                            )}
                            <div className="font-arcade text-xs">{t.badge ?? "90"}</div>
                            <div className="font-arcade text-[9px] mt-0.5 truncate font-bold">
                              {p.name}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Seleção de Dificuldade */}
                  <div>
                    <div className="font-arcade text-[10px] text-arcade-yellow mb-2">
                      2. ESCOLHA A DIFICULDADE
                    </div>
                    <div className="grid gap-2">
                      {DIFFS.map((d) => (
                        <button
                          key={d.key}
                          onClick={() => onStart(d.key, selectedPack)}
                          className="group bg-arcade-cream text-arcade-dark border-2 border-arcade-dark hover:bg-arcade-yellow hover:border-arcade-yellow p-3 text-left transition-all flex items-center justify-between"
                        >
                          <div>
                            <div className="font-arcade text-xs text-arcade-red group-hover:text-arcade-dark">
                              {DIFFICULTY_LABELS[d.key]}
                            </div>
                            <div className="font-body text-[11px] text-arcade-dark/80">
                              {d.desc}
                            </div>
                          </div>
                          <span className="font-arcade text-xs text-arcade-red group-hover:text-arcade-dark">
                            ▶
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SEÇÃO 2: MEU ÁLBUM */}
          {activeSection === "album" && (
            <div className="w-full max-w-xl bg-arcade-dark border-4 border-arcade-yellow p-6 shadow-arcade flex flex-col items-center text-center gap-5 animate-in fade-in duration-200">
              <span className="text-4xl">📖</span>
              <div>
                <h2 className="font-arcade text-lg text-arcade-yellow mb-1">
                  ÁLBUM DE FIGURINHAS RETRÔ
                </h2>
                <p className="font-body text-xs text-arcade-cream/80">
                  Colecione as 66 figurinhas dos maiores craques dos anos 90!
                </p>
              </div>

              {/* Barra de Progresso */}
              <div className="w-full bg-arcade-blue/60 p-4 border-2 border-arcade-yellow/50">
                <div className="flex justify-between font-arcade text-xs text-arcade-yellow mb-2">
                  <span>PROGRESSO DA COLEÇÃO</span>
                  <span>{collectedCards} / {totalCards} ({progressPercent}%)</span>
                </div>
                <div className="w-full h-4 bg-arcade-dark border border-arcade-yellow overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-arcade-yellow to-amber-500 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button
                  onClick={onOpenAlbum}
                  className="flex-1 font-arcade text-xs py-3 bg-arcade-yellow text-arcade-dark border-2 border-arcade-cream shadow-arcade hover:bg-arcade-green hover:text-arcade-cream transition-all"
                >
                  VER ÁLBUM COMPLETO ➔
                </button>
                <button
                  onClick={onOpenShop}
                  className="flex-1 font-arcade text-xs py-3 bg-arcade-green text-arcade-cream border-2 border-arcade-yellow shadow-arcade hover:bg-arcade-yellow hover:text-arcade-dark transition-all"
                >
                  📦 PEGAR PACOTES NA BANCA
                </button>
              </div>
            </div>
          )}

          {/* SEÇÃO 3: BANCA DE JORNAL */}
          {activeSection === "banca" && (
            <div className="w-full max-w-xl bg-arcade-dark border-4 border-arcade-yellow p-6 shadow-arcade flex flex-col items-center text-center gap-5 animate-in fade-in duration-200">
              <span className="text-4xl">📰</span>
              <div>
                <h2 className="font-arcade text-lg text-arcade-yellow mb-1">
                  BANCA DE JORNAL
                </h2>
                <p className="font-body text-xs text-arcade-cream/80">
                  Compre pacotinhos, rasgue a embalagem e cole direto no seu álbum!
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                <div className="bg-arcade-blue/50 p-4 border-2 border-arcade-yellow text-left flex flex-col justify-between">
                  <div>
                    <div className="font-arcade text-xs text-arcade-green mb-1">
                      🎁 PACOTE DIÁRIO
                    </div>
                    <p className="font-body text-[11px] text-arcade-cream/80">
                      3 figurinhas gratuitas a cada 24 horas.
                    </p>
                  </div>
                  <div className="mt-3 font-arcade text-[10px] text-arcade-yellow">
                    {dailyStatus.canClaim ? "DISPONÍVEL AGORA!" : "EM RECARGA"}
                  </div>
                </div>

                <div className="bg-arcade-blue/50 p-4 border-2 border-arcade-yellow text-left flex flex-col justify-between">
                  <div>
                    <div className="font-arcade text-xs text-arcade-yellow mb-1">
                      📦 PACOTES CLÁSSICOS
                    </div>
                    <p className="font-body text-[11px] text-arcade-cream/80">
                      Pacotes a partir de ZTT$ 100 com chance de cartas Raras e Lendárias!
                    </p>
                  </div>
                  <div className="mt-3 font-arcade text-[10px] text-arcade-cream/70">
                    A PARTIR DE ZTT$ 100
                  </div>
                </div>
              </div>

              <button
                onClick={onOpenShop}
                className="w-full font-arcade text-xs py-3.5 bg-arcade-green text-arcade-cream border-2 border-arcade-yellow shadow-arcade hover:bg-arcade-yellow hover:text-arcade-dark transition-all"
              >
                ENTRAR NA BANCA DE JORNAL ➔
              </button>
            </div>
          )}

          {/* SEÇÃO 4: A PRACINHA */}
          {activeSection === "pracinha" && (
            <div className="w-full max-w-xl bg-arcade-dark border-4 border-arcade-yellow p-6 shadow-arcade flex flex-col items-center text-center gap-5 animate-in fade-in duration-200">
              <span className="text-4xl">🌳</span>
              <div>
                <h2 className="font-arcade text-lg text-arcade-yellow mb-1">
                  A PRACINHA
                </h2>
                <p className="font-body text-xs text-arcade-cream/80">
                  O ponto de encontro dos colecionadores! Venda ou troque suas figurinhas repetidas.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full text-left">
                <div className="bg-arcade-blue/40 p-3 border border-arcade-yellow">
                  <div className="font-arcade text-[10px] text-amber-400 mb-1">
                    🥞 MONTINHO
                  </div>
                  <p className="font-body text-[11px] text-arcade-cream/80">
                    {duplicates.length} figurinhas repetidas para vender ou trocar.
                  </p>
                </div>

                <div className="bg-arcade-blue/40 p-3 border border-arcade-yellow">
                  <div className="font-arcade text-[10px] text-arcade-yellow mb-1">
                    🎪 FEIRINHA
                  </div>
                  <p className="font-body text-[11px] text-arcade-cream/80">
                    Mercado aberto com anúncios de outros colecionadores.
                  </p>
                </div>

                <div className="bg-arcade-blue/40 p-3 border border-arcade-yellow">
                  <div className="font-arcade text-[10px] text-purple-400 mb-1">
                    🤝 TROCA 1X1
                  </div>
                  <p className="font-body text-[11px] text-arcade-cream/80">
                    Mesa de troca direta com amigos via código de sala.
                  </p>
                </div>
              </div>

              <button
                onClick={onOpenTrades}
                className="w-full font-arcade text-xs py-3.5 bg-purple-700 text-arcade-cream border-2 border-arcade-yellow shadow-arcade hover:bg-arcade-yellow hover:text-arcade-dark transition-all"
              >
                ENTRAR NA PRACINHA ➔
              </button>
            </div>
          )}

          {/* SEÇÃO 5: MINHA CARTEIRA (ZTT$) */}
          {activeSection === "carteira" && (
            <div className="w-full max-w-xl bg-arcade-dark border-4 border-arcade-yellow p-6 shadow-arcade flex flex-col items-center text-center gap-5 animate-in fade-in duration-200">
              <span className="text-4xl animate-bounce">🪙</span>
              <div>
                <h2 className="font-arcade text-lg text-arcade-yellow mb-1">
                  MINHA CARTEIRA ZTT$
                </h2>
                <div className="font-arcade text-2xl text-arcade-cream mt-2 bg-arcade-blue/80 px-4 py-2 border-2 border-arcade-yellow inline-block">
                  ZTT$ {wallet.coins.toLocaleString()}
                </div>
              </div>

              {/* Nível e Progresso de XP */}
              <div className="w-full bg-arcade-blue/40 border-2 border-arcade-yellow/60 p-3 shadow text-left">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">⭐</span>
                    <span className="font-arcade text-xs text-arcade-yellow font-bold">
                      NÍVEL {playerLevel.level} · {playerLevel.title}
                    </span>
                  </div>
                  <span className="font-arcade text-[9px] text-arcade-cream/80">
                    {playerLevel.xp} XP
                  </span>
                </div>
                <div className="w-full bg-black/60 h-2 rounded-full overflow-hidden border border-arcade-yellow/30 mt-1">
                  <div
                    className="bg-gradient-to-r from-arcade-yellow to-amber-500 h-full transition-all duration-300"
                    style={{ width: `${playerLevel.progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full text-left">
                <div className="bg-arcade-blue/40 p-3 border border-arcade-yellow">
                  <div className="font-arcade text-[9px] text-arcade-yellow/70">
                    PACOTES ABERTOS
                  </div>
                  <div className="font-arcade text-lg text-arcade-cream">
                    {wallet.packsOpened}
                  </div>
                </div>

                <div className="bg-arcade-blue/40 p-3 border border-arcade-yellow">
                  <div className="font-arcade text-[9px] text-arcade-yellow/70">
                    TROCAS REALIZADAS
                  </div>
                  <div className="font-arcade text-lg text-arcade-cream">
                    {wallet.tradesCompleted}
                  </div>
                </div>
              </div>

              <div className="bg-arcade-dark/90 p-3 border border-arcade-yellow/40 text-left w-full text-xs font-body text-arcade-cream/80">
                <b>💡 Como ganhar mais ZTT$?</b>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>Vença partidas no modo Solo (+50 ZTT$) ou 1x1 Humano (+100 ZTT$).</li>
                  <li>Venda figurinhas repetidas do seu Montinho na Pracinha.</li>
                  <li>Resgate seu pacote grátis diário na Banca de Jornal.</li>
                </ul>
              </div>
            </div>
          )}

          {/* SEÇÃO 6: COMO JOGAR */}
          {activeSection === "tutorial" && (
            <div className="w-full max-w-xl bg-arcade-dark border-4 border-arcade-yellow p-6 shadow-arcade flex flex-col items-center text-center gap-5 animate-in fade-in duration-200">
              <span className="text-4xl">❓</span>
              <div>
                <h2 className="font-arcade text-lg text-arcade-yellow mb-1">
                  COMO JOGAR ZERO TO TOP
                </h2>
                <p className="font-body text-xs text-arcade-cream/80">
                  Aprenda as regras do duelo de cartas mais nostálgico dos fliperamas!
                </p>
              </div>

              <div className="space-y-2 text-left w-full text-xs font-body text-arcade-cream/90 bg-arcade-blue/40 p-4 border border-arcade-yellow">
                <div>
                  <b className="text-arcade-yellow font-arcade text-[10px]">1. DUELO DE 11 POSIÇÕES:</b> Cada partida passa pelas 11 posições do futebol (do Goleiro ao Atacante).
                </div>
                <div>
                  <b className="text-arcade-yellow font-arcade text-[10px]">2. BATALHA DE ATRIBUTOS:</b> Quem ganha o Par ou Ímpar escolhe qual atributo disputar (Passe, Defesa, Físico, etc.). O maior valor pontua!
                </div>
                <div>
                  <b className="text-arcade-yellow font-arcade text-[10px]">3. CARTAS DE TRAP:</b> Use Cartão Amarelo (-10 do rival), Impedimento (anula a rodada) ou Pênalti para virar o jogo!
                </div>
              </div>

              <button
                onClick={onOpenTutorial}
                className="w-full font-arcade text-xs py-3.5 bg-arcade-yellow text-arcade-dark border-2 border-arcade-cream shadow-arcade hover:bg-arcade-green hover:text-arcade-cream transition-all"
              >
                ABRIR TUTORIAL INTERATIVO ➔
              </button>
            </div>
          )}
        </div>
      </main>

      {/* 2. BOTTOM NAVIGATION UNIFICADO (Dock no Desktop / Barra Fixa no Mobile) */}
      <div className="fixed bottom-0 md:bottom-5 left-0 right-0 md:left-1/2 md:right-auto md:-translate-x-1/2 z-40 flex justify-center pointer-events-none">
        <nav className="pointer-events-auto w-full md:w-auto md:min-w-[540px] bg-arcade-dark/95 backdrop-blur-md border-t-3 md:border-3 border-arcade-yellow md:rounded-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.6)] md:shadow-[0_8px_30px_rgba(0,0,0,0.85),0_0_20px_rgba(255,204,0,0.2)] px-2 sm:px-6 py-1.5 flex items-end justify-around md:justify-center md:gap-6 pb-[max(0.4rem,env(safe-area-inset-bottom))] md:pb-1.5">
          {/* Tab 1: Banca */}
          <MobileNavTab
            active={activeSection === "banca"}
            icon="📰"
            label="BANCA"
            badge={dailyStatus.canClaim ? "GRÁTIS!" : undefined}
            badgeColor="bg-arcade-green text-white animate-pulse"
            onClick={() => selectSection("banca")}
          />

          {/* Tab 2: Álbum */}
          <MobileNavTab
            active={activeSection === "album"}
            icon="📖"
            label="ÁLBUM"
            badge={`${progressPercent}%`}
            badgeColor="bg-arcade-blue text-arcade-yellow border border-arcade-yellow/40"
            onClick={() => selectSection("album")}
          />

          {/* Tab 3: JOGAR (HERO BUTTON - Estilo Espadas / Centralizado) */}
          <button
            type="button"
            onClick={() => selectSection("jogar")}
            className={`flex flex-col items-center justify-center -mt-5 relative transition-all duration-200 active:scale-95 group cursor-pointer ${
              activeSection === "jogar" ? "scale-105" : "hover:scale-105"
            }`}
          >
            <div
              className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-2xl md:text-3xl border-3 shadow-arcade transition-all ${
                activeSection === "jogar"
                  ? "bg-gradient-to-b from-arcade-yellow to-amber-500 border-arcade-cream text-arcade-dark shadow-[0_0_20px_rgba(255,204,0,0.8)]"
                  : "bg-gradient-to-b from-arcade-blue to-slate-900 border-arcade-yellow text-arcade-yellow hover:border-arcade-cream"
              }`}
            >
              <span className="group-hover:rotate-12 transition-transform duration-200">
                ⚽
              </span>
            </div>
            <span
              className={`font-arcade text-[8.5px] md:text-[9.5px] mt-1 tracking-wider ${
                activeSection === "jogar"
                  ? "text-arcade-yellow font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                  : "text-arcade-cream/70"
              }`}
            >
              JOGAR
            </span>
          </button>

          {/* Tab 4: Pracinha */}
          <MobileNavTab
            active={activeSection === "pracinha"}
            icon="🌳"
            label="PRACINHA"
            badge={duplicates.length > 0 ? `${duplicates.length}x` : undefined}
            badgeColor="bg-amber-500 text-arcade-dark font-bold"
            onClick={() => selectSection("pracinha")}
          />

          {/* Tab 5: Carteira */}
          <MobileNavTab
            active={activeSection === "carteira"}
            icon="🪙"
            label="CARTEIRA"
            onClick={() => selectSection("carteira")}
          />
        </nav>
      </div>

      {/* 3. RADINHO RETRÔ FLUTUANTE (Walkman Esportivo Amarelo Anos 90 - Canto Inferior Direito) */}
      <RetroBoombox floating />
    </div>
  );
}

function MobileNavTab({
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
      className={`flex-1 md:flex-initial md:px-4 flex flex-col items-center justify-center py-1 px-0.5 relative transition-all duration-150 active:scale-95 cursor-pointer ${
        active ? "text-arcade-yellow" : "text-arcade-cream/60 hover:text-arcade-cream"
      }`}
    >
      <div className="relative flex items-center justify-center">
        <span
          className={`text-xl md:text-2xl transition-transform ${
            active ? "scale-110 drop-shadow-[0_2px_4px_rgba(255,204,0,0.4)]" : "opacity-80"
          }`}
        >
          {icon}
        </span>
        {badge && (
          <span
            className={`absolute -top-1.5 -right-2.5 font-arcade text-[7px] md:text-[8px] leading-tight px-1 py-0.5 rounded-full font-bold shadow ${badgeColor}`}
          >
            {badge}
          </span>
        )}
      </div>
      <span
        className={`font-arcade text-[7.5px] md:text-[8.5px] mt-0.5 tracking-wider truncate max-w-full ${
          active ? "font-bold text-arcade-yellow" : "text-arcade-cream/70"
        }`}
      >
        {label}
      </span>
      {active && (
        <span className="w-1.5 h-1.5 rounded-full bg-arcade-yellow mt-0.5 shadow-[0_0_6px_rgba(255,204,0,0.8)]" />
      )}
    </button>
  );
}
