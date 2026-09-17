import { useState } from "react";

type Props = { onClose: () => void };

const SLIDES = [
  {
    title: "OBJETIVO",
    body: "Duelo de 11 rodadas, uma para cada posição. Quem vencer a posição marca 1 gol. Ao fim, quem tiver mais gols vence a partida.",
  },
  {
    title: "PAR OU ÍMPAR",
    body: "No começo de cada posição, um par ou ímpar decide quem escolhe o atributo da primeira carta. Depois, o PERDEDOR da rodada anterior escolhe o próximo atributo.",
  },
  {
    title: "TRAPS (ARMADILHAS)",
    body: "Cada jogador puxa 1 trap por posição: • CARTÃO AMARELO reduz -15 no atributo do adversário. • IMPEDIMENTO anula a rodada (só em Pontas/Atacante). • PÊNALTI vira um minigame de chute vs defesa.",
  },
  {
    title: "PÊNALTI",
    body: "Escolha uma direção (1, 2 ou 3). Se batedor e goleiro escolherem igual, o goleiro DEFENDE. Se diferentes, é GOL!",
  },
];

export function TutorialModal({ onClose }: Props) {
  const [i, setI] = useState(0);
  const slide = SLIDES[i];
  const isLast = i === SLIDES.length - 1;
  return (
    <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-arcade-cream text-arcade-dark border-4 border-arcade-yellow shadow-arcade w-full max-w-lg p-6 rounded-md">
        <div className="flex justify-between items-center mb-4">
          <div className="font-arcade text-xs text-arcade-red">
            TUTORIAL {i + 1}/{SLIDES.length}
          </div>
          <button
            onClick={onClose}
            className="font-arcade text-xs px-2 py-1 bg-arcade-dark text-arcade-cream hover:bg-arcade-red"
          >
            X
          </button>
        </div>
        <div className="font-arcade text-lg text-arcade-green mb-3">
          {slide.title}
        </div>
        <div className="font-body text-sm leading-relaxed text-arcade-dark mb-6 min-h-[110px]">
          {slide.body}
        </div>
        <div className="flex justify-between gap-2">
          <button
            onClick={() => setI((v) => Math.max(0, v - 1))}
            disabled={i === 0}
            className="font-arcade text-[10px] px-4 py-2 bg-arcade-cream text-arcade-dark border-2 border-arcade-dark disabled:opacity-30 hover:bg-arcade-yellow"
          >
            ANTERIOR
          </button>
          {isLast ? (
            <button
              onClick={onClose}
              className="font-arcade text-[10px] px-4 py-2 bg-arcade-green text-arcade-cream border-2 border-arcade-dark hover:bg-arcade-red"
            >
              COMEÇAR
            </button>
          ) : (
            <button
              onClick={() => setI((v) => Math.min(SLIDES.length - 1, v + 1))}
              className="font-arcade text-[10px] px-4 py-2 bg-arcade-yellow text-arcade-dark border-2 border-arcade-dark hover:bg-arcade-green hover:text-arcade-cream"
            >
              PRÓXIMO
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
