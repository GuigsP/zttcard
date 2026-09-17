import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchDecks } from "../cardsRepo";
import { readIdentity, readJSON, LS_KEYS, type PlayerIdentity } from "../storage";
import type { Card, Position, Trap } from "../types";
import { POSITIONS, POSITION_LABELS, ATTR_LABELS, TRAP_LABELS } from "../types";
import { CardView } from "../components/CardView";
import { EventToast } from "../components/EventToast";
import { avatarUrl } from "./avatars";
import { NicknameSetup } from "./NicknameSetup";
import { getPackTheme } from "../packThemes";
import { AttributeChoice } from "../components/AttributeChoice";
import { EmojiReactions } from "./EmojiReactions";
import { MPPenaltyShootout } from "./MPPenaltyShootout";
import { MPTrapAnnounce } from "./MPTrapAnnounce";
import { sound } from "../audio";
import { addCoins } from "../economy/economyService";
import {
  applyEvent,
  attrsForCurrentPos,
  autoAdvance,
  initialMPState,
  oppCard,
  oppGoals,
  oppParityNumber,
  oppPosScore,
  oppReady,
  oppSide,
  oppTrapPlayed,
  oppTraps,
  selfCard,
  selfGoals,
  selfParityNumber,
  selfPosScore,
  selfReady,
  selfSide,
  selfTrapPlayed,
  selfTraps,
  selfUsedIds,
  type MPEvent,
  type MPSide,
  type MPState,
  type Parity,
} from "./humanEngine";
import type { RoomDTO } from "@/lib/rooms.functions";
import { fetchRoom, joinRoom } from "@/lib/rooms.functions";
import { useServerFn } from "@tanstack/react-start";
import { Link, useNavigate } from "@tanstack/react-router";

type Props = {
  code: string;
};

type MoveRow = {
  id: string;
  room_id: string;
  seq: number;
  player_id: string;
  side: string;
  kind: string;
  payload: MPEvent;
  created_at: string;
};

