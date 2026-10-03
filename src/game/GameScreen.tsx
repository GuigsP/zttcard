import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { fetchDecks, listAllCards, listPacks } from "./cardsRepo";
import type { Card, Difficulty, LastResult } from "./types";
import { Scoreboard } from "./components/Scoreboard";
import { EventToast } from "./components/EventToast";
import { StartScreen } from "./components/StartScreen";
import { EndScreen } from "./components/EndScreen";
import { TutorialModal } from "./components/TutorialModal";
import { TrapsTutorialModal } from "./components/TrapsTutorialModal";
import { HelpButton } from "./components/HelpButton";
import { MatchmakingScreen } from "./multiplayer/MatchmakingScreen";
import { LS_KEYS, readJSON, writeJSON } from "./storage";
import { useGameEngine } from "./hooks/useGameEngine";
import { UnifiedMatchHeader } from "./components/UnifiedMatchHeader";
import { DuelArena } from "./components/DuelArena";
import { PlayerHand } from "./components/PlayerHand";

import { EconomyHeader } from "./components/EconomyHeader";
import { AlbumView } from "./album/AlbumView";
import { PackShop } from "./shop/PackShop";
import { TradingCenter } from "./trades/TradingCenter";
import { addCoins, MATCH_REWARDS, isStarterPackClaimed, claimFullStarterPack } from "./economy/economyService";
import { sound } from "./audio";

import { MobileNavDock, type LobbyScreen } from "./components/MobileNavDock";
import { RetroBoombox } from "./components/RetroBoombox";
import { getPlayerLevel } from "./playerLevel";

type Screen = "start" | "playing" | "end" | "matchmaking" | "album" | "shop" | "trades" | "carteira";

