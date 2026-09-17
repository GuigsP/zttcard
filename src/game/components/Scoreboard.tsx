import type { Position } from "../types";
import { POSITION_LABELS, POSITIONS } from "../types";

type Props = {
  pGoals: number;
  aiGoals: number;
  position: Position;
};

export function Scoreboard({ pGoals, aiGoals, position }: Props) {
  const roundIdx = POSITIONS.indexOf(position) + 1;
  return (
    <div className="w-full bg-arcade-dark border-b-4 border-arcade-yellow px-3 py-2 pr-14 sm:px-4 sm:py-3 sm:pr-4">
      <div className="max-w-5xl mx-auto">
        {/* Mobile: linha compacta */}
        <div className="sm:hidden flex flex-col items-center gap-1">
          <div className="flex items-center justify-center gap-3 font-arcade text-arcade-cream">
            <span className="text-arcade-yellow text-[10px]">JOGADOR</span>
            <span className="text-2xl">{pGoals}</span>
            <span className="text-arcade-yellow text-lg">×</span>
            <span className="text-2xl">{aiGoals}</span>
            <span className="text-arcade-red text-[10px]">IA</span>
          </div>
          <div className="font-arcade text-[9px] text-arcade-cream text-center truncate min-w-0 max-w-full">
            RODADA {roundIdx}/11 — {POSITION_LABELS[position]}
          </div>
        </div>

        {/* Desktop: 3 colunas */}
        <div className="hidden sm:flex items-center justify-between gap-4">
          <div className="text-center">
            <div className="font-arcade text-[10px] text-arcade-yellow">JOGADOR</div>
            <div className="font-arcade text-4xl text-arcade-cream">{pGoals}</div>
          </div>
          <div className="text-center flex-1 min-w-0">
            <div className="font-arcade text-[10px] text-arcade-yellow">
              RODADA {roundIdx}/11
            </div>
            <div className="font-arcade text-lg md:text-xl text-arcade-cream mt-1 truncate">
              DUELO DE {POSITION_LABELS[position]}
            </div>
          </div>
          <div className="text-center">
            <div className="font-arcade text-[10px] text-arcade-red">IA</div>
            <div className="font-arcade text-4xl text-arcade-cream">{aiGoals}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
