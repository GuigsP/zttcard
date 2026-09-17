import { useState } from "react";

type Props = {
  role: "BATEDOR" | "GOLEIRO";
  aiChoice: () => number;
  onDone: (playerDir: number, aiDir: number, result: "GOL" | "DEFENDEU") => void;
  disabled?: boolean;
};

export function PenaltyMinigame({ role, aiChoice, onDone, disabled }: Props) {
  const [chosen, setChosen] = useState<number | null>(null);

  const pick = (d: number) => {
    if (chosen !== null || disabled) return;
    setChosen(d);
    const aiDir = aiChoice();
    const same = d === aiDir;
    const result: "GOL" | "DEFENDEU" = same ? "DEFENDEU" : "GOL";
    setTimeout(() => onDone(d, aiDir, result), 800);
  };

  return (
    <div className="bg-arcade-cream text-arcade-dark border-4 border-arcade-dark rounded-md p-4 shadow-arcade max-w-md mx-auto text-center">
      <div className="font-arcade text-sm text-arcade-red mb-3">
        PÊNALTI — VOCÊ É O {role}
      </div>
      <div className="font-body text-xs mb-3 text-arcade-dark">
        {role === "BATEDOR"
          ? "Escolha a direção do chute. Se o goleiro adivinhar, defende."
          : "Escolha o lado da defesa. Se o batedor chutar no seu lado, defende."}
      </div>
      <div className="flex justify-center gap-3">
        {[1, 2, 3].map((d) => (
          <button
            key={d}
            onClick={() => pick(d)}
            disabled={chosen !== null}
            className={`font-arcade text-xl w-20 h-20 border-2 border-arcade-dark transition-colors ${
              chosen === d
                ? "bg-arcade-yellow text-arcade-dark border-arcade-red"
                : "bg-arcade-green text-arcade-cream hover:bg-arcade-red"
            } disabled:opacity-60`}
          >
            {d === 1 ? "←" : d === 2 ? "↑" : "→"}
          </button>
        ))}
      </div>
    </div>
  );
}
