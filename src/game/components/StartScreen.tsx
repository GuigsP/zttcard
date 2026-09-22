import { Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import type { Difficulty, LastResult } from "../types";
import { DIFFICULTY_LABELS } from "../types";
import { CUP_PACKS, getPackTheme, type PackTheme } from "../packThemes";
import {
  listPacks,
  getCachedPacks,
  canCurrentPlayerAccessPack,
  isPackExclusive,
  grantExclusiveCardsToOwner,
  type DBPack,
} from "../cardsRepo";
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
  const inventory = getPlayerInventory();
  const catalog = getMasterCatalog();
  const duplicates = getDuplicatesList();
  const dailyStatus = canClaimDailyFree();

  const totalCards = catalog.length;
  const collectedCards = catalog.filter((c) => (inventory[c.id] ?? 0) >= 1).length;
  const progressPercent = Math.round((collectedCards / totalCards) * 100);

  const selectSection = (sec: MenuSection) => {
    sound.playAttrSelect();
    setActiveSection(sec);
    if (sec === "jogar") setGameStep("select_mode");
  };

  return (
    <div className="min-h-screen bg-arcade-blue text-arcade-cream flex flex-col md:flex-row">
      {/* 1. SIDEBAR LATERAL (MENU ESQUERDO) */}
      <aside className="w-full md:w-72 bg-arcade-dark border-b-4 md:border-b-0 md:border-r-4 border-arcade-yellow p-4 md:p-6 flex flex-col justify-between shrink-0 shadow-arcade z-20">
        <div>
          {/* Logo / Header */}
          <div className="text-center md:text-left mb-6">
            <h1 className="font-arcade text-2xl text-arcade-yellow drop-shadow-[2px_2px_0_var(--arcade-dark)] tracking-wider">
              ZERO TO TOP
            </h1>
            <div className="font-display text-lg text-arcade-cream tracking-widest">
              CARD · DUELO RETRÔ
            </div>
          </div>

          {/* Wallet Badge */}
          <div
            onClick={() => selectSection("carteira")}
            className="cursor-pointer bg-arcade-blue/70 border-2 border-arcade-yellow p-2.5 mb-3 flex items-center justify-between hover:bg-arcade-blue transition-colors shadow"
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl animate-bounce">🪙</span>
              <div>
                <div className="font-arcade text-xs text-arcade-yellow font-bold">
                  ZTT$ {wallet.coins.toLocaleString()}
                </div>
                <div className="font-arcade text-[8px] text-arcade-cream/70">
                  SUA CARTEIRA
                </div>
              </div>
            </div>
            <span className="font-arcade text-[9px] text-arcade-yellow/80">
              VER ➔
            </span>
          </div>

          {/* Level & XP Card */}
          <div className="bg-arcade-blue/40 border-2 border-arcade-yellow/60 p-2.5 mb-6 shadow">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">⭐</span>
                <span className="font-arcade text-[10px] text-arcade-yellow font-bold">
                  NÍVEL {playerLevel.level}
                </span>
              </div>
              <span className="font-arcade text-[8px] text-arcade-cream/70">
                {playerLevel.xp} XP
              </span>
            </div>
            <div className="font-arcade text-[8px] text-arcade-cream/90 mb-1.5 truncate">
              {playerLevel.title}
            </div>
            <div className="w-full bg-black/60 h-1.5 rounded-full overflow-hidden border border-arcade-yellow/30">
              <div
                className="bg-gradient-to-r from-arcade-yellow to-amber-500 h-full transition-all duration-300"
                style={{ width: `${playerLevel.progressPercent}%` }}
              />
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
            <NavItem
              active={activeSection === "jogar"}
              icon="⚽"
              label="JOGAR"
              badge="VS IA / 1x1"
              onClick={() => selectSection("jogar")}
            />
            <NavItem
              active={activeSection === "album"}
              icon="📖"
              label="MEU ÁLBUM"
              badge={`${progressPercent}%`}
              onClick={() => selectSection("album")}
            />
            <NavItem
              active={activeSection === "banca"}
              icon="📰"
              label="BANCA DE JORNAL"
              badge={dailyStatus.canClaim ? "GRÁTIS!" : undefined}
              badgeColor="bg-arcade-green text-white"
              onClick={() => selectSection("banca")}
            />
            <NavItem
              active={activeSection === "pracinha"}
              icon="🌳"
              label="A PRACINHA"
              badge={duplicates.length > 0 ? `${duplicates.length}x` : undefined}
              badgeColor="bg-amber-500 text-arcade-dark"
              onClick={() => selectSection("pracinha")}
            />
            <NavItem
              active={activeSection === "tutorial"}
              icon="❓"
              label="COMO JOGAR"
              onClick={() => selectSection("tutorial")}
            />
          </nav>

          {/* Radinho Retrô 16-bit (Boombox Player) */}
          <div className="mt-4 hidden md:block">
            <RetroBoombox />
          </div>
        </div>

        {/* Footer Admin Link */}
        <div className="pt-3 mt-3 border-t border-arcade-yellow/30 hidden md:flex items-center justify-between">
          <Link
            to="/admin"
            className="font-arcade text-[9px] text-arcade-cream/70 hover:text-arcade-yellow transition-colors flex items-center gap-1.5"
          >
            <span>⚙️</span>
            <span>PAINEL ADMIN</span>
          </Link>
          <span className="font-arcade text-[8px] text-arcade-cream/40">
            v2.0
          </span>
        </div>
      </aside>

      {/* 2. PAINEL CENTRAL DINÂMICO (CENTER STAGE) */}
      <main className="flex-1 flex flex-col justify-center items-center p-4 md:p-10 relative overflow-y-auto">
        <div className="w-full max-w-3xl flex flex-col items-center">
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
    </div>
  );
}

function NavItem({
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
      className={`w-full p-3 border-2 font-arcade text-[10px] text-left transition-all flex items-center justify-between gap-2 whitespace-nowrap md:whitespace-normal ${
        active
          ? "bg-arcade-yellow text-arcade-dark border-arcade-cream font-bold shadow-arcade scale-[1.02]"
          : "bg-arcade-blue/50 text-arcade-cream border-arcade-yellow/40 hover:bg-arcade-blue hover:text-arcade-yellow"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <span>{label}</span>
      </div>
      {badge && (
        <span className={`text-[8px] px-1.5 py-0.5 font-bold rounded ${badgeColor}`}>
          {badge}
        </span>
      )}
    </button>
  );
}
