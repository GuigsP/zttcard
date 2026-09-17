import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { createRoom, joinRoom } from "@/lib/rooms.functions";
import { readIdentity, type PlayerIdentity } from "../storage";
import { NicknameSetup } from "./NicknameSetup";
import { avatarUrl } from "./avatars";
import { CUP_PACKS, getPackTheme } from "../packThemes";

type Props = {
  onBack: () => void;
};

export function MatchmakingScreen({ onBack }: Props) {
  const navigate = useNavigate();
  const [identity, setIdentity] = useState<PlayerIdentity | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [cupPack, setCupPack] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const createFn = useServerFn(createRoom);
  const joinFn = useServerFn(joinRoom);

  useEffect(() => {
    const id = readIdentity();
    if (id) setIdentity(id);
    else setShowSetup(true);
  }, []);

  const onCreate = useCallback(async () => {
    if (!identity || busy || !cupPack) return;
    setBusy(true);
    setErr(null);
    try {
      const room = await createFn({
        data: {
          playerId: identity.playerId,
          nickname: identity.nickname,
          avatar: identity.avatar,
          cupPack,
        },
      });
      navigate({ to: "/play/$code", params: { code: room.code } });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Falha ao criar sala");
    } finally {
      setBusy(false);
    }
  }, [identity, busy, cupPack, createFn, navigate]);

  const onJoin = useCallback(async () => {
    if (!identity || busy || !cupPack) return;
    const clean = code.trim().toUpperCase();
    if (clean.length !== 5) {
      setErr("CÓDIGO PRECISA TER 5 LETRAS");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await joinFn({
        data: {
          code: clean,
          playerId: identity.playerId,
          nickname: identity.nickname,
          avatar: identity.avatar,
          cupPack,
        },
      });
      navigate({ to: "/play/$code", params: { code: clean } });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Falha ao entrar na sala");
    } finally {
      setBusy(false);
    }
  }, [identity, busy, code, cupPack, joinFn, navigate]);

  if (showSetup) {
    return (
      <NicknameSetup
        initial={identity}
        onDone={(id) => {
          setIdentity(id);
          setShowSetup(false);
        }}
        onCancel={identity ? () => setShowSetup(false) : onBack}
      />
    );
  }

  if (!identity) return null;

  const chosenTheme = cupPack ? getPackTheme(cupPack) : null;

  return (
    <div className="min-h-screen bg-arcade-blue flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-lg flex items-center justify-between mb-6">
        <button
          onClick={step === 2 ? () => setStep(1) : onBack}
          className="font-arcade text-[10px] px-3 py-2 bg-arcade-dark text-arcade-yellow border-2 border-arcade-yellow hover:bg-arcade-red"
        >
          ← VOLTAR
        </button>
        <div className="flex items-center gap-2 bg-arcade-cream border-2 border-arcade-dark rounded px-2 py-1">
          <img
            src={avatarUrl(identity.avatar)}
            alt=""
            className="w-8 h-8 object-contain"
          />
          <span className="font-arcade text-[10px] text-arcade-dark">
            {identity.nickname}
          </span>
          <button
            onClick={() => setShowSetup(true)}
            className="font-arcade text-[9px] px-2 py-1 bg-arcade-yellow text-arcade-dark border border-arcade-dark hover:bg-arcade-red hover:text-arcade-cream"
          >
            TROCAR
          </button>
        </div>
      </div>

      <div className="font-arcade text-2xl text-arcade-yellow mb-2 text-center drop-shadow-[3px_3px_0_var(--arcade-dark)]">
        JOGAR vs HUMANO
      </div>
      <div className="font-arcade text-[10px] text-arcade-cream/80 mb-6 text-center">
        PASSO {step}/2 — {step === 1 ? "ESCOLHA SUA COPA" : "CRIAR OU ENTRAR NA SALA"}
      </div>

      {step === 1 && (
        <div className="w-full max-w-2xl flex flex-col items-center">
          <div className="font-body text-sm text-arcade-cream mb-6 text-center max-w-md">
            Cada jogador tem <b className="text-arcade-yellow">FUNDADOR</b> + a Copa
            escolhida. Você pode escolher uma copa diferente do seu adversário.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl mb-8">
            {CUP_PACKS.map((t) => {
              const selected = cupPack === t.slug;
              return (
                <button
                  key={t.slug}
                  onClick={() => setCupPack(t.slug)}
                  style={{
                    borderColor: selected ? "#ffd60a" : t.border,
                    backgroundColor: t.topBg,
                    color: t.topFg,
                  }}
                  className={`border-4 shadow-arcade p-6 flex flex-col items-center gap-3 transition-transform ${
                    selected ? "scale-105 ring-4 ring-arcade-yellow" : "hover:-translate-y-1"
                  }`}
                >
                  <div
                    className="font-arcade text-4xl leading-none px-3 py-2 rounded"
                    style={{ backgroundColor: t.topFg, color: t.border }}
                  >
                    {t.badge}
                  </div>
                  <div
                    className="text-2xl leading-none tracking-wider"
                    style={{ fontFamily: t.nameFont }}
                  >
                    {t.label}
                  </div>
                  {selected && (
                    <div className="font-arcade text-[10px] bg-arcade-yellow text-arcade-dark px-2 py-1 border-2 border-arcade-dark">
                      ✓ SELECIONADA
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => cupPack && setStep(2)}
            disabled={!cupPack}
            className="font-arcade text-lg px-8 py-4 bg-arcade-red text-arcade-cream border-4 border-arcade-dark hover:bg-arcade-dark disabled:opacity-40 disabled:cursor-not-allowed"
          >
            PRÓXIMO →
          </button>
          {!cupPack && (
            <div className="font-arcade text-[10px] text-arcade-yellow/80 mt-3">
              ESCOLHA UMA COPA PARA CONTINUAR
            </div>
          )}
        </div>
      )}

      {step === 2 && chosenTheme && (
        <div className="w-full max-w-2xl flex flex-col items-center">
          <div
            className="w-full max-w-md border-4 shadow-arcade p-3 mb-6 flex items-center gap-3"
            style={{
              borderColor: chosenTheme.border,
              backgroundColor: chosenTheme.topBg,
              color: chosenTheme.topFg,
            }}
          >
            <div
              className="font-arcade text-2xl px-2 py-1 rounded"
              style={{ backgroundColor: chosenTheme.topFg, color: chosenTheme.border }}
            >
              {chosenTheme.badge}
            </div>
            <div className="flex-1">
              <div className="font-arcade text-[9px] opacity-80">SUA COPA</div>
              <div className="text-lg tracking-wider" style={{ fontFamily: chosenTheme.nameFont }}>
                {chosenTheme.label}
              </div>
            </div>
            <button
              onClick={() => setStep(1)}
              className="font-arcade text-[10px] px-3 py-2 bg-arcade-cream text-arcade-dark border-2 border-arcade-dark hover:bg-arcade-yellow"
            >
              ← TROCAR
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            {/* Create */}
            <div className="bg-arcade-cream text-arcade-dark border-4 border-arcade-dark shadow-arcade p-5 flex flex-col gap-3">
              <div className="font-arcade text-lg text-arcade-red">CRIAR SALA</div>
              <div className="font-body text-xs">
                Gera um código e um link. Envia pra quem você quer desafiar.
              </div>
              <button
                onClick={onCreate}
                disabled={busy}
                className="font-arcade text-sm px-4 py-3 bg-arcade-red text-arcade-cream border-2 border-arcade-dark hover:bg-arcade-dark disabled:opacity-50"
              >
                {busy ? "CRIANDO..." : "CRIAR SALA"}
              </button>
            </div>

            {/* Join */}
            <div className="bg-arcade-cream text-arcade-dark border-4 border-arcade-dark shadow-arcade p-5 flex flex-col gap-3">
              <div className="font-arcade text-lg text-arcade-green">ENTRAR</div>
              <div className="font-body text-xs">
                Cola o código que seu amigo enviou.
              </div>
              <input
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5));
                  setErr(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && onJoin()}
                placeholder="AAAAA"
                className="w-full font-arcade text-xl text-center px-3 py-3 bg-arcade-cream text-arcade-dark border-4 border-arcade-dark focus:border-arcade-green outline-none tracking-[0.5em]"
                maxLength={5}
              />
              <button
                onClick={onJoin}
                disabled={busy || code.length !== 5}
                className="font-arcade text-sm px-4 py-3 bg-arcade-green text-arcade-cream border-2 border-arcade-dark hover:bg-arcade-dark disabled:opacity-50"
              >
                {busy ? "ENTRANDO..." : "ENTRAR NA SALA"}
              </button>
            </div>
          </div>

          {err && (
            <div className="mt-5 font-arcade text-xs bg-arcade-red text-arcade-cream border-2 border-arcade-dark px-4 py-2">
              {err}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper to preview theme (unused but kept for API parity)
export function _packTheme(slug: string) {
  return getPackTheme(slug);
}