export function HumanBoard({ code }: Props) {
  const navigate = useNavigate();
  const [identity, setIdentity] = useState<PlayerIdentity | null>(null);
  const [identityChecked, setIdentityChecked] = useState(false);
  const [room, setRoom] = useState<RoomDTO | null>(null);
  const [state, setState] = useState<MPState>(() => initialMPState(0));
  const [myDeck, setMyDeck] = useState<Card[] | null>(null);
  const [loadingErr, setLoadingErr] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; color?: "green" | "yellow" | "red" | "blue" } | null>(null);
  const [muted, setMuted] = useState(() => sound.isMuted());

  const seenSeqRef = useRef<Set<number>>(new Set());
  const nextSeqRef = useRef<number>(1);
  const fetchRoomFn = useServerFn(fetchRoom);
  const joinRoomFn = useServerFn(joinRoom);

  const toggleSound = () => {
    const next = sound.toggleMute();
    setMuted(next);
    if (!next) sound.playCardFlip();
  };

  // Load identity (or ask for it)
  useEffect(() => {
    const id = readIdentity();
    if (id) setIdentity(id);
    setIdentityChecked(true);
  }, []);

  // Load room + decide my role
  useEffect(() => {
    if (!identity) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetchRoomFn({ data: { code } });
        if (cancelled) return;
        if (!r) {
          setLoadingErr("Sala não encontrada.");
          return;
        }
        setRoom(r);
        setState((s) => ({ ...s, seed: r.seed }));
      } catch (e) {
        if (!cancelled) {
          setLoadingErr(e instanceof Error ? e.message : "Erro ao carregar sala");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [identity, code, fetchRoomFn]);

  const myRole: MPSide | null = useMemo(() => {
    if (!room || !identity) return null;
    if (room.hostPlayerId === identity.playerId) return "HOST";
    if (room.guestPlayerId === identity.playerId) return "GUEST";
    return null;
  }, [room, identity]);

  const oppInfo = useMemo(() => {
    if (!room || !myRole) return null;
    const isHost = myRole === "HOST";
    return {
      nickname: (isHost ? room.guestNickname : room.hostNickname) ?? "AGUARDANDO...",
      avatar: (isHost ? room.guestAvatar : room.hostAvatar) ?? "av1",
      cupPack: (isHost ? room.guestCupPack : room.hostCupPack) ?? "",
    };
  }, [room, myRole]);

  const myInfo = useMemo(() => {
    if (!room || !myRole) return null;
    const isHost = myRole === "HOST";
    return {
      nickname: isHost ? room.hostNickname : (room.guestNickname ?? ""),
      avatar: isHost ? room.hostAvatar : (room.guestAvatar ?? "av1"),
      cupPack: isHost ? room.hostCupPack : (room.guestCupPack ?? "copa-90"),
    };
  }, [room, myRole]);

  // Load own deck once cupPack is known
  useEffect(() => {
    if (!myInfo?.cupPack) return;
    let cancelled = false;
    (async () => {
      try {
        const decks = await fetchDecks(myInfo.cupPack);
        if (cancelled) return;
        if (!decks) {
          setLoadingErr(`Não foi possível montar o deck da copa "${myInfo.cupPack}".`);
          return;
        }
        setMyDeck(decks.P);
      } catch (e) {
        if (!cancelled) setLoadingErr(e instanceof Error ? e.message : "Erro no deck");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [myInfo?.cupPack]);

  // Subscribe to match_moves realtime & load history
  useEffect(() => {
    if (!room || !myRole) return;
    let cancelled = false;

    const applyRow = (row: MoveRow) => {
      if (seenSeqRef.current.has(row.seq)) return;
      seenSeqRef.current.add(row.seq);
      nextSeqRef.current = Math.max(nextSeqRef.current, row.seq + 1);

      setState((s) => {
        const next = autoAdvance(applyEvent(s, row.payload));

        // Sound triggers on state transitions
        if (row.payload.kind === "SELECT_CARD") {
          sound.playCardFlip();
        } else if (row.payload.kind === "PICK_ATTR") {
          sound.playAttrSelect();
        } else if (row.payload.kind === "PLAY_TRAP") {
          if (row.payload.trap === "AMARELO") sound.playYellowCard();
          else sound.playWhistle();
        } else if (next.phase === "REVEAL" && s.phase !== "REVEAL") {
          const last = next.lastLog;
          if (last?.winner === (myRole === "HOST" ? "P" : "AI")) {
            sound.playPointWon();
          } else if (last?.winner !== "DRAW" && last?.winner !== "VOID") {
            sound.playPointLost();
          }
        } else if (next.phase === "POS_END" && s.phase !== "POS_END") {
          const myPosScore = myRole === "HOST" ? next.hostPosScore : next.guestPosScore;
          const oppScore = myRole === "HOST" ? next.guestPosScore : next.hostPosScore;
          if (myPosScore > oppScore) sound.playGoal();
        } else if (next.phase === "GAME_END" && s.phase !== "GAME_END") {
          const myG = myRole === "HOST" ? next.hostGoals : next.guestGoals;
          const oppG = myRole === "HOST" ? next.guestGoals : next.hostGoals;
          if (myG > oppG) sound.playVictory();
        }

        return next;
      });
    };

    (async () => {
      const { data, error } = await supabase
        .from("match_moves")
        .select("*")
        .eq("room_id", room.id)
        .order("seq", { ascending: true });
      if (cancelled) return;
      if (error) {
        console.error(error);
        return;
      }
      for (const row of (data ?? []) as MoveRow[]) {
        applyRow(row);
      }
    })();

    const channel = supabase
      .channel(`room:${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "match_moves",
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          applyRow(payload.new as MoveRow);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "match_rooms",
          filter: `id=eq.${room.id}`,
        },
        (payload) => {
          const row = payload.new as unknown as {
            id: string;
            code: string;
            status: string;
            host_player_id: string;
            host_nickname: string;
            host_avatar: string;
            host_cup_pack: string;
            guest_player_id: string | null;
            guest_nickname: string | null;
            guest_avatar: string | null;
            guest_cup_pack: string | null;
            seed: number | string;
            created_at: string;
            updated_at: string;
            expires_at: string;
          };
          setRoom({
            id: row.id,
            code: row.code,
            status: row.status,
            hostPlayerId: row.host_player_id,
            hostNickname: row.host_nickname,
            hostAvatar: row.host_avatar,
            hostCupPack: row.host_cup_pack,
            guestPlayerId: row.guest_player_id,
            guestNickname: row.guest_nickname,
            guestAvatar: row.guest_avatar,
            guestCupPack: row.guest_cup_pack,
            seed: Number(row.seed),
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            expiresAt: row.expires_at,
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [room?.id, myRole]); // eslint-disable-line react-hooks/exhaustive-deps

  // Emit a move
  const emit = useCallback(
    async (event: MPEvent) => {
      if (!room || !identity || !myRole) return;
      const doInsert = async (seq: number) => {
        return supabase.from("match_moves").insert({
          room_id: room.id,
          seq,
          player_id: identity.playerId,
          side: myRole,
          kind: event.kind,
          payload: event,
        });
      };
      let cur = nextSeqRef.current;
      for (let i = 0; i < 6; i++) {
        const { error } = await doInsert(cur);
        if (!error) {
          nextSeqRef.current = cur + 1;
          return;
        }
        if ((error as { code?: string }).code === "23505") {
          cur += 1;
          continue;
        }
        console.error("[MP] emit error", error);
        break;
      }
    },
    [room, identity, myRole],
  );

  // Auto start when both present
  useEffect(() => {
    if (state.phase === "WAITING" && room?.guestPlayerId && myRole === "HOST") {
      void emit({ kind: "MATCH_START" });
    }
  }, [state.phase, room?.guestPlayerId, myRole, emit]);

  // Match end economy reward
  const rewardedRef = useRef(false);
  useEffect(() => {
    if (state.phase === "GAME_END" && !rewardedRef.current && myRole) {
      rewardedRef.current = true;
      const myGoals = selfGoals(state, myRole);
      const theirGoals = oppGoals(state, myRole);
      const won = myGoals > theirGoals;
      const tie = myGoals === theirGoals;
      const rewardCoins = won ? 100 : tie ? 50 : 25;
      addCoins(rewardCoins);
      if (won) sound.playVictory();
      sound.playCoinEarn();
    }
  }, [state.phase, myRole, state]);

  // Handle Nickname Setup completion
  const onSavedIdentity = async (newId: PlayerIdentity) => {
    setIdentity(newId);
    try {
      const selectedCup = readJSON<string>(LS_KEYS.selectedCupPack) ?? "copa-90";
      const updated = await joinRoomFn({
        data: {
          code,
          playerId: newId.playerId,
          nickname: newId.nickname,
          avatar: newId.avatar,
          cupPack: selectedCup,
        },
      });
      setRoom(updated);
    } catch (err) {
      setLoadingErr(err instanceof Error ? err.message : "Falha ao entrar");
    }
  };

  if (!identityChecked) {
    return <Shell><div className="font-arcade text-sm">CARREGANDO...</div></Shell>;
  }

  if (!identity) {
    return (
      <NicknameSetup
        onDone={onSavedIdentity}
        onCancel={() => navigate({ to: "/" })}
      />
    );
  }

  if (loadingErr) {
    return (
      <Shell>
        <div className="text-center space-y-4">
          <div className="font-arcade text-sm text-arcade-red">{loadingErr}</div>
          <Link
            to="/"
            className="inline-block font-arcade text-xs bg-arcade-yellow text-arcade-dark border-2 border-arcade-dark px-4 py-2"
          >
            VOLTAR AO MENU
          </Link>
        </div>
      </Shell>
    );
  }

  if (!room || !myRole || !myDeck) {
    return <Shell><div className="font-arcade text-sm animate-pulse">CARREGANDO SALA...</div></Shell>;
  }

  const currentPos = POSITIONS[state.posIdx];
  const posAttrs = attrsForCurrentPos(state);

  const myHand = myDeck.filter((c) => c.position === currentPos);
  const myCard = selfCard(state, myRole);
  const theirCard = oppCard(state, myRole);
  const myUsed = selfUsedIds(state, myRole);
  const myPoints = selfPosScore(state, myRole);
  const oppPoints = oppPosScore(state, myRole);
  const myScore = selfGoals(state, myRole);
  const oppScore = oppGoals(state, myRole);
  const amReady = selfReady(state, myRole);
  const isOppReady = oppReady(state, myRole);

  const myTrapsList = selfTraps(state, myRole);
  const oppTrapsList = oppTraps(state, myRole);
  const myPlayedTrap = selfTrapPlayed(state, myRole);
  const oppPlayedTrap = oppTrapPlayed(state, myRole);

  const isMyTurnToPickAttr = state.chooser === myRole;

  // Render Waiting Screen
  if (state.phase === "WAITING") {
    return (
      <Shell>
        <div className="text-center space-y-4 max-w-md mx-auto">
          <div className="font-arcade text-xs text-arcade-yellow">SALA CRIADA COM SUCESSO!</div>
          <div className="bg-arcade-yellow text-arcade-dark border-4 border-arcade-dark p-6 rounded-md shadow-arcade">
            <div className="font-arcade text-xs mb-1">CÓDIGO DA SALA:</div>
            <div className="font-arcade text-4xl tracking-widest my-2">{room.code}</div>
            <div className="font-body text-xs text-arcade-dark/80">
              Passe este código para o seu adversário entrar.
            </div>
          </div>
          <div className="font-arcade text-[10px] text-arcade-cream animate-pulse">
            AGUARDANDO O ADVERSÁRIO CONECTAR...
          </div>
          <Link
            to="/"
            className="inline-block font-arcade text-xs bg-arcade-cream text-arcade-dark border-2 border-arcade-dark px-4 py-2 hover:bg-arcade-red hover:text-arcade-cream"
          >
            CANCELAR E VOLTAR
          </Link>
        </div>
      </Shell>
    );
  }

  // Active Game Board
  return (
    <div className="min-h-screen bg-arcade-blue flex flex-col relative pb-16">
      <EmojiReactions
        myRole={myRole}
        reactions={state.reactions}
        onSendReaction={(emoji) => emit({ kind: "SEND_REACTION", side: myRole, emoji })}
      />

      <EventToast text={toast?.text ?? null} color={toast?.color} />

      {/* Top Header */}
      <header className="bg-arcade-green py-2 px-4 border-b-4 border-arcade-dark flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <img
              src={avatarUrl(myInfo?.avatar ?? "av1")}
              alt={myInfo?.nickname}
              className="w-7 h-7 rounded-full border border-arcade-dark bg-arcade-cream"
            />
            <span className="font-arcade text-[10px] text-arcade-cream max-w-[100px] truncate">
              {myInfo?.nickname}
            </span>
          </div>
          <div className="font-display text-2xl text-arcade-yellow">
            {myScore} × {oppScore}
          </div>
          <div className="flex items-center gap-1.5">
            <img
              src={avatarUrl(oppInfo?.avatar ?? "av1")}
              alt={oppInfo?.nickname}
              className="w-7 h-7 rounded-full border border-arcade-dark bg-arcade-cream"
            />
            <span className="font-arcade text-[10px] text-arcade-cream max-w-[100px] truncate">
              {oppInfo?.nickname}
            </span>
          </div>
        </div>

        <div className="font-arcade text-xs text-arcade-yellow">
          {POSITION_LABELS[currentPos]} · {myPoints} × {oppPoints}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleSound}
            className="font-arcade text-[9px] px-2 py-1 bg-arcade-cream text-arcade-dark border border-arcade-dark hover:bg-arcade-yellow"
          >
            {muted ? "🔇 SOM: OFF" : "🔊 SOM: ON"}
          </button>
          <Link
            to="/"
            onClick={() => confirm("Deseja mesmo sair da partida?")}
            className="font-arcade text-[9px] px-2 py-1 bg-arcade-red text-arcade-cream border border-arcade-dark"
          >
            SAIR
          </Link>
        </div>
      </header>

      {/* Main Arena */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
        <div className="flex items-start gap-4 md:gap-10 flex-wrap justify-center">
          {/* Opponent Card */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="font-arcade text-[9px] text-arcade-cream">
              {oppInfo?.nickname}
            </div>
            <CardView
              card={theirCard ?? undefined}
              faceDown={
                !theirCard ||
                state.phase === "SELECT_CARD" ||
                state.phase === "PICK_ATTR"
              }
              highlightAttr={state.chosenAttr}
            />
            <TrapSlotIndicator
              label="TRAPS ADVERSÁRIO"
              traps={oppTrapsList}
              playedTrap={oppPlayedTrap}
            />
          </div>

          {/* Center Battle / Action Zone */}
          <div className="min-w-[280px] max-w-md flex flex-col items-center justify-center gap-3">
            {/* Par ou Ímpar Minigame */}
            {state.phase === "PARITY" && (
              <ParityPanel
                myRole={myRole}
                hostChoice={state.hostParityChoice}
                myNumber={selfParityNumber(state, myRole)}
                onChooseParity={(p) => emit({ kind: "PICK_PARITY_CHOICE", side: myRole, parity: p })}
                onChooseNumber={(n) => emit({ kind: "PICK_PARITY_NUMBER", side: myRole, number: n })}
              />
            )}

            {/* Parity Reveal */}
            {state.phase === "PARITY_REVEAL" && (
              <div className="text-center bg-arcade-dark/90 border-2 border-arcade-yellow rounded-md p-4 w-full shadow-arcade">
                <div className="font-arcade text-[10px] text-arcade-yellow mb-1">
                  PAR OU ÍMPAR — RESULTADO
                </div>
                <div className="font-display text-4xl text-arcade-cream my-1">
                  {state.hostParityNumber} + {state.guestParityNumber} = {state.paritySum}
                </div>
                <div className="font-arcade text-xs text-arcade-green mb-3">
                  DEU {state.paritySum! % 2 === 0 ? "PAR" : "ÍMPAR"}! VENCEDOR:{" "}
                  {state.parityWinner === myRole ? "VOCÊ" : oppInfo?.nickname}
                </div>
                <MPContinueButton
                  amReady={amReady}
                  isOppReady={isOppReady}
                  onClick={() => emit({ kind: "READY_CONTINUE", side: myRole })}
                />
              </div>
            )}

            {/* Card Selection Hint */}
            {state.phase === "SELECT_CARD" && (
              <div className="bg-arcade-cream text-arcade-dark border-4 border-arcade-dark rounded-md p-4 shadow-arcade text-center max-w-xs">
                <div className="font-arcade text-xs text-arcade-red mb-1">
                  ESCOLHA SUA CARTA
                </div>
                <div className="font-body text-xs mb-2">
                  Clique em uma das 3 cartas da sua mão abaixo.
                </div>
                {myCard ? (
                  <div className="font-arcade text-[9px] text-arcade-green animate-pulse">
                    ✓ CARTA ESCOLHIDA! AGUARDANDO ADVERSÁRIO...
                  </div>
                ) : (
                  <div className="font-arcade text-[9px] text-arcade-dark/70">
                    {isMyTurnToPickAttr
                      ? "Você escolherá o atributo"
                      : "O adversário escolherá o atributo"}
                  </div>
                )}
              </div>
            )}

            {/* Pick Attribute */}
            {state.phase === "PICK_ATTR" && (
              <AttributeChoice
                position={currentPos}
                chooser={isMyTurnToPickAttr ? "P" : "AI"}
                onPick={(attr) => emit({ kind: "PICK_ATTR", side: myRole, attr })}
              />
            )}

            {/* Announce Attr & Trap Window */}
            {state.phase === "ANNOUNCE_ATTR" && state.chosenAttr && (
              <MPTrapAnnounce
                chosenAttr={state.chosenAttr}
                chooser={state.chooser}
                myRole={myRole}
                pos={currentPos}
                myTraps={myTrapsList}
                myTrapPlayed={myPlayedTrap}
                oppTrapPlayed={oppPlayedTrap}
                myTrapSkipped={myRole === "HOST" ? state.hostTrapSkipped : state.guestTrapSkipped}
                oppTrapSkipped={myRole === "HOST" ? state.guestTrapSkipped : state.hostTrapSkipped}
                onPlayTrap={(trap) => emit({ kind: "PLAY_TRAP", side: myRole, trap })}
                onSkipTrap={() => emit({ kind: "SKIP_TRAP", side: myRole })}
              />
            )}

            {/* Trap Announce Transient */}
            {state.phase === "TRAP_ANNOUNCE" && (
              <div className="text-center bg-arcade-dark/90 border-2 border-arcade-yellow rounded-md p-4 w-full shadow-arcade">
                <div className="font-arcade text-xs text-arcade-yellow mb-1">
                  {state.trapAnnounceFor === myRole ? "VOCÊ BAIXOU TRAP!" : "ADVERSÁRIO BAIXOU TRAP!"}
                </div>
                <div className="font-arcade text-lg text-arcade-cream my-2">
                  {TRAP_LABELS[(state.trapAnnounceFor === "HOST" ? state.hostTrapPlayed : state.guestTrapPlayed) ?? "AMARELO"]}
                </div>
                <MPContinueButton
                  amReady={amReady}
                  isOppReady={isOppReady}
                  onClick={() => emit({ kind: "READY_CONTINUE", side: myRole })}
                />
              </div>
            )}

            {/* Penalty Shootout */}
            {state.phase === "PENALTY" && (
              <MPPenaltyShootout
                myRole={myRole}
                kickerSide={state.hostTrapPlayed === "PENALTI" ? "HOST" : "GUEST"}
                myPenaltyDir={myRole === "HOST" ? state.hostPenaltyDir : state.guestPenaltyDir}
                onPickDir={(dir) => emit({ kind: "PICK_PENALTY_DIR", side: myRole, dir })}
              />
            )}

            {/* Penalty Result */}
            {state.phase === "PENALTY_RESULT" && state.penaltyResult && (
              <div className="text-center bg-arcade-dark/90 border-2 border-arcade-yellow rounded-md p-4 w-full shadow-arcade">
                <div className="font-arcade text-xs text-arcade-yellow mb-1">
                  RESULTADO DO PÊNALTI
                </div>
                <div className="font-display text-4xl text-arcade-cream my-2">
                  {state.penaltyResult.result === "GOL" ? "⚽ GOOOL!" : "🧤 DEFENDEU!"}
                </div>
                <div className="font-body text-xs text-arcade-cream mb-3">
                  Chute no canto {state.penaltyResult.kickerDir} × Pulo no canto {state.penaltyResult.goalieDir}
                </div>
                <MPContinueButton
                  amReady={amReady}
                  isOppReady={isOppReady}
                  onClick={() => emit({ kind: "READY_CONTINUE", side: myRole })}
                />
              </div>
            )}

            {/* Duel Reveal */}
            {state.phase === "REVEAL" && state.lastLog && state.chosenAttr && (
              <div className="text-center bg-arcade-dark/90 border-2 border-arcade-yellow rounded-md p-4 w-full shadow-arcade">
                <div className="font-arcade text-[10px] text-arcade-yellow mb-1">
                  {ATTR_LABELS[state.chosenAttr]}
                </div>
                <div className="font-display text-4xl text-arcade-cream my-1">
                  {myRole === "HOST" ? state.lastLog.pValue : state.lastLog.aiValue} ×{" "}
                  {myRole === "HOST" ? state.lastLog.aiValue : state.lastLog.pValue}
                </div>
                <div className="font-arcade text-[9px] text-arcade-yellow mb-2">
                  VOCÊ × ADVERSÁRIO
                </div>
                <div
                  className={`font-arcade text-sm ${
                    state.lastLog.winner === (myRole === "HOST" ? "P" : "AI")
                      ? "text-arcade-green"
                      : state.lastLog.winner === "DRAW"
                        ? "text-arcade-yellow"
                        : "text-arcade-red"
                  }`}
                >
                  {state.lastLog.winner === (myRole === "HOST" ? "P" : "AI")
                    ? "PONTO SEU!"
                    : state.lastLog.winner === "DRAW"
                      ? "EMPATE!"
                      : "PONTO DO ADVERSÁRIO!"}
                </div>
                {state.lastLog.trapEffect && (
                  <div className="mt-2 font-body text-[11px] text-arcade-cream bg-arcade-dark/60 border border-arcade-yellow px-2 py-1">
                    {state.lastLog.trapEffect}
                  </div>
                )}
                <div className="mt-3">
                  <MPContinueButton
                    amReady={amReady}
                    isOppReady={isOppReady}
                    onClick={() => emit({ kind: "READY_CONTINUE", side: myRole })}
                  />
                </div>
              </div>
            )}

            {/* Position End */}
            {state.phase === "POS_END" && (
              <div className="text-center bg-arcade-dark/90 border-2 border-arcade-yellow rounded-md p-4 w-full shadow-arcade">
                <div className="font-arcade text-[10px] text-arcade-yellow mb-1">
                  FIM DA POSIÇÃO — {POSITION_LABELS[currentPos]}
                </div>
                <div className="font-display text-4xl text-arcade-cream my-2">
                  {myPoints} × {oppPoints}
                </div>
                <div
                  className={`font-arcade text-sm mb-3 ${
                    myPoints > oppPoints
                      ? "text-arcade-green"
                      : myPoints === oppPoints
                        ? "text-arcade-yellow"
                        : "text-arcade-red"
                  }`}
                >
                  {myPoints > oppPoints
                    ? "GOL SEU!"
                    : myPoints === oppPoints
                      ? "POSIÇÃO EMPATADA!"
                      : "GOL DO ADVERSÁRIO!"}
                </div>

                {/* Traps Sweep Rewards */}
                {(state.lastReward.host || state.lastReward.guest) && (
                  <div className="my-2 p-2 bg-arcade-yellow text-arcade-dark font-arcade text-[9px] border border-arcade-dark">
                    TRAP EXTRA CONQUISTADA POR GOLEADA (2x0)!
                  </div>
                )}

                <MPContinueButton
                  amReady={amReady}
                  isOppReady={isOppReady}
                  onClick={() => emit({ kind: "READY_CONTINUE", side: myRole })}
                />
              </div>
            )}

            {/* Game End */}
            {state.phase === "GAME_END" && (
              <div className="text-center bg-arcade-dark/90 border-4 border-arcade-yellow rounded-md p-5 w-full shadow-arcade">
                <div className="font-arcade text-xs text-arcade-yellow mb-2">
                  FIM DE JOGO
                </div>
                <div className="font-display text-5xl text-arcade-cream my-2">
                  {myScore} × {oppScore}
                </div>
                <div
                  className={`font-arcade text-lg my-2 ${
                    myScore > oppScore
                      ? "text-arcade-green"
                      : myScore === oppScore
                        ? "text-arcade-yellow"
                        : "text-arcade-red"
                  }`}
                >
                  {myScore > oppScore
                    ? "VOCÊ É O CAMPEÃO! 🏆"
                    : myScore === oppScore
                      ? "EMPATE FINAL!"
                      : "ADVERSÁRIO VENCEU!"}
                </div>
                <Link
                  to="/"
                  className="inline-block mt-4 font-arcade text-xs bg-arcade-yellow text-arcade-dark border-2 border-arcade-dark px-6 py-3 hover:bg-arcade-green hover:text-arcade-cream"
                >
                  VOLTAR AO MENU PRINCIPAL
                </Link>
              </div>
            )}
          </div>

          {/* Self Card */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="font-arcade text-[9px] text-arcade-cream">
              VOCÊ ({myInfo?.nickname})
            </div>
            <CardView
              card={myCard ?? undefined}
              faceDown={!myCard}
              highlightAttr={state.chosenAttr}
            />
            <TrapSlotIndicator
              label="SUAS TRAPS"
              traps={myTrapsList}
              playedTrap={myPlayedTrap}
            />
          </div>
        </div>

        {/* Player Hand Drawer */}
        <div className="mt-2 w-full max-w-2xl">
          <div className="font-arcade text-[10px] text-arcade-cream text-center mb-2">
            SUA MÃO — {POSITION_LABELS[currentPos]}
            {state.phase === "SELECT_CARD" && !myCard && (
              <span className="ml-2 text-arcade-yellow animate-pulse">
                ← ESCOLHA UMA CARTA
              </span>
            )}
          </div>
          <div className="flex gap-3 justify-center flex-wrap">
            {myHand.map((c) => {
              const used = myUsed.includes(c.id);
              const isCurrent = myCard?.id === c.id;
              const isSelectable = state.phase === "SELECT_CARD" && !used && !myCard;
              return (
                <div
                  key={c.id}
                  className={`${used ? "opacity-30" : ""} ${
                    isSelectable ? "ring-4 ring-arcade-yellow rounded-md animate-pulse" : ""
                  }`}
                >
                  <CardView
                    card={c}
                    small
                    selected={isCurrent}
                    highlightAttr={isCurrent ? state.chosenAttr : null}
                    onClick={
                      isSelectable
                        ? () => emit({ kind: "SELECT_CARD", side: myRole, card: c })
                        : undefined
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-arcade-blue flex items-center justify-center p-4">
      <div className="bg-arcade-cream text-arcade-dark border-4 border-arcade-dark shadow-arcade p-6 rounded-md w-full max-w-lg">
        {children}
      </div>
    </div>
  );
}

function TrapSlotIndicator({
  label,
  traps,
  playedTrap,
}: {
  label: string;
  traps: Trap[];
  playedTrap: Trap | null;
}) {
  const TRAP_ICON: Record<Trap, string> = {
    AMARELO: "🟨",
    IMPEDIMENTO: "🚩",
    PENALTI: "⚽",
  };
  return (
    <div className="min-h-[36px] flex flex-col items-center gap-1 mt-1">
      {playedTrap ? (
        <div className="font-arcade text-[8px] bg-arcade-yellow text-arcade-dark px-2 py-0.5 border border-arcade-dark">
          TRAP: {TRAP_LABELS[playedTrap]}
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <span className="font-arcade text-[8px] text-arcade-cream/80">{label}</span>
          <div className="flex gap-1">
            {traps.length === 0 ? (
              <span className="font-arcade text-[8px] text-arcade-cream/40">—</span>
            ) : (
              traps.map((t, i) => (
                <span key={i} title={TRAP_LABELS[t]} className="text-xs">
                  {TRAP_ICON[t]}
                </span>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ParityPanel({
  myRole,
  hostChoice,
  myNumber,
  onChooseParity,
  onChooseNumber,
}: {
  myRole: MPSide;
  hostChoice: Parity | null;
  myNumber: number | null;
  onChooseParity: (p: Parity) => void;
  onChooseNumber: (n: number) => void;
}) {
  const isHost = myRole === "HOST";

  if (isHost && !hostChoice) {
    return (
      <div className="text-center bg-arcade-dark/90 border-2 border-arcade-yellow rounded-md p-4 w-full shadow-arcade">
        <div className="font-arcade text-xs text-arcade-yellow mb-2">
          PAR OU ÍMPAR — ESCOLHA:
        </div>
        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={() => onChooseParity("PAR")}
            className="font-arcade text-xs px-5 py-3 bg-arcade-yellow text-arcade-dark border-2 border-arcade-dark hover:bg-arcade-green hover:text-arcade-cream"
          >
            PAR
          </button>
          <button
            type="button"
            onClick={() => onChooseParity("IMPAR")}
            className="font-arcade text-xs px-5 py-3 bg-arcade-yellow text-arcade-dark border-2 border-arcade-dark hover:bg-arcade-green hover:text-arcade-cream"
          >
            ÍMPAR
          </button>
        </div>
      </div>
    );
  }

  if (!isHost && !hostChoice) {
    return (
      <div className="text-center bg-arcade-dark/90 border-2 border-arcade-yellow rounded-md p-4 w-full shadow-arcade">
        <div className="font-arcade text-xs text-arcade-yellow animate-pulse">
          AGUARDANDO O HOST ESCOLHER PAR OU ÍMPAR...
        </div>
      </div>
    );
  }

  return (
    <div className="text-center bg-arcade-dark/90 border-2 border-arcade-yellow rounded-md p-4 w-full shadow-arcade">
      <div className="font-arcade text-[10px] text-arcade-yellow mb-1">
        HOST FICOU COM: <b>{hostChoice}</b> (VOCÊ É{" "}
        <b>{isHost ? hostChoice : hostChoice === "PAR" ? "ÍMPAR" : "PAR"}</b>)
      </div>
      <div className="font-arcade text-xs text-arcade-cream my-2">
        COLOQUE DE 0 A 5 DEDOS:
      </div>
      {myNumber == null ? (
        <div className="flex gap-1.5 justify-center flex-wrap">
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChooseNumber(n)}
              className="font-arcade text-sm w-10 h-10 bg-arcade-yellow text-arcade-dark border-2 border-arcade-dark hover:bg-arcade-green hover:text-arcade-cream"
            >
              {n}
            </button>
          ))}
        </div>
      ) : (
        <div className="font-arcade text-xs text-arcade-green animate-pulse">
          VOCÊ COLOCOU {myNumber}! AGUARDANDO ADVERSÁRIO...
        </div>
      )}
    </div>
  );
}

function MPContinueButton({
  amReady,
  isOppReady,
  onClick,
}: {
  amReady: boolean;
  isOppReady: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        disabled={amReady}
        onClick={onClick}
        className="font-arcade text-xs px-6 py-3 bg-arcade-yellow text-arcade-dark border-2 border-arcade-dark hover:bg-arcade-cream disabled:opacity-50 disabled:cursor-not-allowed shadow-arcade"
      >
        {amReady ? "✓ PRONTO! AGUARDANDO..." : "CONTINUAR ▶"}
      </button>
      {isOppReady && (
        <span className="font-arcade text-[8px] text-arcade-green">
          Adversário já clicou em continuar!
        </span>
      )}
    </div>
  );
}
