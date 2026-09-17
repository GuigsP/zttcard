type Props = { onClick: () => void };

export function HelpButton({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      title="Como jogar"
      aria-label="Como jogar"
      className="fixed top-2 right-2 z-30 w-9 h-9 text-sm sm:top-3 sm:right-3 sm:w-11 sm:h-11 sm:text-lg rounded-full bg-arcade-yellow text-arcade-dark font-arcade border-2 border-arcade-dark shadow-arcade hover:bg-arcade-red hover:text-arcade-cream"
    >
      ?
    </button>
  );
}