export function GameScreen() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>("start");
  const [difficulty, setDifficulty] = useState<Difficulty>("NORMAL");
  const [lastResult, setLastResult] = useState<LastResult | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [decks, setDecks] = useState<{ P: Card[]; AI: Card[] } | null>(null);
  const [cupPack, setCupPack] = useState<string>("copa-90");
  const [loadingDecks, setLoadingDecks] = useState(false);

  // Redirecionamento de novos visitantes para /auth (se não logado e nem visitante)
  useEffect(() => {
    const isGuest = readJSON<boolean>(LS_KEYS.guestAuth);
    const hasWallet = readJSON<any>("ztt.economy.wallet");
    const hasClaimed = readJSON<boolean>(LS_KEYS.starterPackClaimed);
    const hasDoneTutorial = readJSON<boolean>(LS_KEYS.tutorialDone);

    if (!isGuest && !hasWallet && !hasClaimed && !hasDoneTutorial) {
      supabase.auth.getSession().then(({ data }) => {
        if (!data.session) {
          navigate({ to: "/auth" });
        }
      });
    }
  }, [navigate]);

  useEffect(() => {
    if (!isStarterPackClaimed()) {
      claimFullStarterPack("copa-90");
    }
    writeJSON(LS_KEYS.ftueCompleted, true);
    writeJSON(LS_KEYS.starterPackClaimed, true);
    listAllCards().catch(() => {});
    listPacks().catch(() => {});
    const stored = readJSON<LastResult>(LS_KEYS.lastResult);
    if (stored) setLastResult(stored);
    const storedDiff = readJSON<Difficulty>(LS_KEYS.difficulty);
    if (storedDiff) setDifficulty(storedDiff);
    const storedPack = readJSON<string>(LS_KEYS.selectedCupPack);
    if (storedPack) setCupPack(storedPack);
  }, []);

  const closeTutorial = useCallback(() => {
    setShowTutorial(false);
    writeJSON(LS_KEYS.tutorialDone, true);
  }, []);

  const loadDecksFor = useCallback(async (slug: string) => {
    setLoadingDecks(true);
    try {
      const d = await fetchDecks(slug);
      setDecks(d);
    } catch {
      setDecks(null);
    } finally {
      setLoadingDecks(false);
    }
  }, []);

  const start = (d: Difficulty, packSlug: string) => {
    setDifficulty(d);
    setCupPack(packSlug);
    writeJSON(LS_KEYS.difficulty, d);
    writeJSON(LS_KEYS.selectedCupPack, packSlug);
    void loadDecksFor(packSlug).then(() => setScreen("playing"));
    setScreen("playing");
  };

  const onGameEnd = (result: LastResult) => {
    setLastResult(result);
    writeJSON(LS_KEYS.lastResult, result);

    // Economy match reward
    const won = result.goals.p > result.goals.ai;
    const tie = result.goals.p === result.goals.ai;
    const outcome = won ? "win" : tie ? "draw" : "loss";
    const rewardCoins = MATCH_REWARDS.solo[outcome];
    addCoins(rewardCoins);
    sound.playCoinEarn();

    setScreen("end");
  };

  const isSubCollection = ["album", "shop", "trades"].includes(screen);
  const isLobby = ["start", "album", "shop", "trades", "carteira"].includes(screen);

  return (
    <>
      {screen === "playing" && <HelpButton onClick={() => setShowTutorial(true)} />}
      {showTutorial && <TutorialModal onClose={closeTutorial} />}

      {isSubCollection && (
        <EconomyHeader
          activeScreen={screen as "album" | "shop" | "trades"}
          onOpenAlbum={() => setScreen("album")}
          onOpenShop={() => setScreen("shop")}
          onOpenTrades={() => setScreen("trades")}
          onHome={() => setScreen("start")}
        />
      )}

      {(screen === "start" || screen === "carteira") && (
        <StartScreen
          onStart={start}
          onOpenTutorial={() => setShowTutorial(true)}
          onPlayHuman={() => setScreen("matchmaking")}
          onOpenAlbum={() => setScreen("album")}
          onOpenShop={() => setScreen("shop")}
          onOpenTrades={() => setScreen("trades")}
          onOpenCarteira={() => setScreen("carteira")}
          initialSection={screen === "carteira" ? "carteira" : "jogar"}
          lastResult={lastResult}
          initialPack={cupPack}
        />
      )}

      {screen === "album" && (
        <AlbumView
          onBack={() => setScreen("start")}
          onOpenShop={() => setScreen("shop")}
          onOpenTrades={() => setScreen("trades")}
        />
      )}

      {screen === "shop" && (
        <PackShop
          onBack={() => setScreen("start")}
        />
      )}

      {screen === "trades" && (
        <TradingCenter
          onBack={() => setScreen("start")}
          onOpenShop={() => setScreen("shop")}
        />
      )}

      {screen === "matchmaking" && (
        <MatchmakingScreen onBack={() => setScreen("start")} />
      )}
      {screen === "playing" && (
        <GameBoard
          difficulty={difficulty}
          decks={decks}
          loading={loadingDecks}
          onEnd={onGameEnd}
          onExit={() => setScreen("start")}
        />
      )}
      {screen === "end" && lastResult && (
        <EndScreen
          result={lastResult}
          cupPackSlug={cupPack}
          onReplay={() => {
            void loadDecksFor(cupPack).then(() => setScreen("playing"));
            setScreen("playing");
          }}
          onChangeDifficulty={() => setScreen("start")}
        />
      )}

      {/* DOCK MOBILE FIXO ESTILO CLASH ROYALE */}
      {isLobby && (
        <MobileNavDock
          activeScreen={screen}
          onChangeScreen={(newScreen: LobbyScreen) => setScreen(newScreen)}
        />
      )}

      {/* RADINHO RETRÔ / WALKMAN ESPORTIVO FLUTUANTE (EM TODAS AS TELAS E NA BATALHA) */}
      <RetroBoombox floating currentScreen={screen} />
    </>
  );
}

type BoardProps = {
  difficulty: Difficulty;
  decks: { P: Card[]; AI: Card[] } | null;
  loading?: boolean;
  onEnd: (r: LastResult) => void;
  onExit: () => void;
};

function GameBoard({ difficulty, decks, loading, onEnd, onExit }: BoardProps) {
  if (loading && !decks) {
    return (
      <div className="min-h-screen bg-arcade-blue flex items-center justify-center">
        <div className="font-arcade text-arcade-yellow text-sm animate-pulse">
          CARREGANDO DECK...
        </div>
      </div>
    );
  }
  return <GameBoardInner difficulty={difficulty} decks={decks} onEnd={onEnd} onExit={onExit} />;
}

