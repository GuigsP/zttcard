import { useState } from "react";
import { sound } from "../audio";

type Props = {
  onDone: (winner: "P" | "AI", detail: string) => void;
};

type Step = "SELECT" | "ROLLING" | "RESULT";

export function ParOuImpar({ onDone }: Props) {
  const [choice, setChoice] = useState<"PAR" | "IMPAR" | null>(null);
  const [num, setNum] = useState<number | null>(null);
  const [step, setStep] = useState<Step>("SELECT");
  const [aiNumber, setAiNumber] = useState<number>(0);
  const [winner, setWinner] = useState<"P" | "AI" | null>(null);
  const [rollCount, setRollCount] = useState<string>("1... 2... 3... JÁ!");

  const btnBase =
    "font-arcade border-2 border-arcade-dark transition-colors disabled:opacity-40";

  const handlePlay = () => {
    if (choice == null || num == null || step !== "SELECT") return;

    sound.playCardFlip();
    setStep("ROLLING");

    const generatedAiNum = Math.floor(Math.random() * 6);
    setAiNumber(generatedAiNum);

    const sum = num + generatedAiNum;
    const isPar = sum % 2 === 0;
    const playerWon = (isPar && choice === "PAR") || (!isPar && choice === "IMPAR");
    const wonSide: "P" | "AI" = playerWon ? "P" : "AI";
    setWinner(wonSide);

    // Short suspense roll
    setTimeout(() => {
      setRollCount("DOIS OU UM... PAR OU ÍMPAR!");
    }, 300);

    setTimeout(() => {
      setStep("RESULT");
      if (playerWon) {
        sound.playGoal();
      } else {
        sound.playPointLost();
      }
    }, 700);
  };

  const handleConfirm = () => {
    if (!winner || num == null || choice == null) return;
    const sum = num + aiNumber;
    const isPar = sum % 2 === 0;
    const detail = `VOCÊ ${num} (${choice}) · IA ${aiNumber} → ${sum} (${isPar ? "PAR" : "ÍMPAR"})`;
    onDone(winner, detail);
  };

  const sum = (num ?? 0) + aiNumber;
  const isSumPar = sum % 2 === 0;

  return (
    <div className="bg-arcade-cream text-arcade-dark border-4 border-arcade-dark rounded-md p-4 shadow-arcade max-w-md mx-auto">
      <div className="font-arcade text-xs text-arcade-red mb-3 text-center border-b-2 border-arcade-dark/20 pb-2">
        🎲 PAR OU ÍMPAR — DISPUTA DE INICIATIVA
      </div>

      {step === "SELECT" && (
        <>
          <div className="font-arcade text-[10px] text-arcade-dark mb-2 text-center">
            1) ESCOLHA SUA APOSTA:
          </div>
          <div className="flex gap-2 justify-center mb-3">
            {(["PAR", "IMPAR"] as const).map((c) => (
              <button
                key={c}
                onClick={() => {
                  sound.playAttrSelect();
                  setChoice(c);
                }}
                className={`${btnBase} text-xs px-5 py-2.5 ${
                  choice === c
                    ? "bg-arcade-yellow text-arcade-dark border-arcade-red shadow-arcade"
                    : "bg-arcade-cream text-arcade-dark hover:bg-arcade-yellow"
                }`}
              >
                {c === "IMPAR" ? "ÍMPAR" : "PAR"}
              </button>
            ))}
          </div>

          <div className="font-arcade text-[10px] text-arcade-dark mb-2 text-center">
            2) ESCOLHA QUANTOS DEDOS COLOCAR (0 a 5):
          </div>
          <div className="flex gap-2 justify-center mb-4 flex-wrap">
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => {
                  sound.playAttrSelect();
                  setNum(n);
                }}
                className={`${btnBase} text-sm w-11 h-11 ${
                  num === n
                    ? "bg-arcade-green text-arcade-cream border-arcade-yellow shadow-arcade scale-105"
                    : "bg-arcade-cream text-arcade-dark hover:bg-arcade-yellow"
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          <button
            onClick={handlePlay}
            disabled={choice == null || num == null}
            className="w-full font-arcade text-xs py-3 bg-arcade-red text-arcade-cream border-2 border-arcade-dark disabled:opacity-40 hover:bg-arcade-dark shadow-arcade cursor-pointer"
          >
            DISPUTAR PAR OU ÍMPAR ▶
          </button>
        </>
      )}

      {step === "ROLLING" && (
        <div className="py-8 text-center space-y-3">
          <div className="font-display text-2xl text-arcade-red animate-pulse">
            {rollCount}
          </div>
          <div className="font-arcade text-[10px] text-arcade-dark/70">
            A IA está escolhendo o número dela...
          </div>
        </div>
      )}

      {step === "RESULT" && winner && num != null && choice != null && (
        <div className="space-y-3">
          {/* Side by side choices */}
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-arcade-yellow/40 border-2 border-arcade-dark p-2 rounded">
              <div className="font-arcade text-[9px] text-arcade-dark/70">SUA ESCOLHA</div>
              <div className="font-display text-2xl text-arcade-dark">{num}</div>
              <div className="font-arcade text-[9px] text-arcade-red font-bold">
                ({choice})
              </div>
            </div>
            <div className="bg-arcade-blue/20 border-2 border-arcade-dark p-2 rounded">
              <div className="font-arcade text-[9px] text-arcade-dark/70">ESCOLHA DA IA</div>
              <div className="font-display text-2xl text-arcade-dark">{aiNumber}</div>
              <div className="font-arcade text-[9px] text-arcade-blue font-bold">
                ({choice === "PAR" ? "ÍMPAR" : "PAR"})
              </div>
            </div>
          </div>

          {/* Sum math breakdown */}
          <div className="bg-arcade-dark text-arcade-cream p-3 rounded text-center border-2 border-arcade-yellow">
            <div className="font-arcade text-[10px] text-arcade-yellow mb-1">
              SOMA DOS NÚMEROS:
            </div>
            <div className="font-display text-2xl text-arcade-cream">
              {num} + {aiNumber} = <span className="text-arcade-yellow">{sum}</span>
            </div>
            <div className="font-arcade text-xs text-arcade-yellow mt-1">
              RESULTADO: {isSumPar ? "PAR" : "ÍMPAR"}!
            </div>
          </div>

          {/* Winner announcement */}
          <div
            className={`p-2.5 text-center border-2 border-arcade-dark rounded font-arcade text-xs ${
              winner === "P"
                ? "bg-arcade-green text-arcade-cream"
                : "bg-arcade-red text-arcade-cream"
            }`}
          >
            {winner === "P" ? (
              <>
                <div>🎉 VOCÊ VENCEU O PAR OU ÍMPAR!</div>
                <div className="text-[9px] text-arcade-cream/90 font-body mt-1">
                  Você começa escolhendo o atributo do confronto.
                </div>
              </>
            ) : (
              <>
                <div>🤖 A IA VENCEU O PAR OU ÍMPAR!</div>
                <div className="text-[9px] text-arcade-cream/90 font-body mt-1">
                  A IA começa escolhendo o atributo do confronto.
                </div>
              </>
            )}
          </div>

          <button
            onClick={handleConfirm}
            className="w-full font-arcade text-xs py-3 bg-arcade-yellow text-arcade-dark border-2 border-arcade-dark hover:bg-arcade-cream shadow-arcade cursor-pointer mt-2"
          >
            ENTRAR NO DUELO ▶
          </button>
        </div>
      )}
    </div>
  );
}
