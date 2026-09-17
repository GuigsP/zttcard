import { useState } from "react";
import type { AttrKey, Position, Trap } from "../types";
import { ATTR_LABELS, TRAP_LABELS } from "../types";
import { canPlayTrap } from "../engine";
import type { MPSide } from "./humanEngine";
import { sound } from "../audio";

type Props = {
  chosenAttr: AttrKey;
  chooser: MPSide;
  myRole: MPSide;
  pos: Position;
  myTraps: Trap[];
  myTrapPlayed: Trap | null;
  oppTrapPlayed: Trap | null;
  myTrapSkipped: boolean;
  oppTrapSkipped: boolean;
  onPlayTrap: (trap: Trap) => void;
  onSkipTrap: () => void;
};

export function MPTrapAnnounce({
  chosenAttr,
  chooser,
  myRole,
  pos,
  myTraps,
  myTrapPlayed,
  oppTrapPlayed,
  myTrapSkipped,
  oppTrapSkipped,
  onPlayTrap,
  onSkipTrap,
}: Props) {
  const [picking, setPicking] = useState(false);
  const playableTraps = myTraps.filter((t) => canPlayTrap(t, pos));
  const isChooserMe = chooser === myRole;

  const handlePlay = (t: Trap) => {
    if (t === "AMARELO") sound.playYellowCard();
    else sound.playWhistle();
    onPlayTrap(t);
  };

  const activeTrap = myTrapPlayed ?? oppTrapPlayed;
  const activeTrapBy = myTrapPlayed ? myRole : oppTrapPlayed ? (myRole === "HOST" ? "GUEST" : "HOST") : null;

  return (
    <div className="text-center bg-arcade-dark/90 border-2 border-arcade-yellow rounded-md px-4 py-3 max-w-md w-full shadow-arcade">
      <div className="font-arcade text-[10px] text-arcade-yellow mb-1">
        {isChooserMe ? "VOCÊ ESCOLHEU" : "ADVERSÁRIO ESCOLHEU"}
      </div>
      <div className="font-arcade text-lg text-arcade-cream mb-2">
        {ATTR_LABELS[chosenAttr]}
      </div>

      {activeTrap && (
        <div className="font-arcade text-[9px] text-arcade-yellow bg-arcade-red/60 border border-arcade-yellow px-2 py-1 mb-2">
          TRAP ATIVA ({activeTrapBy === myRole ? "SUA" : "DO ADVERSÁRIO"}): {TRAP_LABELS[activeTrap]}
        </div>
      )}

      {picking ? (
        <div className="mt-2">
          <div className="font-arcade text-[9px] text-arcade-cream mb-2">
            ESCOLHA UMA TRAP PARA BAIXAR
          </div>
          <div className="flex gap-2 justify-center flex-wrap">
            {playableTraps.map((t, i) => (
              <button
                key={`${t}-${i}`}
                type="button"
                onClick={() => handlePlay(t)}
                className="font-arcade text-[10px] px-3 py-2 bg-arcade-yellow text-arcade-dark border-2 border-arcade-dark hover:bg-arcade-red hover:text-arcade-cream"
              >
                {TRAP_LABELS[t]}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPicking(false)}
              className="font-arcade text-[10px] px-3 py-2 bg-arcade-cream text-arcade-dark border-2 border-arcade-dark hover:bg-arcade-yellow"
            >
              CANCELAR
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 mt-2">
          {!myTrapPlayed && !myTrapSkipped && playableTraps.length > 0 && (
            <div className="flex gap-2 justify-center flex-wrap">
              <button
                type="button"
                onClick={() => setPicking(true)}
                className="font-arcade text-[10px] px-3 py-2 bg-arcade-red text-arcade-cream border-2 border-arcade-dark hover:bg-arcade-yellow hover:text-arcade-dark shadow-arcade"
              >
                USAR TRAP ({playableTraps.length}) ⚡
              </button>
              <button
                type="button"
                onClick={onSkipTrap}
                className="font-arcade text-[10px] px-4 py-2 bg-arcade-green text-arcade-cream border-2 border-arcade-dark hover:bg-arcade-yellow hover:text-arcade-dark"
              >
                CONTINUAR SEM TRAP ▶
              </button>
            </div>
          )}

          {myTrapSkipped && !oppTrapSkipped && (
            <div className="font-arcade text-[9px] text-arcade-yellow animate-pulse">
              VOCÊ ESTÁ PRONTO. AGUARDANDO ADVERSÁRIO...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
