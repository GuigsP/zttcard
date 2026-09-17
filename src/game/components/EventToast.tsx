type Props = {
  text: string | null;
  color?: "green" | "yellow" | "red" | "blue";
};

export function EventToast({ text, color = "green" }: Props) {
  if (!text) return null;
  const bg =
    color === "yellow"
      ? "bg-arcade-yellow text-arcade-dark"
      : color === "red"
        ? "bg-arcade-red text-arcade-cream"
        : color === "blue"
          ? "bg-arcade-blue text-arcade-cream"
          : "bg-arcade-green text-arcade-cream";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div
        key={text}
        className={`${bg} font-arcade text-3xl md:text-5xl px-8 py-6 border-4 border-arcade-dark shadow-arcade animate-toast`}
      >
        {text}
      </div>
    </div>
  );
}