function GameBoardInner({ difficulty, decks, onEnd, onExit }: Omit<BoardProps, "loading">) {
  const {
    state,
    dispatch,
    pos,
    pHand,
    pCard,
    aiCard,
    selectCard,
    handlePenalty,
    advancePhase,
  } = useGameEngine({ difficulty, decks, onEnd });

  const [trapsTutorial, setTrapsTutorial] = useState(false);

  useEffect(() => {
    if (state.pTraps.length === 0) return;
    const done = readJSON<boolean>(LS_KEYS.trapsTutorialDone);
    if (!done) setTrapsTutorial(true);
  }, [state.pTraps.length]);

  const closeTrapsTutorial = () => {
    setTrapsTutorial(false);
    writeJSON(LS_KEYS.trapsTutorialDone, true);
  };

  const playerLevel = getPlayerLevel();
  const arenaBg = playerLevel.arenaImage;

  return (
    <div className="min-h-screen bg-[#070e1b] text-arcade-cream flex flex-col justify-between relative selection:bg-arcade-yellow selection:text-arcade-dark overflow-x-hidden">
      {/* CAMADA DE FUNDO: ARENA DO NÍVEL ATUAL (Ex: QUINTAL DE CASA) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {arenaBg ? (
          <>
            <img
              src={arenaBg}
              alt={playerLevel.title}
              className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.85] contrast-[1.05]"
            />
            {/* Vinheta arcade suave para a arte aparecer nítida e as cartas contrastarem */}
            <div className="absolute inset-0 bg-black/25" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-slate-950/60" />
            <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.7)]" />
          </>
        ) : (
          <>
            {/* Iluminação do Gramado Central */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_35%,rgba(13,60,32,0.48),rgba(5,13,24,0.98))]" />
            {/* Holofote Superior Esquerdo do Estádio */}
            <div className="absolute -top-32 -left-32 w-[600px] h-[800px] bg-gradient-to-br from-arcade-yellow/15 via-emerald-400/8 to-transparent blur-3xl transform -rotate-12" />
            {/* Holofote Superior Direito do Estádio */}
            <div className="absolute -top-32 -right-32 w-[600px] h-[800px] bg-gradient-to-bl from-cyan-400/12 via-emerald-500/8 to-transparent blur-3xl transform rotate-12" />
            {/* Textura Retrô de Gramado */}
            <div className="absolute inset-0 opacity-[0.035] bg-[radial-gradient(#ffd60a_1.5px,transparent_1.5px)] [background-size:24px_24px]" />
            {/* Vinheta Noturna nas Bordas */}
            <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.92)]" />
          </>
        )}
      </div>

      <div className="relative z-10 flex flex-col justify-between min-h-screen">
        <div>
          {trapsTutorial && <TrapsTutorialModal onClose={closeTrapsTutorial} />}
          <EventToast text={state.toast?.text ?? null} color={state.toast?.color} />

          <UnifiedMatchHeader
            pGoals={state.goals.p}
            aiGoals={state.goals.ai}
            position={pos}
            posScore={state.posScore}
            roundIdx={state.roundIdx}
            phase={state.phase}
            chooser={state.chooser}
            difficulty={state.difficulty}
            arenaTitle={playerLevel.title}
            onExit={onExit}
          />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-2 py-2 px-4 w-full">
        <DuelArena
          state={state}
          pos={pos}
          pCard={pCard}
          aiCard={aiCard}
          dispatch={dispatch}
          onContinue={advancePhase}
          onPenaltyDone={handlePenalty}
          onOpenTrapsTutorial={() => setTrapsTutorial(true)}
        />

        <PlayerHand
          pos={pos}
          pHand={pHand}
          phase={state.phase}
          pUsedCardIds={state.pUsedCardIds}
          pSelectedCardId={state.pSelectedCardId}
          chosenAttr={state.chosenAttr}
          onSelectCard={selectCard}
        />
      </div>
      </div>
    </div>
  );
}
