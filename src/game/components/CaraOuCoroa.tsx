import { useState } from "react";
import { sound } from "../audio";

type Props = {
  onDone: (winner: "P" | "AI", detail: string) => void;
};

type Choice = "CARA" | "COROA";
type Step = "SELECT" | "FLIPPING" | "RESULT";

export function CaraOuCoroa({ onDone }: Props) {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [step, setStep] = useState<Step>("SELECT");
  const [coinResult, setCoinResult] = useState<Choice | null>(null);
  const [winner, setWinner] = useState<"P" | "AI" | null>(null);
  const [flipDegree, setFlipDegree] = useState(0);

  const btnBase =
    "font-arcade border-2 border-arcade-dark transition-all disabled:opacity-40 cursor-pointer";

  const handleFlip = () => {
    if (!choice || step !== "SELECT") return;

    sound.playWhistle();
    setTimeout(() => sound.playCoinEarn(), 150);

    setStep("FLIPPING");

    // Random coin result: CARA or COROA
    const isCara = Math.random() >= 0.5;
    const result: Choice = isCara ? "CARA" : "COROA";
    setCoinResult(result);

    const playerWon = choice === result;
    const wonSide: "P" | "AI" = playerWon ? "P" : "AI";
    setWinner(wonSide);

    // Spin animation: multiple 360 rotations + final face
    const totalSpins = 5 * 360 + (isCara ? 0 : 180);
    setFlipDegree(totalSpins);

    setTimeout(() => {
      setStep("RESULT");
      if (playerWon) {
        sound.playGoal();
      } else {
        sound.playPointLost();
      }
    }, 1100);
  };

  const handleConfirm = () => {
    if (!winner || !choice || !coinResult) return;
    const detail = `VOCÊ ESCOLHEU: ${choice} · RESULTADO DA MOEDA: ${coinResult} (${winner === "P" ? "VOCÊ VENCEU" : "IA VENCEU"})`;
    onDone(winner, detail);
  };

  return (
    <div className="bg-gradient-to-b from-slate-900/95 via-slate-950 to-slate-900/95 text-arcade-cream border-3 border-arcade-yellow rounded-2xl p-5 shadow-2xl backdrop-blur-md max-w-md mx-auto select-none relative overflow-hidden">
      {/* Luz dourada de estádio no topo */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-arcade-yellow to-transparent opacity-80" />
      {/* Cabeçalho */}
      <div className="font-arcade text-xs text-arcade-yellow mb-3 text-center border-b border-arcade-yellow/30 pb-2 flex items-center justify-center gap-1.5">
        <span>🪙</span>
        <span>CARA OU COROA — SORTEIO DO JUIZ</span>
      </div>

      {step === "SELECT" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="text-center font-arcade text-[10px] text-arcade-cream/80">
            O JUIZ VAI JOGAR A MOEDA. FAÇA SUA ESCOLHA:
          </div>

          {/* Botões de Escolha: CARA ou COROA */}
          <div className="grid grid-cols-2 gap-3">
            {/* CARA */}
            <button
              type="button"
              onClick={() => {
                sound.playCardFlip();
                setChoice("CARA");
              }}
              className={`${btnBase} p-3 rounded-xl flex flex-col items-center gap-1.5 transition-all ${
                choice === "CARA"
                  ? "bg-gradient-to-b from-arcade-yellow to-amber-500 text-arcade-dark border-arcade-cream shadow-[0_0_15px_rgba(255,204,0,0.6)] scale-105"
                  : "bg-black/50 text-arcade-cream hover:bg-black/80 border-arcade-yellow/40 hover:border-arcade-yellow"
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 border-2 border-arcade-cream flex items-center justify-center text-2xl shadow-md">
                👤
              </div>
              <div className="font-arcade text-xs font-black">CARA</div>
              <div className="font-body text-[9px] opacity-80">
                (Capitão / Rosto)
              </div>
            </button>

            {/* COROA */}
            <button
              type="button"
              onClick={() => {
                sound.playCardFlip();
                setChoice("COROA");
              }}
              className={`${btnBase} p-3 rounded-xl flex flex-col items-center gap-1.5 transition-all ${
                choice === "COROA"
                  ? "bg-gradient-to-b from-arcade-yellow to-amber-500 text-arcade-dark border-arcade-cream shadow-[0_0_15px_rgba(255,204,0,0.6)] scale-105"
                  : "bg-black/50 text-arcade-cream hover:bg-black/80 border-arcade-yellow/40 hover:border-arcade-yellow"
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 border-2 border-arcade-cream flex items-center justify-center text-2xl shadow-md">
                👑
              </div>
              <div className="font-arcade text-xs font-black">COROA</div>
              <div className="font-body text-[9px] opacity-80">
                (Símbolo / Taça)
              </div>
            </button>
          </div>

          <button
            type="button"
            onClick={handleFlip}
            disabled={choice == null}
            className="w-full font-arcade text-xs py-3 rounded-xl bg-gradient-to-r from-arcade-yellow via-amber-400 to-amber-500 text-arcade-dark font-black border-2 border-arcade-cream disabled:opacity-40 hover:brightness-110 shadow-lg cursor-pointer active:scale-95 transition-all mt-2"
          >
            JOGAR A MOEDA PRO ALTO ⚽
          </button>
        </div>
      )}

      {step === "FLIPPING" && (
        <div className="py-8 flex flex-col items-center justify-center space-y-4">
          <div className="font-arcade text-[10px] text-arcade-yellow animate-pulse">
            O JUIZ JOGOU A MOEDA NO AR...
          </div>

          {/* Moeda 3D Girando */}
          <div className="w-20 h-20 relative [perspective:600px]">
            <div
              className="w-full h-full rounded-full border-4 border-amber-300 bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-500 flex items-center justify-center text-4xl shadow-[0_0_20px_rgba(255,204,0,0.6)] transition-transform duration-1000 ease-out"
              style={{
                transform: `rotateY(${flipDegree}deg)`,
                transformStyle: "preserve-3d",
              }}
            >
              🪙
            </div>
          </div>

          <div className="font-arcade text-[9px] text-arcade-cream/80">
            Você escolheu: <span className="font-bold text-arcade-yellow">{choice}</span>
          </div>
        </div>
      )}

      {step === "RESULT" && winner && choice && coinResult && (
        <div className="space-y-3.5 animate-in fade-in zoom-in-95 duration-200">
          {/* Moeda Vencedora em Destaque */}
          <div className="flex flex-col items-center justify-center py-2">
            <div className="w-16 h-16 rounded-full border-3 border-arcade-cream bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-3xl shadow-[0_0_15px_rgba(255,204,0,0.6)] animate-bounce">
              {coinResult === "CARA" ? "👤" : "👑"}
            </div>
            <div className="font-arcade text-sm text-arcade-yellow mt-2 font-black">
              DEU {coinResult}!
            </div>
          </div>

          {/* Comparativo: Sua Escolha vs Moeda */}
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-black/60 border border-arcade-yellow/40 p-2 rounded-xl">
              <div className="font-arcade text-[8px] text-arcade-cream/70">
                SUA ESCOLHA
              </div>
              <div className="font-arcade text-xs font-bold text-arcade-yellow mt-0.5">
                {choice === "CARA" ? "👤 CARA" : "👑 COROA"}
              </div>
            </div>

            <div className="bg-black/60 border border-cyan-400/40 p-2 rounded-xl">
              <div className="font-arcade text-[8px] text-arcade-cream/70">
                MOEDA DO JUIZ
              </div>
              <div className="font-arcade text-xs font-bold text-cyan-300 mt-0.5">
                {coinResult === "CARA" ? "👤 CARA" : "👑 COROA"}
              </div>
            </div>
          </div>

          {/* Banner de Vitória / Derrota */}
          <div
            className={`p-3 text-center border-2 rounded-xl font-arcade text-xs shadow-md ${
              winner === "P"
                ? "bg-emerald-950/80 border-emerald-400 text-emerald-200"
                : "bg-rose-950/80 border-rose-500 text-rose-200"
            }`}
          >
            {winner === "P" ? (
              <>
                <div className="text-sm font-black text-emerald-400">🎉 VOCÊ VENCEU O CARA OU COROA!</div>
                <div className="text-[9px] text-arcade-cream/90 font-body mt-1">
                  Você começa com a posse de bola e escolhe o atributo deste lance.
                </div>
              </>
            ) : (
              <>
                <div className="text-sm font-black text-rose-400">🤖 A IA VENCEU O CARA OU COROA!</div>
                <div className="text-[9px] text-arcade-cream/90 font-body mt-1">
                  A máquina começa com a posse e escolhe o atributo deste lance.
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            className="w-full font-arcade text-xs py-3.5 rounded-xl bg-gradient-to-r from-arcade-yellow via-amber-400 to-amber-500 text-arcade-dark font-black border-2 border-arcade-cream hover:brightness-110 shadow-lg cursor-pointer active:scale-95 transition-all mt-2"
          >
            ENTRAR EM CAMPO ⚽
          </button>
        </div>
      )}
    </div>
  );
}
