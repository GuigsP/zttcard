import { useState } from "react";

type Props = { onClose: () => void };

const SLIDES = [
  {
    title: "O QUE SÃO TRAPS",
    body: (
      <div className="space-y-2 text-left">
        <p className="font-body text-sm text-arcade-dark">
          Traps são cartas de armadilha que você baixa <b>durante o duelo</b> para virar a rodada.
        </p>
        <ul className="space-y-2">
          <li className="bg-arcade-yellow/60 border-2 border-arcade-dark p-2">
            <div className="font-arcade text-[10px] text-arcade-red">CARTÃO AMARELO</div>
            <div className="font-body text-xs">Tira <b>-15 pontos</b> do atributo do adversário nesta rodada.</div>
          </li>
          <li className="bg-arcade-red/20 border-2 border-arcade-dark p-2">
            <div className="font-arcade text-[10px] text-arcade-red">IMPEDIMENTO</div>
            <div className="font-body text-xs">Anula a rodada. Só funciona nas posições de ataque (<b>PD, PE, ATA</b>).</div>
          </li>
          <li className="bg-arcade-green/30 border-2 border-arcade-dark p-2">
            <div className="font-arcade text-[10px] text-arcade-red">PÊNALTI</div>
            <div className="font-body text-xs">Muda o duelo para o minigame de chute vs defesa (direção 1, 2 ou 3).</div>
          </li>
        </ul>
      </div>
    ),
  },
  {
    title: "QUANDO USAR",
    body: (
      <div className="space-y-3 text-left">
        <p className="font-body text-sm text-arcade-dark">
          A janela de trap abre <b>depois do atributo ser anunciado</b> — você já sabe qual valor vai
          disputar antes de decidir baixar uma trap.
        </p>
        <div className="bg-arcade-blue/10 border-2 border-arcade-dark p-3 font-body text-xs">
          <b>Dica:</b> se o adversário escolheu um atributo em que ele te vence, esse é o momento
          perfeito de usar um Cartão Amarelo. Não gaste sua trap no começo à toa.
        </div>
        <div className="font-body text-xs text-arcade-dark/80">
          Cada rodada aceita <b>apenas uma trap</b> (sua ou da IA). Se a IA baixar primeiro, você
          não pode baixar a sua nessa rodada.
        </div>
      </div>
    ),
  },
  {
    title: "COMO GANHAR MAIS TRAPS",
    body: (
      <div className="space-y-3 text-left">
        <p className="font-body text-sm text-arcade-dark">
          Você começa com <b>3 traps</b> (1 de cada tipo) e pode ganhar mais durante o jogo:
        </p>
        <ul className="space-y-2 font-body text-xs">
          <li className="bg-arcade-green/30 border-2 border-arcade-dark p-2">
            <b>Vencer uma posição por 2×0</b> (varredura): +1 trap aleatória.
          </li>
          <li className="bg-arcade-yellow/40 border-2 border-arcade-dark p-2">
            <b>Perder uma posição por 0×2</b>: +1 trap de consolo.
          </li>
        </ul>
        <div className="font-body text-xs text-arcade-dark/80">
          Limite máximo de <b>5 traps</b> na mão ao mesmo tempo.
        </div>
      </div>
    ),
  },
];

export function TrapsTutorialModal({ onClose }: Props) {
  const [i, setI] = useState(0);
  const slide = SLIDES[i];
  const isLast = i === SLIDES.length - 1;
  return (
    <div className="fixed inset-0 z-50 bg-arcade-dark/80 flex items-center justify-center p-4">
      <div className="bg-arcade-cream text-arcade-dark border-4 border-arcade-yellow shadow-arcade w-full max-w-lg rounded-md">
        <div className="flex items-center justify-between px-4 py-2 bg-arcade-red text-arcade-cream border-b-4 border-arcade-dark">
          <div className="font-arcade text-[10px]">TRAPS · {i + 1}/{SLIDES.length}</div>
          <button
            onClick={onClose}
            className="font-arcade text-[10px] text-arcade-cream hover:text-arcade-yellow"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        <div className="px-4 py-4">
          <div className="font-arcade text-base text-arcade-red mb-3 text-center">
            {slide.title}
          </div>
          {slide.body}
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t-2 border-arcade-dark bg-arcade-blue/5">
          <button
            onClick={() => setI((n) => Math.max(0, n - 1))}
            disabled={i === 0}
            className="font-arcade text-[10px] px-3 py-2 bg-arcade-cream text-arcade-dark border-2 border-arcade-dark disabled:opacity-30 hover:bg-arcade-yellow"
          >
            ◀ VOLTAR
          </button>
          <div className="flex gap-1">
            {SLIDES.map((_, k) => (
              <span
                key={k}
                className={`w-2 h-2 rounded-full ${
                  k === i ? "bg-arcade-red" : "bg-arcade-dark/30"
                }`}
              />
            ))}
          </div>
          {isLast ? (
            <button
              onClick={onClose}
              className="font-arcade text-[10px] px-3 py-2 bg-arcade-green text-arcade-cream border-2 border-arcade-dark hover:bg-arcade-red"
            >
              ENTENDI ▶
            </button>
          ) : (
            <button
              onClick={() => setI((n) => Math.min(SLIDES.length - 1, n + 1))}
              className="font-arcade text-[10px] px-3 py-2 bg-arcade-yellow text-arcade-dark border-2 border-arcade-dark hover:bg-arcade-cream"
            >
              PRÓXIMO ▶
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
