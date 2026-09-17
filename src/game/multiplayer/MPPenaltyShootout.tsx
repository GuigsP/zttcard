import { useState } from "react";
import type { MPSide } from "./humanEngine";
import { sound } from "../audio";

type Props = {
  myRole: MPSide;
  kickerSide: MPSide;
  myPenaltyDir: number | null;
  onPickDir: (dir: number) => void;
};

const DIRECTIONS = [
  { id: 1, label: "ESQUERDA ⬅️" },
  { id: 2, label: "MEIO ⬆️" },
  { id: 3, label: "DIREITA ➡️" },
];

export function MPPenaltyShootout({
  myRole,
  kickerSide,
  myPenaltyDir,
  onPickDir,
}: Props) {
  const isKicker = myRole === kickerSide;
  const roleTitle = isKicker ? "VOCÊ É O BATEDOR! ⚽" : "VOCÊ É O GOLEIRO! 🧤";
  const roleDesc = isKicker
    ? "Escolha onde vai chutar o pênalti."
    : "Escolha o canto onde vai pular para defender.";

  const handlePick = (dir: number) => {
    if (myPenaltyDir != null) return;
    sound.playPenaltyKick();
    onPickDir(dir);
  };

  return (
    <div className="text-center bg-arcade-dark/90 border-4 border-arcade-yellow rounded-md p-4 max-w-md w-full shadow-arcade">
      <div className="font-arcade text-xs text-arcade-red mb-1">
        MINIGAME DE PÊNALTI
      </div>
      <div className="font-arcade text-sm text-arcade-yellow mb-2">
        {roleTitle}
      </div>
      <div className="font-body text-xs text-arcade-cream mb-4">
        {roleDesc}
      </div>

      {myPenaltyDir == null ? (
        <div className="grid grid-cols-3 gap-2">
          {DIRECTIONS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => handlePick(d.id)}
              className="font-arcade text-[10px] py-4 px-2 bg-arcade-yellow text-arcade-dark border-2 border-arcade-dark hover:bg-arcade-green hover:text-arcade-cream hover:scale-105 transition-transform"
            >
              {d.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="bg-arcade-green/20 border-2 border-arcade-green p-3 rounded text-center">
          <div className="font-arcade text-xs text-arcade-green animate-pulse mb-1">
            CANTO {myPenaltyDir} ESCOLHIDO!
          </div>
          <div className="font-body text-xs text-arcade-cream/80">
            Aguardando a escolha do adversário...
          </div>
        </div>
      )}
    </div>
  );
}
