import { useState, useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import type { Card, Difficulty, LastResult } from "../types";
import { DIFFICULTY_LABELS } from "../types";
import { CUP_PACKS, getPackTheme, type PackTheme } from "../packThemes";
import {
  listPacks,
  getCachedPacks,
  canCurrentPlayerAccessPack,
  isPackExclusive,
  grantExclusiveCardsToOwner,
  cardBelongsToPack,
  ADMIN_EMAILS,
  type DBPack,
} from "../cardsRepo";
import { CardView } from "./CardView";
import { supabase } from "@/integrations/supabase/client";
import { OnlineBadge } from "../multiplayer/OnlineBadge";
import {
  canClaimDailyFree,
  getDuplicatesList,
  getPlayerInventory,
  getPlayerWallet,
  MATCH_REWARDS,
  REAL_MONEY_STORE,
} from "../economy/economyService";
import { getMasterCatalog } from "../economy/cardCatalog";
import { getPlayerLevel } from "../playerLevel";
import { sound } from "../audio";
import { FeedbackButton } from "@/components/FeedbackButton";
import { LS_KEYS, readJSON, writeJSON } from "../storage";

type Props = {
  onStart: (d: Difficulty, cupPackSlug: string) => void;
  onOpenTutorial: () => void;
  onPlayHuman: () => void;
  onOpenAlbum: () => void;
  onOpenShop: () => void;
  onOpenTrades: () => void;
  onOpenCarteira?: () => void;
  lastResult: LastResult | null;
  initialPack: string;
  initialSection?: MenuSection;
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
  onOpenCarteira,
  lastResult,
  initialPack,
  initialSection = "jogar",
}: Props) {
  const [activeSection, setActiveSection] = useState<MenuSection>(initialSection);
  const [gameStep, setGameStep] = useState<GameStep>("select_mode");
  const [selectedPack, setSelectedPack] = useState<string>(() => {
    return readJSON<string>(LS_KEYS.selectedCupPack) || initialPack || "copa-90";
  });
  const [playMode, setPlayMode] = useState<"solo" | "online">("solo");
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(() => {
    return readJSON<Difficulty>(LS_KEYS.difficulty) || "NORMAL";
  });
  const [showPackDrawer, setShowPackDrawer] = useState(false);

  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);

  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const email = data?.user?.email?.toLowerCase().trim();
      if (email) {
        setCurrentUserEmail(email);
        if (ADMIN_EMAILS.includes(email)) {
          setIsAdminUser(true);
        }
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

  // Elenco e cartas do Baralho / Coleção Ativa
  const squadCards = useMemo(() => {
    const matching = catalog.filter((card) => {
      return (
        cardBelongsToPack(card as any, selectedPack, availablePacks) ||
        (card.pack_ids ?? []).includes(selectedPack) ||
        card.collection === selectedPack
      );
    });
    if (matching.length > 0) return matching;
    return catalog.slice(0, 11);
  }, [catalog, selectedPack, availablePacks]);

  // Craque/Capitão do Baralho: carta com maior OVR
  const captainCard = useMemo(() => {
    if (squadCards.length === 0) return null;
    return [...squadCards].sort((a, b) => (b.ovr ?? 70) - (a.ovr ?? 70))[0];
  }, [squadCards]);

  // Força Geral do Esquadrão (OVR Médio)
  const avgSquadOvr = useMemo(() => {
    if (squadCards.length === 0) return 82;
    const sum = squadCards.reduce((acc, c) => acc + (c.ovr ?? 70), 0);
    return Math.round(sum / squadCards.length);
  }, [squadCards]);

  // Carta ativa selecionada para prévia (padrão é o capitão)
  const [previewCardId, setPreviewCardId] = useState<string | null>(null);

  // Redefine a prévia quando o pack mudar
  useEffect(() => {
    setPreviewCardId(null);
  }, [selectedPack]);

  const activePreviewCard = useMemo(() => {
    if (previewCardId) {
      const found = squadCards.find((c) => c.id === previewCardId);
      if (found) return found;
    }
    return captainCard;
  }, [previewCardId, squadCards, captainCard]);

  const cardForCardView: Card | undefined = useMemo(() => {
    if (!activePreviewCard) return undefined;
    return {
      id: activePreviewCard.id,
      name: activePreviewCard.name,
      position: activePreviewCard.position as any,
      ovr: activePreviewCard.ovr ?? 70,
      attrs: activePreviewCard.attrs as any,
      quote: activePreviewCard.quote ?? "",
      packSlug: selectedPack,
      cardNumber: activePreviewCard.cardNumber ?? activePreviewCard.slotNumber,
      imageUrl: activePreviewCard.imageUrl,
      clubBadgeUrl: activePreviewCard.clubBadgeUrl,
    };
  }, [activePreviewCard, selectedPack]);

  // Mapa de Força Média (OVR) por Coleção / Baralho
  const packOvrMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of availablePacks) {
      const cards = catalog.filter((c) => {
        return (
          cardBelongsToPack(c as any, p.slug, availablePacks) ||
          (c.pack_ids ?? []).includes(p.slug) ||
          (c.pack_ids ?? []).includes(p.id) ||
          c.collection === p.slug
        );
      });
      if (cards.length > 0) {
        const sum = cards.reduce((acc, c) => acc + (c.ovr ?? 70), 0);
        map[p.slug] = Math.round(sum / cards.length);
      } else {
        if (p.slug.includes("02")) map[p.slug] = 88;
        else if (p.slug.includes("94")) map[p.slug] = 86;
        else if (p.slug.includes("triplice")) map[p.slug] = 85;
        else if (p.slug.includes("sao-jorge") || p.slug.includes("corinthians")) map[p.slug] = 83;
        else map[p.slug] = 84;
      }
    }
    return map;
  }, [availablePacks, catalog]);

  const getPackStyleInfo = (slug: string) => {
    const s = slug.toLowerCase();
    if (s.includes("copa-90") || s === "copa-90") {
      return { flag: "🇧🇷", style: "Velocidade e Pontas" };
    }
    if (s.includes("copa-94") || s === "copa-94") {
      return { flag: "🇧🇷", style: "Raça e Finalização" };
    }
    if (s.includes("copa-02") || s === "copa-02") {
      return { flag: "🇧🇷", style: "Drible e Talento Pentacampeão" };
    }
    if (s.includes("parque-sao-jorge") || s.includes("corinthians")) {
      return { flag: "⚫", style: "Fibra e Marcação Pesada" };
    }
    if (s.includes("triplice") || s.includes("azul")) {
      return { flag: "🏴", style: "Passe, Criação e Controle" };
    }
    if (s.includes("leoes")) {
      return { flag: "🦁", style: "Garra e Ataque Rápido" };
    }
    return { flag: "⚽", style: "Equilíbrio Tático" };
  };

  const selectSection = (sec: MenuSection) => {
    sound.playAttrSelect();
    if (sec === "album") {
      onOpenAlbum();
      return;
    }
    if (sec === "banca") {
      onOpenShop();
      return;
    }
    if (sec === "pracinha") {
      onOpenTrades();
      return;
    }
    if (sec === "carteira") {
      if (onOpenCarteira) {
        onOpenCarteira();
      } else {
        setActiveSection("carteira");
      }
      return;
    }
    setActiveSection(sec);
    if (sec === "jogar") setGameStep("select_mode");
  };

  return (
    <div className="min-h-screen bg-[#070e1b] text-arcade-cream flex flex-col relative selection:bg-arcade-yellow selection:text-arcade-dark overflow-x-hidden">
      {/* Camadas Atmosféricas de Estádio Noturno (Matando o abismo azul com textura e holofotes) */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(20,50,95,0.7),rgba(5,10,18,0.98))]" />
        <div className="absolute -top-32 -left-32 w-[550px] h-[750px] bg-gradient-to-br from-arcade-yellow/12 via-emerald-400/5 to-transparent blur-3xl transform -rotate-12" />
        <div className="absolute -top-32 -right-32 w-[550px] h-[750px] bg-gradient-to-bl from-cyan-400/10 via-blue-500/5 to-transparent blur-3xl transform rotate-12" />
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#ffd60a_1.5px,transparent_1.5px)] [background-size:24px_24px]" />
        <div className="absolute inset-0 shadow-[inset_0_0_140px_rgba(0,0,0,0.85)]" />
      </div>
      {/* 0. TOP HUD (Desktop: 3 zonas | Mobile: logo + moedas) */}
      <header className="sticky top-0 z-40 bg-arcade-dark/95 backdrop-blur-md border-b-2 border-arcade-yellow shadow-lg">
        <div className="px-3 sm:px-5 py-2 flex items-center justify-between gap-2">

          {/* ── ZONA 1: ESQUERDA — Logo + Nível/XP integrados ── */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Logo clicável */}
            <button
              type="button"
              onClick={() => selectSection("jogar")}
              className="text-left cursor-pointer active:scale-95 transition-transform"
              title="Ir para o início"
            >
              <h1 className="font-arcade text-base sm:text-lg md:text-xl text-arcade-yellow drop-shadow-[2px_2px_0_var(--arcade-dark)] tracking-wider leading-none">
                ZERO TO TOP
              </h1>
              <div className="font-display text-[8px] sm:text-[9px] text-arcade-cream/70 tracking-widest mt-0.5">
                CARD · DUELO RETRÔ
              </div>
            </button>

            {/* Bloco Nível + XP bar (visível no mobile e desktop) */}
            <button
              type="button"
              onClick={() => selectSection("carteira")}
              className="flex items-center gap-1 sm:gap-1.5 bg-arcade-blue/50 hover:bg-arcade-blue/80 border border-arcade-yellow/40 hover:border-arcade-yellow rounded-lg px-2 py-1 sm:px-2.5 sm:py-1.5 transition-all cursor-pointer active:scale-95 shrink-0"
              title="Ver Perfil e Carteira"
            >
              <span className="text-xs sm:text-sm">⭐</span>
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-1 sm:gap-1.5 leading-none">
                  <span className="font-arcade text-[9px] sm:text-[10px] text-arcade-yellow font-bold">NV. {playerLevel.level}</span>
                  <span className="hidden lg:inline font-arcade text-[8px] text-arcade-cream/60">
                    {playerLevel.xp} XP
                  </span>
                </div>
                <div className="hidden sm:block w-16 lg:w-24 bg-black/60 h-1.5 rounded-full overflow-hidden mt-1 border border-arcade-yellow/30">
                  <div
                    className="bg-gradient-to-r from-yellow-400 via-amber-400 to-amber-500 h-full transition-all duration-500 shadow-[0_0_6px_rgba(255,200,0,0.6)]"
                    style={{ width: `${playerLevel.progressPercent}%` }}
                  />
                </div>
              </div>
            </button>
          </div>

          {/* ── ZONA 2: CENTRO — 4 Abas Arcade (Desktop only, sem CARTEIRA) ── */}
          <nav className="hidden md:flex items-center gap-1 bg-black/30 p-1 rounded-xl border border-arcade-yellow/20 shadow-inner flex-1 justify-center mx-2 lg:mx-4">
            <DesktopNavTab
              active={activeSection === "jogar"}
              icon="⚽"
              label="JOGAR"
              isHero
              onClick={() => selectSection("jogar")}
            />
            <DesktopNavTab
              active={activeSection === "album"}
              icon="📖"
              label="ÁLBUM"
              badge={`${progressPercent}%`}
              badgeColor="bg-arcade-blue text-arcade-yellow border border-arcade-yellow/40"
              onClick={() => selectSection("album")}
            />
            <DesktopNavTab
              active={activeSection === "banca"}
              icon="📰"
              label="BANCA"
              badge={dailyStatus.canClaim ? "GRÁTIS!" : undefined}
              badgeColor="bg-arcade-green text-white animate-pulse"
              onClick={() => selectSection("banca")}
            />
            <DesktopNavTab
              active={activeSection === "pracinha"}
              icon="🌳"
              label="PRACINHA"
              badge={duplicates.length > 0 ? `${duplicates.length}x` : undefined}
              badgeColor="bg-amber-500 text-arcade-dark font-bold"
              onClick={() => selectSection("pracinha")}
            />
          </nav>

          {/* ── ZONA 3: DIREITA — Economia + Utilitários Discretos ── */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

            {/* Conto (Moeda Free) — caixa metálica âmbar */}
            <button
              type="button"
              onClick={() => selectSection("carteira")}
              title="Seu saldo de conto (moeda ganha jogando) — clique para ver a carteira"
              className="flex items-center gap-1 bg-arcade-dark/80 hover:bg-arcade-blue/60 border border-amber-800/50 hover:border-arcade-yellow rounded-lg px-2 py-1.5 transition-colors cursor-pointer active:scale-95"
            >
              <span className="text-sm">🪙</span>
              <span className="font-arcade text-[10px] sm:text-xs text-arcade-yellow font-bold">
                {wallet.contos.toLocaleString()}
              </span>
            </button>

            {/* Fichas de Ouro + botão [+] verde de recarga rápida */}
            <div className="flex items-center gap-0 bg-[#1a1100]/90 border border-yellow-500/50 rounded-lg overflow-hidden shadow-[0_0_8px_rgba(234,179,8,0.15)]">
              <button
                type="button"
                onClick={() => selectSection("carteira")}
                title="Fichas de Ouro — clique para ver extrato"
                className="flex items-center gap-1 px-2 py-1.5 hover:bg-yellow-900/30 transition-colors cursor-pointer active:scale-95"
              >
                <span className="text-sm">🟡</span>
                <span className="font-arcade text-[10px] sm:text-xs text-amber-300 font-bold">
                  {wallet.fichasOuro.toLocaleString()}
                </span>
              </button>
              <button
                type="button"
                onClick={() => selectSection("carteira")}
                title="Recarregar Fichas de Ouro"
                className="flex items-center justify-center w-6 h-full bg-green-500 hover:bg-green-400 text-black font-black text-sm px-1 transition-colors cursor-pointer active:scale-95 border-l border-yellow-500/40 self-stretch"
              >
                +
              </button>
            </div>

            {/* Separador */}
            <div className="hidden sm:block w-px h-5 bg-arcade-yellow/20" />

            {/* Online badge discreto */}
            <div className="hidden sm:flex items-center">
              <OnlineBadge compact />
            </div>

            {/* Login / Conta */}
            {currentUserEmail ? (
              <button
                type="button"
                onClick={() => selectSection("carteira")}
                className="font-arcade text-[8px] sm:text-[9px] bg-arcade-blue/60 hover:bg-arcade-blue text-arcade-cream border border-arcade-yellow/40 rounded px-2 py-1 flex items-center gap-1 transition-colors cursor-pointer"
                title={`Conectado como ${currentUserEmail}. Clique para gerenciar.`}
              >
                <span>👤</span>
                <span className="hidden md:inline max-w-[70px] truncate">{currentUserEmail.split("@")[0]}</span>
              </button>
            ) : (
              <Link
                to="/auth"
                className="font-arcade text-[8px] sm:text-[9px] bg-gradient-to-r from-arcade-yellow to-amber-500 hover:brightness-110 text-arcade-dark font-black border border-arcade-cream rounded px-2 py-1 flex items-center gap-1 transition-transform active:scale-95 shadow"
                title="Entrar ou Criar Conta"
              >
                <span>🔑</span>
                <span>ENTRAR</span>
              </Link>
            )}

            {/* Admin */}
            {isAdminUser && (
              <Link
                to="/admin"
                className="font-arcade text-[8px] bg-arcade-red/90 hover:bg-arcade-red text-white border border-arcade-yellow/50 rounded px-1.5 py-1 flex items-center gap-1 transition-colors shadow"
                title="Painel Administrativo"
              >
                <span>⚙️</span>
                <span className="hidden lg:inline">ADMIN</span>
              </Link>
            )}

            {/* Ajuda — ícone quadrado estilo arcade */}
            <button
              type="button"
              onClick={() => selectSection("tutorial")}
              title="Como Jogar"
              aria-label="Como Jogar"
              className={`w-7 h-7 flex items-center justify-center rounded border font-bold text-sm active:scale-95 transition-all cursor-pointer ${
                activeSection === "tutorial"
                  ? "bg-arcade-yellow text-arcade-dark border-arcade-cream"
                  : "bg-arcade-blue/50 border-arcade-yellow/40 text-arcade-cream hover:bg-arcade-yellow hover:text-arcade-dark"
              }`}
            >
              ?
            </button>

            {/* Feedback */}
            <FeedbackButton inline />
          </div>

        </div>
      </header>

      {/* 1. PAINEL CENTRAL DINÂMICO (CENTER STAGE) */}
      <main className="flex-1 flex flex-col justify-start items-center p-3 sm:p-6 md:p-8 relative z-10 overflow-y-auto pb-48">
        <div className="w-full max-w-[94vw] 2xl:max-w-7xl flex flex-col items-center">
          {/* SEÇÃO 1: JOGAR (LOBBY DE BATALHA RETRÔ EM 2 COLUNAS) */}
          {activeSection === "jogar" && (
            <div className="w-full max-w-5xl xl:max-w-6xl flex flex-col gap-6 animate-in fade-in duration-200">
              <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-start">

                {/* ── COLUNA DA ESQUERDA: SEU ESQUADRÃO EM CAMPO (5 colunas no desktop) ── */}
                <div className="w-full lg:col-span-5 flex flex-col gap-3">
                  <div className="w-full bg-gradient-to-b from-slate-900/95 via-slate-950 to-slate-900/95 border-3 border-arcade-yellow rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden backdrop-blur-md">
                    {/* Brilho de Fundo dos Refletores */}
                    <div className="absolute -top-16 -left-16 w-48 h-48 bg-arcade-yellow/15 blur-3xl rounded-full pointer-events-none" />
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-arcade-yellow to-transparent opacity-80" />

                    {/* Topo do Card: Nome do Baralho + Botão Trocar */}
                    <div className="flex items-center justify-between gap-2 border-b border-arcade-yellow/20 pb-3 mb-3 relative z-10">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-arcade-yellow to-amber-500 text-arcade-dark font-arcade font-black text-sm flex items-center justify-center shadow-[0_2px_8px_rgba(255,204,0,0.4)] border border-arcade-cream shrink-0">
                          {getPackTheme(selectedPack).badge ?? "90"}
                        </div>
                        <div className="min-w-0">
                          <span className="font-arcade text-[8px] sm:text-[9px] text-arcade-yellow/80 uppercase tracking-widest block">
                            SEU ESQUADRÃO EM CAMPO
                          </span>
                          <span className="font-display text-sm sm:text-base text-arcade-cream font-bold leading-tight block truncate max-w-[150px] sm:max-w-[210px]">
                            {availablePacks.find((p) => p.slug === selectedPack)?.name ?? "Copa 90"}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          sound.playAttrSelect();
                          setShowPackDrawer(true);
                        }}
                        className="font-arcade text-[8.5px] bg-arcade-blue/70 hover:bg-arcade-yellow hover:text-arcade-dark text-arcade-cream border border-arcade-yellow/50 rounded-lg px-2.5 py-1.5 transition-all cursor-pointer active:scale-95 shadow group flex items-center gap-1 shrink-0"
                        title="Trocar baralho de cartas ativo"
                      >
                        <span>TROCAR</span>
                        <span className="text-[7px] group-hover:translate-y-0.5 transition-transform">▾</span>
                      </button>
                    </div>

                    {/* Estatísticas Rápidas: Força Geral (OVR Médio) e Elenco */}
                    <div className="grid grid-cols-2 gap-2 mb-3 relative z-10">
                      <div className="bg-black/50 border border-arcade-yellow/30 rounded-xl p-2.5 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-base shrink-0">
                          ⚡
                        </div>
                        <div className="flex flex-col">
                          <span className="font-arcade text-[7px] text-arcade-cream/70 uppercase">FORÇA GERAL</span>
                          <div className="flex items-baseline gap-1">
                            <span className="font-arcade text-base sm:text-lg text-arcade-yellow font-black leading-none">
                              {avgSquadOvr}
                            </span>
                            <span className="font-arcade text-[7.5px] text-emerald-400 font-bold">OVR MÉDIO</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-black/50 border border-arcade-yellow/30 rounded-xl p-2.5 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-base shrink-0">
                          📋
                        </div>
                        <div className="flex flex-col">
                          <span className="font-arcade text-[7px] text-arcade-cream/70 uppercase">ESCALAÇÃO</span>
                          <div className="flex items-baseline gap-1">
                            <span className="font-arcade text-base sm:text-lg text-arcade-cream font-black leading-none">
                              {squadCards.length}
                            </span>
                            <span className="font-arcade text-[7.5px] text-arcade-yellow/80 font-bold">CRAQUES</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Palco Central: Carta do Capitão / Craque em Destaque */}
                    <div className="flex flex-col items-center justify-center py-1 relative z-10">
                      {/* Faixa do Craque */}
                      <div className="mb-2 flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 via-yellow-400/30 to-amber-500/20 border border-arcade-yellow/50 rounded-full px-3 py-0.5 text-center shadow">
                        <span className="text-xs">⭐</span>
                        <span className="font-arcade text-[8px] sm:text-[8.5px] text-arcade-yellow font-black tracking-wider uppercase">
                          {activePreviewCard?.id === captainCard?.id ? "CAPITÃO & CRAQUE DO ESQUADRÃO" : "CRAQUE TITULAR"}
                        </span>
                      </div>

                      {/* Carta com Brilho de Raridade */}
                      <div className="relative group my-1">
                        <div className="absolute -inset-2.5 bg-gradient-to-r from-yellow-500/30 via-amber-400/40 to-yellow-500/30 rounded-2xl blur-lg opacity-80 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        <div className="relative shadow-2xl rounded-lg transform transition-transform group-hover:scale-[1.02]">
                          <CardView card={cardForCardView} />
                        </div>
                      </div>

                      {/* Carrossel de Titulares do Baralho */}
                      {squadCards.length > 1 && (
                        <div className="w-full mt-3">
                          <div className="flex items-center justify-between font-arcade text-[7px] text-arcade-cream/60 uppercase mb-1 px-0.5">
                            <span>ELENCO ESCALADO ({squadCards.length})</span>
                            <span className="text-arcade-yellow/80">INSPECIONAR JOGADOR</span>
                          </div>
                          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin scrollbar-thumb-arcade-yellow/40 scrollbar-track-transparent">
                            {squadCards.map((sc) => {
                              const isSelected = activePreviewCard?.id === sc.id;
                              const isCap = sc.id === captainCard?.id;
                              return (
                                <button
                                  key={sc.id}
                                  type="button"
                                  onClick={() => {
                                    sound.playCardFlip();
                                    setPreviewCardId(sc.id);
                                  }}
                                  className={`flex flex-col items-center shrink-0 rounded-lg p-1.5 border transition-all cursor-pointer ${
                                    isSelected
                                      ? "bg-arcade-yellow text-arcade-dark border-arcade-cream shadow-[0_0_10px_rgba(255,204,0,0.7)] scale-105"
                                      : "bg-black/60 hover:bg-black/90 text-arcade-cream border-arcade-yellow/30 hover:border-arcade-yellow"
                                  }`}
                                  title={`${sc.name} (${sc.position} - OVR ${sc.ovr})`}
                                >
                                  <div className="flex items-center gap-0.5 font-arcade text-[7px] font-bold">
                                    {isCap && <span className="text-[7.5px]">⭐</span>}
                                    <span>{sc.position}</span>
                                  </div>
                                  <span className={`font-arcade text-[9px] font-black ${isSelected ? "text-arcade-dark" : "text-arcade-yellow"}`}>
                                    {sc.ovr}
                                  </span>
                                  <span className="font-arcade text-[6.5px] truncate max-w-[48px] leading-tight">
                                    {sc.name.split(" ")[0]}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── COLUNA DA DIREITA: PAINEL DE PARTIDA & CONFIGURAÇÕES (7 colunas no desktop) ── */}
                <div className="w-full lg:col-span-7 flex flex-col gap-4">
                  {/* 1. SELETOR DE MODO NO TOPO */}
                  <div className="w-full grid grid-cols-2 gap-2 bg-black/50 p-1.5 rounded-2xl border-2 border-arcade-yellow/40 shadow-inner">
                    <button
                      type="button"
                      onClick={() => {
                        sound.playAttrSelect();
                        setPlayMode("solo");
                      }}
                      className={`py-2.5 px-3 rounded-xl font-arcade text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        playMode === "solo"
                          ? "bg-gradient-to-r from-arcade-yellow via-amber-400 to-amber-500 text-arcade-dark font-black shadow-[0_2px_10px_rgba(255,204,0,0.5)] scale-[1.02]"
                          : "text-arcade-cream/70 hover:text-arcade-cream hover:bg-white/5"
                      }`}
                    >
                      <span className="text-base">🤖</span>
                      <span>SOLO VS IA</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        sound.playAttrSelect();
                        setPlayMode("online");
                      }}
                      className={`py-2.5 px-3 rounded-xl font-arcade text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer relative ${
                        playMode === "online"
                          ? "bg-gradient-to-r from-arcade-yellow via-amber-400 to-amber-500 text-arcade-dark font-black shadow-[0_2px_10px_rgba(255,204,0,0.5)] scale-[1.02]"
                          : "text-arcade-cream/70 hover:text-arcade-cream hover:bg-white/5"
                      }`}
                    >
                      <span className="text-base">⚔️</span>
                      <span>1X1 HUMANO</span>
                      <span className="font-arcade text-[7px] bg-red-600 text-white px-1.5 py-0.5 rounded-full font-bold ml-1 animate-pulse">
                        EM BREVE
                      </span>
                    </button>
                  </div>

                  {/* 2. CARD DA ARENA / ESTÁDIO RETRÔ */}
                  <div className="w-full bg-gradient-to-b from-emerald-950/90 via-slate-950 to-arcade-dark border-3 border-arcade-yellow rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden">
                    {/* Holofotes do Estádio */}
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-80 h-28 bg-arcade-yellow/15 blur-2xl rounded-full pointer-events-none" />
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-arcade-yellow to-transparent opacity-80" />

                    {/* Topo da Arena: Título + Nível do Treinador */}
                    <div className="flex items-center justify-between mb-3 relative z-10">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{playerLevel.phase === 1 ? "🏡" : "🏟️"}</span>
                        <div>
                          <div className="font-arcade text-[8px] sm:text-[9px] text-emerald-400 tracking-widest uppercase">
                            {playerLevel.chapter} · {playerLevel.category}
                          </div>
                          <div className="font-display text-sm sm:text-base text-arcade-cream font-bold leading-tight uppercase">
                            {playerLevel.stageBadge} — {playerLevel.title}
                          </div>
                        </div>
                      </div>

                      {/* Nível do Treinador */}
                      <div className="flex items-center gap-1.5 bg-black/60 border border-arcade-yellow/40 rounded-xl px-2.5 py-1">
                        <span className="text-sm">⭐</span>
                        <div className="text-right">
                          <div className="font-arcade text-[9px] text-arcade-yellow font-bold leading-none">
                            {playerLevel.stageBadge}
                          </div>
                          <div className="font-arcade text-[7px] text-arcade-cream/70 uppercase leading-none mt-0.5 max-w-[95px] truncate">
                            {playerLevel.title}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Diorama / Gramado Estilizado ou Imagem Oficial da Arena (Ex: Quintal de Casa) */}
                    <div className="w-full bg-gradient-to-b from-emerald-800 to-emerald-950 rounded-xl p-3.5 border-2 border-emerald-500/40 relative flex flex-col items-center justify-center my-1 shadow-inner overflow-hidden min-h-[110px]">
                      {playerLevel.arenaImage ? (
                        <>
                          <img
                            src={playerLevel.arenaImage}
                            alt={playerLevel.title}
                            className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.72] contrast-[1.12]"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-slate-950/50" />
                        </>
                      ) : (
                        <>
                          {/* Linhas do Campo de Futebol */}
                          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-px bg-white/20 pointer-events-none" />
                          <div className="absolute w-16 h-16 rounded-full border border-white/20 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 border-b border-x border-white/20 pointer-events-none" />
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-5 border-t border-x border-white/20 pointer-events-none" />
                        </>
                      )}

                      {/* Centro do Campo com Bola e Microcopy Raiz */}
                      <div className="relative z-10 flex flex-col items-center text-center py-1">
                        <div className="w-10 h-10 rounded-full bg-black/60 border-2 border-arcade-yellow flex items-center justify-center text-xl shadow-lg mb-1 animate-pulse">
                          {playerLevel.phase === 1 ? "🏡" : "⚽"}
                        </div>
                        <div className="font-arcade text-[10px] sm:text-xs text-arcade-yellow font-bold drop-shadow tracking-wider uppercase">
                          {playerLevel.stageBadge} — {playerLevel.title}
                        </div>
                        <div className="font-body text-xs text-arcade-cream font-medium max-w-sm mt-0.5 drop-shadow">
                          {playMode === "solo"
                            ? (playerLevel.phase === 1
                                ? "Partida no quintal entre chinelos Havaianas. Fature seu conto!"
                                : "Enfrente a máquina no clássico e fature seu conto!")
                            : "Desafie um amigo ao vivo com código de sala e Traps!"}
                        </div>
                      </div>
                    </div>

                    {/* Barra de XP de Carreira */}
                    <div className="mt-3 relative z-10">
                      <div className="flex justify-between items-center font-arcade text-[8px] text-arcade-cream/80 mb-1">
                        <span>PROGRESSO DE CARREIRA</span>
                        <span className="text-arcade-yellow">{playerLevel.xp} / {playerLevel.nextLevelXp} XP</span>
                      </div>
                      <div className="w-full bg-black/70 h-2 rounded-full overflow-hidden border border-arcade-yellow/30">
                        <div
                          className="h-full bg-gradient-to-r from-yellow-400 via-amber-400 to-amber-500 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(255,200,0,0.8)]"
                          style={{ width: `${playerLevel.progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Mini Placar do Último Jogo */}
                    {lastResult && (
                      <div className="mt-2.5 bg-black/50 border border-arcade-yellow/30 rounded-xl px-3 py-1.5 flex items-center justify-between">
                        <span className="font-arcade text-[8px] text-arcade-cream/70">ÚLTIMO PLACAR:</span>
                        <div className="flex items-center gap-1.5 font-arcade text-[10px]">
                          <span className="text-arcade-yellow">{lastResult.goals.p}</span>
                          <span className="text-arcade-cream/50">×</span>
                          <span className="text-arcade-cream">{lastResult.goals.ai}</span>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                            lastResult.goals.p > lastResult.goals.ai
                              ? "bg-emerald-600 text-white"
                              : lastResult.goals.p === lastResult.goals.ai
                              ? "bg-amber-600 text-white"
                              : "bg-rose-700 text-white"
                          }`}>
                            {lastResult.goals.p > lastResult.goals.ai ? "VITÓRIA" : lastResult.goals.p === lastResult.goals.ai ? "EMPATE" : "DERROTA"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. CONFIGURAÇÕES DA PARTIDA & BOTÃO CTA */}
                  {playMode === "solo" ? (
                    <div className="w-full flex flex-col gap-3">
                      {/* Seletor de Dificuldade da IA */}
                      <div className="bg-arcade-dark/95 border-2 border-arcade-yellow/50 rounded-xl p-3 flex flex-col justify-between shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-arcade text-[8.5px] text-arcade-yellow uppercase font-bold tracking-wider">
                            DIFICULDADE DA IA
                          </span>
                          <span className="font-arcade text-[8px] text-arcade-cream/70">
                            {selectedDifficulty === "EASY" ? "TREINO (IA SOLTA)" : selectedDifficulty === "NORMAL" ? "PADRÃO (EQUILIBRADO)" : "PRO (IA LÊ SUA MÃO)"}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {(["EASY", "NORMAL", "HARD"] as Difficulty[]).map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => {
                                sound.playAttrSelect();
                                setSelectedDifficulty(d);
                                writeJSON(LS_KEYS.difficulty, d);
                              }}
                              className={`py-2 px-1 rounded-lg font-arcade text-[9.5px] transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                                selectedDifficulty === d
                                  ? "bg-arcade-yellow text-arcade-dark font-black shadow-[0_2px_8px_rgba(255,204,0,0.4)] scale-[1.02] border-2 border-arcade-cream"
                                  : "bg-arcade-blue/50 text-arcade-cream/70 hover:bg-arcade-blue hover:text-arcade-cream border border-arcade-yellow/20"
                              }`}
                            >
                              <span>{d === "EASY" ? "FÁCIL" : d === "NORMAL" ? "MÉDIO" : "DIFÍCIL"}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* BOTÃO PRINCIPAL DE ENTRADA EM CAMPO (CTA) */}
                      <button
                        type="button"
                        onClick={() => {
                          sound.playAttrSelect();
                          onStart(selectedDifficulty, selectedPack);
                        }}
                        className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-b from-arcade-yellow via-amber-400 to-amber-500 border-3 border-arcade-cream py-4 px-6 text-center cursor-pointer shadow-[0_6px_0_#92400e,0_12px_24px_rgba(0,0,0,0.6)] hover:brightness-105 active:translate-y-1 active:shadow-[0_2px_0_#92400e] transition-all animate-pulse"
                      >
                        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

                        <div className="flex items-center justify-center gap-3">
                          <span className="text-3xl group-hover:rotate-12 transition-transform">⚽</span>
                          <div className="flex flex-col items-center">
                            <span className="font-arcade text-xl sm:text-2xl text-arcade-dark font-black tracking-wider leading-none drop-shadow-[0_1px_2px_rgba(255,255,255,0.4)]">
                              ENTRAR EM CAMPO · BATALHA
                            </span>
                            <span className="font-arcade text-[8.5px] sm:text-[9.5px] text-arcade-dark/90 tracking-widest uppercase mt-1 font-bold">
                              VS IA · VALENDO CONTO 🪙
                            </span>
                          </div>
                        </div>
                      </button>
                    </div>
                  ) : (
                    /* MODO 1X1 HUMANO */
                    <div className="w-full flex flex-col gap-3">
                      <div className="bg-arcade-dark/95 border-2 border-arcade-yellow/50 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left shadow-lg">
                        <div>
                          <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                            <span className="text-xl">⚔️</span>
                            <span className="font-arcade text-xs text-arcade-yellow font-bold">
                              DUELO AO VIVO EM TEMPO REAL
                            </span>
                          </div>
                          <p className="font-body text-xs text-arcade-cream/80 max-w-sm">
                            Crie uma sala privada, passe o código de 5 letras para um amigo e dispute a partida inteira ao vivo!
                          </p>
                        </div>
                        <OnlineBadge />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          sound.playAttrSelect();
                          onPlayHuman();
                        }}
                        className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-b from-rose-500 via-arcade-red to-red-700 border-3 border-arcade-yellow py-4 px-6 text-center cursor-pointer shadow-[0_6px_0_#4c0519,0_12px_24px_rgba(0,0,0,0.6)] hover:brightness-105 active:translate-y-1 active:shadow-[0_2px_0_#4c0519] transition-all"
                      >
                        <div className="flex items-center justify-center gap-3">
                          <span className="text-3xl group-hover:scale-110 transition-transform">⚔️</span>
                          <div className="flex flex-col items-center">
                            <span className="font-arcade text-xl sm:text-2xl text-white font-black tracking-wider leading-none drop-shadow">
                              CRIAR OU ENTRAR NA SALA
                            </span>
                            <span className="font-arcade text-[8.5px] sm:text-[9.5px] text-white/90 tracking-widest uppercase mt-1 font-bold">
                              DISPUTA COM TRAPS E PÊNALTIS ONLINE · VALENDO CONTO 🪙
                            </span>
                          </div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

              </div>

              {/* GAVETA / MODAL DE SELEÇÃO DE PACOTES & DECKS */}
              {showPackDrawer && (
                <div
                  className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
                  onClick={() => setShowPackDrawer(false)}
                >
                  <div
                    className="bg-gradient-to-b from-arcade-dark via-slate-950 to-arcade-dark border-t-4 sm:border-4 border-arcade-yellow rounded-t-3xl sm:rounded-2xl w-full max-w-2xl p-4 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.9)] max-h-[88vh] flex flex-col relative overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Header do Modal */}
                    <div className="flex items-center justify-between border-b-2 border-arcade-yellow/30 pb-3 mb-4">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">🏆</span>
                        <div>
                          <h3 className="font-arcade text-sm sm:text-base text-arcade-yellow font-bold leading-tight">
                            ESCOLHA SEU ESQUADRÃO / DECK
                          </h3>
                          <span className="font-body text-xs text-arcade-cream/80">
                            Selecione o time titular que vai a campo nesta partida
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPackDrawer(false)}
                        className="w-8 h-8 rounded-full bg-arcade-blue border border-arcade-yellow text-arcade-yellow hover:bg-arcade-red hover:text-white flex items-center justify-center font-bold text-sm cursor-pointer transition-colors shadow"
                        title="Fechar seleção de deck"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Grid com os Decks Enriquecidos */}
                    <div className="overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-3.5 py-1 scrollbar-thin scrollbar-thumb-arcade-yellow/40">
                      {availablePacks.map((p) => {
                        const t = getPackTheme(p.slug);
                        const isExcl = isPackExclusive(p);
                        const isSelected = selectedPack === p.slug;
                        const styleInfo = getPackStyleInfo(p.slug);
                        const ovr = packOvrMap[p.slug] ?? 84;

                        return (
                          <div
                            key={p.slug}
                            onClick={() => {
                              if (!isSelected) {
                                sound.playAttrSelect();
                                setSelectedPack(p.slug);
                                writeJSON(LS_KEYS.selectedCupPack, p.slug);
                                setShowPackDrawer(false);
                              }
                            }}
                            className={`p-3.5 sm:p-4 rounded-2xl border-3 text-left transition-all relative flex flex-col justify-between shadow-lg cursor-pointer ${
                              isSelected
                                ? "bg-gradient-to-br from-slate-900 via-amber-950/40 to-slate-900 border-arcade-yellow shadow-[0_0_16px_rgba(255,204,0,0.35)]"
                                : "bg-slate-900/90 hover:bg-slate-800/95 border-arcade-yellow/30 hover:border-arcade-yellow hover:shadow-xl hover:scale-[1.01] group"
                            }`}
                          >
                            {/* Topo do Card: Badge de Status e Brasão */}
                            <div className="flex items-center justify-between mb-2">
                              {isSelected ? (
                                <span className="font-arcade text-[8px] bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full font-black tracking-wider shadow flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                  🟢 ATIVO
                                </span>
                              ) : isExcl ? (
                                <span className="font-arcade text-[7.5px] bg-amber-500 text-arcade-dark px-2 py-0.5 rounded-full font-bold shadow border border-black">
                                  ⭐ EXCLUSIVO
                                </span>
                              ) : (
                                <span className="font-arcade text-[7.5px] text-arcade-cream/50 bg-black/40 px-2 py-0.5 rounded-full border border-white/10">
                                  DISPONÍVEL
                                </span>
                              )}

                              <div className="w-7 h-7 rounded-lg bg-black/60 border border-arcade-yellow/40 flex items-center justify-center font-arcade text-[10px] text-arcade-yellow font-bold shadow-inner shrink-0">
                                {t.badge ?? "90"}
                              </div>
                            </div>

                            {/* Nome do Deck (sem texto cortado por ..., quebra em 2 linhas naturais) */}
                            <div className="flex items-start gap-1.5 mb-2.5">
                              <span className="text-xl leading-tight shrink-0 mt-0.5">{styleInfo.flag}</span>
                              <h4 className="font-arcade text-xs sm:text-sm text-arcade-cream font-bold leading-snug line-clamp-2">
                                {p.name}
                              </h4>
                            </div>

                            {/* Metadados: Força Média (OVR) e Estilo Tático */}
                            <div className="bg-black/55 border border-white/10 rounded-xl p-2.5 mb-3 flex flex-col gap-1 shadow-inner">
                              <div className="flex items-center justify-between">
                                <span className="font-arcade text-[7.5px] text-arcade-cream/70 uppercase">FORÇA:</span>
                                <span className="font-arcade text-[10px] text-arcade-yellow font-black">
                                  {ovr} OVR
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-arcade text-[7.5px] text-arcade-cream/70 uppercase shrink-0">ESTILO:</span>
                                <span className="font-body text-[10px] text-emerald-300 font-bold truncate text-right">
                                  {styleInfo.style}
                                </span>
                              </div>
                            </div>

                            {/* Botão de Ação: SELECIONADO ou ESCALAR ESTE */}
                            {isSelected ? (
                              <div className="w-full py-2 rounded-xl bg-gradient-to-r from-arcade-yellow via-amber-400 to-amber-500 text-arcade-dark font-arcade text-[9px] sm:text-[9.5px] font-black text-center shadow border-2 border-arcade-cream flex items-center justify-center gap-1.5 select-none">
                                <span>✓</span>
                                <span>SELECIONADO</span>
                              </div>
                            ) : (
                              <div className="w-full py-2 rounded-xl bg-arcade-blue group-hover:bg-arcade-yellow text-arcade-cream group-hover:text-arcade-dark font-arcade text-[9px] sm:text-[9.5px] font-bold text-center transition-all border-2 border-arcade-yellow/60 group-hover:border-arcade-cream shadow flex items-center justify-center gap-1.5">
                                <span className="group-hover:translate-x-0.5 transition-transform">⚽</span>
                                <span>ESCALAR ESTE</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
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

          {/* SEÇÃO 5: MINHA CARTEIRA & BANCA DE FICHAS */}
          {activeSection === "carteira" && (
            <div className="w-full bg-arcade-dark border-4 border-arcade-yellow p-5 sm:p-8 md:p-10 shadow-arcade flex flex-col items-center text-center gap-6 animate-in fade-in duration-200">
              <div>
                <h2 className="font-arcade text-lg sm:text-2xl text-arcade-yellow mb-1 flex items-center justify-center gap-2">
                  <span>💼</span>
                  <span>MINHA CARTEIRA</span>
                </h2>
                <p className="font-body text-xs sm:text-sm text-arcade-cream/80">
                  Gerencie seu Conto conquistado nos gramados e suas Fichas de Ouro da banca!
                </p>
              </div>

              {/* Cards de Saldo Duplo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                {/* Conto */}
                <div className="bg-arcade-blue/80 border-2 border-arcade-yellow p-4 shadow-arcade flex items-center gap-3 text-left">
                  <span className="text-3xl animate-bounce">🪙</span>
                  <div>
                    <span className="font-arcade text-[9px] text-arcade-yellow/80">
                      CONTO (FARMÁVEL)
                    </span>
                    <div className="font-arcade text-xl sm:text-2xl text-arcade-yellow font-bold leading-tight">
                      {wallet.contos.toLocaleString()}
                    </div>
                    <span className="font-body text-[10px] text-arcade-cream/70">
                      Moeda das partidas e do descarte
                    </span>
                  </div>
                </div>

                {/* Fichas de Ouro */}
                <div className="bg-yellow-950/60 border-2 border-yellow-400 p-4 shadow-arcade flex items-center gap-3 text-left">
                  <span className="text-3xl">🟡</span>
                  <div>
                    <span className="font-arcade text-[9px] text-yellow-300/80">
                      FICHAS DE OURO (PREMIUM)
                    </span>
                    <div className="font-arcade text-xl sm:text-2xl text-yellow-400 font-bold leading-tight">
                      {wallet.fichasOuro.toLocaleString()}
                    </div>
                    <span className="font-body text-[10px] text-arcade-cream/70">
                      Moeda para pacotes lendários
                    </span>
                  </div>
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

              {/* Estatísticas */}
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

              {/* Status da Conta / Salvar na Nuvem */}
              <div className="w-full bg-arcade-blue/40 border-2 border-arcade-yellow/60 p-4 rounded-xl shadow text-left flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{currentUserEmail ? "☁️" : "🎮"}</span>
                  <div>
                    <div className="font-arcade text-xs text-arcade-yellow font-bold">
                      {currentUserEmail ? "CONTA VINCULADA NA NUVEM" : "MODO CONVIDADO (VISITANTE)"}
                    </div>
                    <div className="font-body text-[11px] text-arcade-cream/80">
                      {currentUserEmail
                        ? `Conectado como: ${currentUserEmail}`
                        : "Seu progresso está salvo apenas neste aparelho. Vincule uma conta para não perder suas cartas!"}
                    </div>
                  </div>
                </div>

                {currentUserEmail ? (
                  <button
                    type="button"
                    onClick={async () => {
                      sound.playAttrSelect();
                      await supabase.auth.signOut();
                      window.location.reload();
                    }}
                    className="font-arcade text-[10px] px-3 py-1.5 bg-arcade-red text-white border border-arcade-cream hover:bg-red-700 rounded transition-colors cursor-pointer"
                  >
                    SAIR DA CONTA
                  </button>
                ) : (
                  <Link
                    to="/auth"
                    className="font-arcade text-[10px] px-4 py-2 bg-gradient-to-r from-arcade-yellow to-amber-500 text-arcade-dark border border-arcade-cream rounded font-bold shadow hover:brightness-105 transition-all cursor-pointer text-center"
                  >
                    💾 SALVAR NA NUVEM / ENTRAR
                  </Link>
                )}
              </div>

              {/* Loja de Fichas de Ouro (Tabela R$) */}
              <div className="w-full text-left mt-2">
                <h3 className="font-arcade text-xs text-arcade-yellow mb-2.5 flex items-center gap-1.5">
                  <span>🏪</span>
                  <span>BANCA DE FICHAS DE OURO (TABELA OFICIAL)</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {REAL_MONEY_STORE.map((offer) => (
                    <div
                      key={offer.id}
                      className={`p-3 border-2 flex flex-col justify-between gap-2 relative ${
                        offer.isPopular
                          ? "bg-yellow-950/80 border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.3)]"
                          : "bg-arcade-blue/40 border-arcade-yellow/60"
                      }`}
                    >
                      {offer.isPopular && (
                        <span className="absolute -top-2.5 right-2 font-arcade text-[8px] bg-yellow-400 text-arcade-dark px-1.5 py-0.5 font-bold">
                          MAIS POPULAR
                        </span>
                      )}
                      <div>
                        <div className="font-arcade text-xs text-arcade-yellow font-bold">
                          {offer.title}
                        </div>
                        {offer.description && (
                          <div className="font-body text-[10px] text-arcade-cream/70 leading-tight mt-0.5 line-clamp-2">
                            {offer.description}
                          </div>
                        )}
                        <div className="font-arcade text-base text-yellow-300 font-bold mt-1.5">
                          🟡 {offer.fichasOuroAwarded}{" "}
                          {offer.bonusFichasOuro > 0 && (
                            <span className="text-[10px] text-green-400 font-normal">
                              (+{offer.bonusFichasOuro} bônus)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-arcade-yellow/30">
                        <span className="font-arcade text-xs text-arcade-cream font-bold">
                          R$ {offer.priceBRL.toFixed(2).replace(".", ",")}
                        </span>
                        <span className="font-arcade text-[8px] text-arcade-yellow/80 bg-arcade-dark px-1.5 py-0.5 border border-arcade-yellow/50">
                          BANCA
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Diretrizes da Economia */}
              <div className="bg-arcade-dark/90 p-3 border border-arcade-yellow/40 text-left w-full text-xs font-body text-arcade-cream/80">
                <b className="text-arcade-yellow font-arcade text-[10px]">💡 REGRAS DA ECONOMIA:</b>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>
                    <b>Recompensas Solo:</b> Vitória: +{MATCH_REWARDS.solo.win} Conto · Empate: +{MATCH_REWARDS.solo.draw} Conto · Derrota: +{MATCH_REWARDS.solo.loss} Conto.
                  </li>
                  <li>
                    <b>Recompensas Multiplayer:</b> Vitória: +{MATCH_REWARDS.multiplayer.win} Conto · Empate: +{MATCH_REWARDS.multiplayer.draw} Conto · Derrota: +{MATCH_REWARDS.multiplayer.loss} Conto.
                  </li>
                  <li>
                    <b>Reciclagem Anti-inflacionária:</b> Comum = 6 Conto · Incomum = 20 Conto · Rara = 70 Conto · Lenda = 250 Conto.
                  </li>
                  <li>
                    <b>Pacote Diário:</b> 3 cartas gratuitas a cada 24 horas na Banca de Jornal!
                  </li>
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

function DesktopNavTab({
  active,
  icon,
  label,
  badge,
  badgeColor = "bg-arcade-yellow text-arcade-dark",
  isHero = false,
  onClick,
}: {
  active: boolean;
  icon: string;
  label: string;
  badge?: string;
  badgeColor?: string;
  isHero?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative px-3 py-1.5 rounded-lg font-arcade text-xs flex items-center gap-1.5 border-2 transition-all cursor-pointer active:scale-95 ${
        isHero
          ? active
            ? "bg-gradient-to-r from-arcade-yellow to-amber-500 text-arcade-dark border-arcade-cream font-bold shadow-[0_0_12px_rgba(255,204,0,0.7)]"
            : "bg-arcade-blue/80 hover:bg-arcade-yellow hover:text-arcade-dark text-arcade-yellow border-arcade-yellow"
          : active
          ? "bg-arcade-yellow text-arcade-dark border-arcade-cream font-bold shadow-sm"
          : "bg-arcade-dark/60 hover:bg-arcade-blue/80 text-arcade-cream/80 hover:text-arcade-cream border-arcade-yellow/40 hover:border-arcade-yellow"
      }`}
    >
      <span className="text-sm">{icon}</span>
      <span className="tracking-wider">{label}</span>
      {badge && (
        <span
          className={`font-arcade text-[8px] px-1.5 py-0.5 rounded-full font-bold shadow ${badgeColor}`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
