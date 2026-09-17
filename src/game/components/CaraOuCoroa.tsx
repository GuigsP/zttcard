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
    <div className="bg-arcade-cream text-arcade-dark border-4 border-arcade-dark rounded-md p-5 shadow-arcade max-w-md mx-auto select-none">
      {/* Cabeçalho */}
      <div className="font-arcade text-xs text-arcade-red mb-3 text-center border-b-2 border-arcade-dark/20 pb-2">
        🪙 CARA OU COROA — SORTEIO DO JUIZ
      </div>

      {step === "SELECT" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="text-center font-arcade text-[10px] text-arcade-dark">
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
              className={`${btnBase} p-3 rounded flex flex-col items-center gap-1.5 ${
                choice === "CARA"
                  ? "bg-arcade-yellow text-arcade-dark border-arcade-red shadow-arcade scale-105"
                  : "bg-white text-arcade-dark hover:bg-arcade-yellow/60 border-arcade-dark"
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-amber-400 border-2 border-arcade-dark flex items-center justify-center text-2xl shadow-inner">
                👤
              </div>
              <div className="font-arcade text-xs font-bold">CARA</div>
              <div className="font-body text-[9px] text-arcade-dark/70">
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
              className={`${btnBase} p-3 rounded flex flex-col items-center gap-1.5 ${
                choice === "COROA"
                  ? "bg-arcade-yellow text-arcade-dark border-arcade-red shadow-arcade scale-105"
                  : "bg-white text-arcade-dark hover:bg-arcade-yellow/60 border-arcade-dark"
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-amber-400 border-2 border-arcade-dark flex items-center justify-center text-2xl shadow-inner">
                👑
              </div>
              <div className="font-arcade text-xs font-bold">COROA</div>
              <div className="font-body text-[9px] text-arcade-dark/70">
                (Símbolo / Taça)
              </div>
            </button>
          </div>

          <button
            type="button"
            onClick={handleFlip}
            disabled={choice == null}
            className="w-full font-arcade text-xs py-3 bg-arcade-red text-arcade-cream border-2 border-arcade-dark disabled:opacity-40 hover:bg-arcade-dark shadow-arcade cursor-pointer active:translate-y-0.5 mt-2"
          >
            JOGAR A MOEDA PRO ALTO ▶
          </button>
        </div>
      )}

      {step === "FLIPPING" && (
        <div className="py-8 flex flex-col items-center justify-center space-y-4">
          <div className="font-arcade text-[10px] text-arcade-red animate-pulse">
            O JUIZ JOGOU A MOEDA NO AR...
          </div>

          {/* Moeda 3D Girando */}
          <div className="w-20 h-20 relative [perspective:600px]">
            <div
              className="w-full h-full rounded-full border-4 border-amber-600 bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-500 flex items-center justify-center text-4xl shadow-arcade transition-transform duration-1000 ease-out"
              style={{
                transform: `rotateY(${flipDegree}deg)`,
                transformStyle: "preserve-3d",
              }}
            >
              🪙
            </div>
          </div>

          <div className="font-arcade text-[9px] text-arcade-dark/70">
            Você escolheu: <span className="font-bold text-arcade-red">{choice}</span>
          </div>
        </div>
      )}

      {step === "RESULT" && winner && choice && coinResult && (
        <div className="space-y-3.5 animate-in fade-in zoom-in-95 duration-200">
          {/* Moeda Vencedora em Destaque */}
          <div className="flex flex-col items-center justify-center py-2">
            <div className="w-16 h-16 rounded-full border-4 border-arcade-dark bg-amber-400 flex items-center justify-center text-3xl shadow-arcade animate-bounce">
              {coinResult === "CARA" ? "👤" : "👑"}
            </div>
            <div className="font-arcade text-sm text-arcade-dark mt-2 font-bold">
              DEU {coinResult}!
            </div>
          </div>

          {/* Comparativo: Sua Escolha vs Moeda */}
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-arcade-yellow/40 border-2 border-arcade-dark p-2 rounded">
              <div className="font-arcade text-[8px] text-arcade-dark/70">
                SUA ESCOLHA
              </div>
              <div className="font-arcade text-xs font-bold text-arcade-dark mt-0.5">
                {choice === "CARA" ? "👤 CARA" : "👑 COROA"}
              </div>
            </div>

            <div className="bg-arcade-blue/20 border-2 border-arcade-dark p-2 rounded">
              <div className="font-arcade text-[8px] text-arcade-dark/70">
                MOEDA DO JUIZ
              </div>
              <div className="font-arcade text-xs font-bold text-arcade-blue mt-0.5">
                {coinResult === "CARA" ? "👤 CARA" : "👑 COROA"}
              </div>
            </div>
          </div>

          {/* Banner de Vitória / Derrota */}
          <div
            className={`p-3 text-center border-2 border-arcade-dark rounded font-arcade text-xs shadow-sm ${
              winner === "P"
                ? "bg-arcade-green text-arcade-cream"
                : "bg-arcade-red text-arcade-cream"
            }`}
          >
            {winner === "P" ? (
              <>
                <div className="text-sm">🎉 VOCÊ VENCEU O CARA OU COROA!</div>
                <div className="text-[9px] text-arcade-cream/90 font-body mt-1">
                  Você começa a rodada com a posse e escolhe o atributo do duelo.
                </div>
              </>
            ) : (
              <>
                <div className="text-sm">🤖 A IA VENCEU O CARA OU COROA!</div>
                <div className="text-[9px] text-arcade-cream/90 font-body mt-1">
                  A IA começa a rodada com a posse e escolhe o atributo do duelo.
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            className="w-full font-arcade text-xs py-3 bg-arcade-yellow text-arcade-dark border-2 border-arcade-dark hover:bg-arcade-cream shadow-arcade cursor-pointer active:translate-y-0.5 mt-2"
          >
            ENTRAR NO DUELO ▶
          </button>
        </div>
      )}
    </div>
  );
}
