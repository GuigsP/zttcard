import { useState } from "react";
import type { AttrKey, Position } from "../types";
import { ATTR_LABELS, attrsForPosition } from "../types";
import { sound } from "../audio";

type Props = {
  position: Position;
  onPick: (a: AttrKey) => void;
  chooser: "P" | "AI";
  disabled?: boolean;
};

export function AttributeChoice({ position, onPick, chooser, disabled }: Props) {
  const attrs = attrsForPosition(position);
  const [locked, setLocked] = useState(false);
  const handle = (a: AttrKey) => {
    if (locked || disabled) return;
    setLocked(true);
    sound.playAttrSelect();
    onPick(a);
  };
  return (
    <div className="text-center">
      <div className="font-arcade text-xs text-arcade-yellow mb-2">
        {chooser === "P" ? "SUA VEZ — ESCOLHA O ATRIBUTO" : "IA ESTÁ ESCOLHENDO..."}
      </div>
      <div className="flex gap-2 justify-center flex-wrap">
        {attrs.map((a) => (
          <button
            key={a}
            disabled={chooser !== "P" || disabled || locked}
            onClick={() => handle(a)}
            className="font-arcade text-xs px-4 py-3 bg-arcade-yellow text-arcade-dark border-2 border-arcade-dark disabled:opacity-40 disabled:cursor-not-allowed hover:bg-arcade-cream hover:border-arcade-red"
          >
            {ATTR_LABELS[a]}
          </button>
        ))}
      </div>
      {chooser === "AI" && <ThinkingDots />}
    </div>
  );
}

function ThinkingDots() {
  return (
    <div className="flex gap-1 justify-center mt-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 bg-arcade-yellow rounded-full animate-pulse"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}
