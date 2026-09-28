import { useState, useEffect } from "react";
import { LS_KEYS, readJSON, writeJSON } from "../storage";
import {
  isStarterPackClaimed,
  openStarterEnvelope,
  claimFullStarterPack,
  STARTER_SQUADS,
  ENVELOPE_CONFIGS,
  type StarterSquadKey,
  type EnvelopeType,
} from "../economy/economyService";
import type { CatalogCard } from "../economy/economyTypes";
import { PackOpeningModal } from "../shop/PackOpeningModal";
import { sound } from "../audio";
import type { LobbyScreen } from "./MobileNavDock";

type Props = {
  currentScreen: string;
  onNavigate: (screen: LobbyScreen) => void;
  onStartFirstMatch: () => void;
  matchFinished?: boolean;
};

type SquadStage = "choose_squad" | "open_envelopes";

export function FtueGuideOverlay({
  currentScreen,
  onNavigate,
  onStartFirstMatch,
  matchFinished,
}: Props) {
  const [step, setStep] = useState<number>(() => {
    const isCompleted = readJSON<boolean>(LS_KEYS.ftueCompleted);
    if (isCompleted) return 0;
    const claimed = isStarterPackClaimed();
    if (!claimed) return 1;
    const savedStep = readJSON<number>(LS_KEYS.ftueStep);
    return savedStep ?? 2;
  });

  const [squadStage, setSquadStage] = useState<SquadStage>("choose_squad");
  const [selectedSquad, setSelectedSquad] = useState<StarterSquadKey>("copa-90");
  const [openedEnvelopes, setOpenedEnvelopes] = useState<Set<EnvelopeType>>(new Set());

  const [openingCards, setOpeningCards] = useState<
    { card: CatalogCard; wasNewInAlbum: boolean }[] | null
  >(null);
  const [openingPackName, setOpeningPackName] = useState<string>("");

  // Se a partida acabou e estávamos no passo 3, avança para o passo 4
  useEffect(() => {
    if (matchFinished && step === 3) {
      setStep(4);
      writeJSON(LS_KEYS.ftueStep, 4);
    }
  }, [matchFinished, step]);

  const handleSelectSquad = (squadKey: StarterSquadKey) => {
    sound.playAttrSelect();
    setSelectedSquad(squadKey);
    writeJSON(LS_KEYS.selectedCupPack, squadKey);
    setSquadStage("open_envelopes");
  };

  const handleOpenEnvelope = (type: EnvelopeType) => {
    sound.playAttrSelect();
    const res = openStarterEnvelope(selectedSquad, type);
    if (res.success && res.cards.length > 0) {
      sound.playCoinEarn();
      setOpeningPackName(res.envelope.title);
      setOpeningCards(res.cards);
    }
  };

  const handleCloseEnvelopeModal = () => {
    setOpeningCards(null);
    sound.playAttrSelect();

    // Registra qual envelope acabou de ser aberto
    const nextOpened = new Set(openedEnvelopes);
    if (!nextOpened.has("defesa")) {
      nextOpened.add("defesa");
    } else if (!nextOpened.has("meio")) {
      nextOpened.add("meio");
    } else {
      nextOpened.add("ataque");
    }
    setOpenedEnvelopes(nextOpened);

    // Se todos os 3 envelopes foram abertos, conclui o Passo 1
    if (nextOpened.size >= 3) {
      writeJSON(LS_KEYS.starterPackClaimed, true);
      writeJSON(LS_KEYS.selectedCupPack, selectedSquad);
      setStep(2);
      writeJSON(LS_KEYS.ftueStep, 2);
    }
  };

  const handleGoToAlbum = () => {
    sound.playAttrSelect();
    onNavigate("album");
  };

  const handleAdvanceToBattleStep = () => {
    sound.playAttrSelect();
    setStep(3);
    writeJSON(LS_KEYS.ftueStep, 3);
    onNavigate("start");
  };

  const handleStartMatch = () => {
    sound.playAttrSelect();
    onStartFirstMatch();
  };

  const handleCompleteFtue = () => {
    sound.playAttrSelect();
    writeJSON(LS_KEYS.ftueCompleted, true);
    writeJSON(LS_KEYS.tutorialDone, true);
    setStep(0);
  };

  const handleSkipTutorial = () => {
    sound.playAttrSelect();
    if (!isStarterPackClaimed()) {
      claimFullStarterPack(selectedSquad);
    }
    writeJSON(LS_KEYS.ftueCompleted, true);
    writeJSON(LS_KEYS.tutorialDone, true);
    setStep(0);
  };

  // Se o tutorial já foi concluído, não renderiza nada
  if (step === 0) return null;

  const currentSquadInfo = STARTER_SQUADS.find((s) => s.key === selectedSquad) ?? STARTER_SQUADS[0];

  return (
    <>
      {/* ── MODAL DE ABERTURA DO ENVELOPE ESCOLHIDO ── */}
      {openingCards && (
        <PackOpeningModal
          packName={openingPackName}
          cards={openingCards}
          onClose={handleCloseEnvelopeModal}
        />
      )}

      {/* ── PASSO 1: ESCOLHA DE ESQUADRÃO E 3 ENVELOPES ── */}
      {step === 1 && !openingCards && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
          <div className="bg-gradient-to-b from-arcade-dark via-slate-950 to-slate-900 border-4 border-arcade-yellow rounded-2xl p-4 sm:p-7 max-w-xl w-full shadow-2xl relative my-auto">
            
            {/* Botão Pular */}
            <button
              onClick={handleSkipTutorial}
              className="absolute top-3.5 right-4 font-arcade text-[9px] text-arcade-cream/50 hover:text-arcade-yellow transition-colors underline cursor-pointer"
            >
              Pular Introdução ✕
            </button>

            {/* Cabeçalho */}
            <div className="text-center mb-4">
              <span className="font-arcade text-[9px] sm:text-[10px] text-arcade-yellow tracking-widest uppercase block mb-1">
                ⭐ PASSO 1 DE 4 · SEU CLUBE DE ESTREIA
              </span>
              <h2 className="font-arcade text-lg sm:text-2xl text-arcade-yellow drop-shadow-[2px_2px_0_var(--arcade-dark)] leading-tight">
                {squadStage === "choose_squad"
                  ? "ESCOLHA SEU ESQUADRÃO INICIAL"
                  : "BANCADA DO JORNALEIRO: 3 ENVELOPES"}
              </h2>
              <p className="font-body text-xs text-arcade-cream/80 mt-1 max-w-md mx-auto">
                {squadStage === "choose_squad"
                  ? "Você receberá 3 envelopes temáticos fechados (Defesa, Meio e Ataque) com 11 cartas exclusivas sem repetidas para formar seu time titular!"
                  : `Você escolheu o ${currentSquadInfo.name}. Rasgue os 3 envelopes para montar seu time completo!`}
              </p>
            </div>

            {/* FASE 1A: SELEÇÃO DO ESQUADRÃO INICIAL */}
            {squadStage === "choose_squad" && (
              <div className="space-y-3 mb-4">
                {STARTER_SQUADS.map((squad) => (
                  <div
                    key={squad.key}
                    onClick={() => handleSelectSquad(squad.key)}
                    className={`bg-gradient-to-r ${squad.themeGradient} border-2 ${squad.borderColor} rounded-xl p-3.5 sm:p-4 cursor-pointer hover:scale-[1.02] active:scale-95 transition-all shadow-arcade group flex items-center justify-between gap-3`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-3xl sm:text-4xl shrink-0 group-hover:scale-110 transition-transform">
                        {squad.badgeEmoji}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-arcade text-xs sm:text-sm text-arcade-cream group-hover:text-arcade-yellow transition-colors">
                            {squad.name}
                          </h3>
                        </div>
                        <span className={`font-arcade text-[8px] sm:text-[9px] ${squad.flagColor} block`}>
                          ★ {squad.tagline}
                        </span>
                        <p className="font-body text-[11px] text-arcade-cream/70 leading-tight mt-1 line-clamp-2">
                          {squad.description}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="shrink-0 font-arcade text-[10px] px-3 py-2 bg-arcade-yellow text-arcade-dark font-black rounded-lg shadow border border-arcade-cream group-hover:brightness-110"
                    >
                      ESCOLHER ➔
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* FASE 1B: A BANCADA DOS 3 ENVELOPES */}
            {squadStage === "open_envelopes" && (
              <div className="space-y-3 mb-4">
                {/* Saldo da Carteira de Boas-Vindas */}
                <div className="bg-black/50 border border-arcade-yellow/30 rounded-xl p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🪙</span>
                    <span className="font-arcade text-[10px] text-arcade-yellow">
                      KIT INICIAL: 300 CONTO NO BOLSO
                    </span>
                  </div>
                  <span className="font-arcade text-[9px] text-emerald-400">
                    {openedEnvelopes.size}/3 ABERTOS
                  </span>
                </div>

                {/* Lista dos 3 Envelopes */}
                {(["defesa", "meio", "ataque"] as EnvelopeType[]).map((envType, idx) => {
                  const config = ENVELOPE_CONFIGS[envType];
                  const isOpened = openedEnvelopes.has(envType);

                  // Regra de ordem sequencial agradável
                  const isUnlocked =
                    envType === "defesa" ||
                    (envType === "meio" && openedEnvelopes.has("defesa")) ||
                    (envType === "ataque" && openedEnvelopes.has("meio"));

                  return (
                    <div
                      key={envType}
                      className={`border-2 rounded-xl p-3 sm:p-4 flex items-center justify-between gap-3 transition-all ${
                        isOpened
                          ? "bg-emerald-950/40 border-emerald-500/70"
                          : isUnlocked
                          ? "bg-gradient-to-r from-arcade-dark to-slate-900 border-arcade-yellow shadow-arcade hover:border-amber-400"
                          : "bg-slate-950/60 border-slate-700/50 opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-2xl sm:text-3xl shrink-0">
                          {isOpened ? "✅" : config.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-arcade text-xs text-arcade-yellow">
                              {config.title}
                            </h4>
                            <span className="font-arcade text-[8px] bg-arcade-dark/80 px-1.5 py-0.5 rounded text-arcade-cream border border-arcade-yellow/30">
                              {config.cardCount} CARTAS
                            </span>
                          </div>
                          <p className="font-body text-[11px] text-arcade-cream/70 leading-tight mt-0.5">
                            {config.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isOpened ? (
                          <span className="font-arcade text-[9px] text-emerald-400 bg-emerald-950 px-2.5 py-1.5 rounded-lg border border-emerald-500/50">
                            COLADAS ✓
                          </span>
                        ) : isUnlocked ? (
                          <button
                            type="button"
                            onClick={() => handleOpenEnvelope(envType)}
                            className="font-arcade text-[10px] px-3.5 py-2.5 bg-gradient-to-r from-arcade-yellow to-amber-500 text-arcade-dark font-black rounded-lg shadow-lg border border-arcade-cream hover:brightness-110 active:scale-95 transition-all cursor-pointer animate-pulse"
                          >
                            📦 RASGAR
                          </button>
                        ) : (
                          <span className="font-arcade text-[9px] text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-700 flex items-center gap-1">
                            🔒 BLOQUEADO
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Botão de Trocar Esquadrão se ainda não abriu nenhum */}
                {openedEnvelopes.size === 0 && (
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setSquadStage("choose_squad")}
                      className="font-arcade text-[9px] text-arcade-yellow/70 hover:text-arcade-yellow underline cursor-pointer"
                    >
                      ← Escolher outro esquadrão
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Rodapé Informativo */}
            <div className="text-center pt-2 border-t border-arcade-yellow/20">
              <span className="font-body text-[10px] text-arcade-cream/60">
                Ao abrir os 3 envelopes, seu Álbum receberá as 11 figurinhas e seu time estará 100% pronto para o gramado!
              </span>
            </div>

          </div>
        </div>
      )}

      {/* ── PASSO 2: CONHECER O ÁLBUM ── */}
      {step === 2 && (
        <div className="fixed bottom-20 left-4 right-4 z-40 max-w-lg mx-auto animate-slideUp">
          <div className="bg-gradient-to-r from-arcade-dark to-slate-900 border-2 border-arcade-yellow rounded-2xl p-4 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">📖</span>
                <span className="font-arcade text-[10px] text-arcade-yellow tracking-wider">
                  PASSO 2 DE 4 · SEU ÁLBUM DE FIGURINHAS
                </span>
              </div>
              <button
                onClick={handleSkipTutorial}
                className="font-arcade text-[8px] text-arcade-cream/40 hover:text-arcade-yellow cursor-pointer"
              >
                Pular ✕
              </button>
            </div>

            {currentScreen !== "album" ? (
              <>
                <p className="font-body text-xs text-arcade-cream/90 leading-tight">
                  Suas 11 cartas já foram coladas com sucesso! Toque abaixo para abrir o{" "}
                  <strong className="text-arcade-yellow">Álbum</strong> e ver sua coleção inicial (11 / 265).
                </p>
                <button
                  onClick={handleGoToAlbum}
                  className="font-arcade text-xs py-2.5 px-4 bg-arcade-blue border-2 border-arcade-yellow text-arcade-yellow rounded-xl hover:bg-arcade-yellow hover:text-arcade-dark transition-all cursor-pointer font-bold shadow active:scale-95"
                >
                  📖 IR PARA O ÁLBUM
                </button>
              </>
            ) : (
              <>
                <p className="font-body text-xs text-arcade-cream/90 leading-tight">
                  Aqui ficam salvas as 265 cartas do jogo! Cada figurinha tem atributos únicos (Defesa, Passe, Criação, Ataque). Agora vamos para o gramado!
                </p>
                <button
                  onClick={handleAdvanceToBattleStep}
                  className="font-arcade text-xs py-2.5 px-4 bg-arcade-green border-2 border-arcade-yellow text-arcade-cream rounded-xl hover:brightness-110 transition-all cursor-pointer font-bold shadow active:scale-95"
                >
                  ⚔️ AVANÇAR PARA A BATALHA ➔
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── PASSO 3: PRIMEIRA BATALHA ── */}
      {step === 3 && currentScreen === "start" && (
        <div className="fixed bottom-20 left-4 right-4 z-40 max-w-lg mx-auto animate-slideUp">
          <div className="bg-gradient-to-r from-arcade-dark to-slate-900 border-2 border-amber-400 rounded-2xl p-4 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚔️</span>
                <span className="font-arcade text-[10px] text-amber-400 tracking-wider">
                  PASSO 3 DE 4 · HORA DA ESTREIA
                </span>
              </div>
              <button
                onClick={handleSkipTutorial}
                className="font-arcade text-[8px] text-arcade-cream/40 hover:text-arcade-yellow cursor-pointer"
              >
                Pular ✕
              </button>
            </div>

            <p className="font-body text-xs text-arcade-cream/90 leading-tight">
              Seu onze titular do <strong className="text-arcade-yellow">{currentSquadInfo.name}</strong> está escalado! A partida tem 11 rodadas, uma para cada posição. Escolha o melhor atributo da sua carta para vencer a disputa e marcar gol!
            </p>

            <button
              onClick={handleStartMatch}
              className="font-arcade text-xs py-2.5 px-4 bg-gradient-to-r from-amber-400 to-amber-500 border-2 border-arcade-cream text-arcade-dark rounded-xl hover:brightness-110 transition-all cursor-pointer font-black shadow-lg active:scale-95 animate-pulse"
            >
              ⚽ DISPUTAR PRIMEIRO AMISTOSO
            </button>
          </div>
        </div>
      )}

      {/* ── PASSO 4: RECOMPENSA E CICLO COMPLETO ── */}
      {step === 4 && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-gradient-to-b from-arcade-dark to-slate-950 border-4 border-arcade-green rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-center">
            
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-arcade-green/20 border-2 border-arcade-green flex items-center justify-center text-3xl shadow-arcade animate-bounce">
              🏆
            </div>

            <div className="font-arcade text-[10px] text-arcade-green uppercase tracking-widest mb-1">
              PARABÉNS, TREINADOR!
            </div>

            <h2 className="font-arcade text-lg sm:text-xl text-arcade-yellow drop-shadow-[2px_2px_0_var(--arcade-dark)] mb-3 leading-tight">
              ESTREIA CONCLUÍDA!
            </h2>

            <p className="font-body text-xs sm:text-sm text-arcade-cream/90 leading-relaxed mb-4">
              Você já conhece os fundamentos! Agora todo o universo do Zero to Top Card está liberado:
            </p>

            <div className="bg-black/60 border border-arcade-yellow/30 rounded-xl p-3.5 mb-5 space-y-2.5 text-left font-body text-xs text-arcade-cream/80">
              <div className="flex items-start gap-2.5">
                <span className="text-base">📰</span>
                <div>
                  <strong className="text-arcade-yellow font-arcade text-[10px] block">
                    BANCA DE JORNAL:
                  </strong>
                  Compre pacotes novos e resgate 1 Pacotinho Diário Grátis todo dia!
                </div>
              </div>
              <div className="flex items-start gap-2.5 border-t border-arcade-yellow/20 pt-2">
                <span className="text-base">🤝</span>
                <div>
                  <strong className="text-arcade-yellow font-arcade text-[10px] block">
                    PRACINHA DE TROCAS:
                  </strong>
                  Venda repetidas por Conto ou troque figurinhas com outros colecionadores.
                </div>
              </div>
              <div className="flex items-start gap-2.5 border-t border-arcade-yellow/20 pt-2">
                <span className="text-base">🎮</span>
                <div>
                  <strong className="text-arcade-yellow font-arcade text-[10px] block">
                    DUELOS ONLINE 1x1:
                  </strong>
                  Crie salas e desafie amigos em tempo real para ver quem tem o melhor deck.
                </div>
              </div>
            </div>

            <button
              onClick={handleCompleteFtue}
              className="w-full font-arcade text-xs sm:text-sm py-3.5 bg-gradient-to-r from-arcade-green via-emerald-500 to-green-600 text-arcade-cream font-black rounded-xl border-2 border-arcade-cream shadow-arcade hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              🚀 EXPLORAR O JOGO COMPLETO
            </button>
          </div>
        </div>
      )}
    </>
  );
}
