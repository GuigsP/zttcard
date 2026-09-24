import { useCallback, useEffect, useState } from "react";
import { fetchDecks } from "./cardsRepo";
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
import { addCoins, MATCH_REWARDS } from "./economy/economyService";
import { sound } from "./audio";

type Screen = "start" | "playing" | "end" | "matchmaking" | "album" | "shop" | "trades";

export function GameScreen() {
  const [screen, setScreen] = useState<Screen>("start");
  const [difficulty, setDifficulty] = useState<Difficulty>("NORMAL");
  const [lastResult, setLastResult] = useState<LastResult | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [decks, setDecks] = useState<{ P: Card[]; AI: Card[] } | null>(null);
  const [cupPack, setCupPack] = useState<string>("copa-90");
  const [loadingDecks, setLoadingDecks] = useState(false);

  useEffect(() => {
    const done = readJSON<boolean>(LS_KEYS.tutorialDone);
    if (!done) setShowTutorial(true);
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

      {screen === "start" && (
        <StartScreen
          onStart={start}
          onOpenTutorial={() => setShowTutorial(true)}
          onPlayHuman={() => setScreen("matchmaking")}
          onOpenAlbum={() => setScreen("album")}
          onOpenShop={() => setScreen("shop")}
          onOpenTrades={() => setScreen("trades")}
          lastResult={lastResult}
          initialPack={cupPack}
        />
      )}

      {screen === "album" && (
        <AlbumView
          onBack={() => setScreen("start")}
          onOpenShop={() => setScreen("shop")}
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

  return (
    <div className="min-h-screen bg-arcade-blue flex flex-col justify-between">
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
        onExit={onExit}
      />

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
  );
}
