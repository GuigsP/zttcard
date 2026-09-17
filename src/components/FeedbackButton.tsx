import { useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { submitFeedback } from "@/lib/feedback.functions";

const LS_KEY = "ztt.feedback.lastSentAt";
const COOLDOWN_MS = 30_000;

export function FeedbackButton() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [comment, setComment] = useState("");
  const [handle, setHandle] = useState("");
  const [sending, setSending] = useState(false);
  const submit = useServerFn(submitFeedback);

  // Hide on admin/auth pages.
  if (pathname.startsWith("/admin") || pathname.startsWith("/auth")) return null;

  const reset = () => {
    setRating(null);
    setComment("");
    setHandle("");
  };

  const onSend = async () => {
    if (!rating) {
      toast.error("Escolha 👍 ou 👎 primeiro.");
      return;
    }
    try {
      const last = Number(localStorage.getItem(LS_KEY) ?? "0");
      if (Date.now() - last < COOLDOWN_MS) {
        toast.error("Aguarde uns segundos antes de enviar de novo.");
        return;
      }
    } catch {
      /* ignore */
    }
    setSending(true);
    try {
      await submit({ data: { rating, comment, handle, page: pathname } });
      try {
        localStorage.setItem(LS_KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
      toast.success("Valeu pelo feedback! 🎉");
      setOpen(false);
      reset();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao enviar.";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 font-arcade text-[10px] px-3 py-2 bg-arcade-yellow text-arcade-dark border-2 border-arcade-dark shadow-arcade hover:bg-arcade-red hover:text-arcade-cream transition-colors"
        aria-label="Enviar feedback"
      >
        FEEDBACK 💬
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => !sending && setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-arcade-cream text-arcade-dark border-4 border-arcade-dark shadow-arcade p-5"
          >
            <div className="font-arcade text-sm text-arcade-red mb-3">
              MANDA SEU FEEDBACK
            </div>
            <div className="font-body text-xs mb-4">
              Curtiu ou não? Conta pra gente o que dá pra melhorar.
            </div>

            <div className="flex gap-3 mb-4">
              <button
                type="button"
                onClick={() => setRating("up")}
                className={`flex-1 font-arcade text-xs py-3 border-4 ${
                  rating === "up"
                    ? "bg-arcade-green text-arcade-cream border-arcade-dark"
                    : "bg-arcade-cream text-arcade-dark border-arcade-dark/40 hover:border-arcade-dark"
                }`}
              >
                👍 CURTI
              </button>
              <button
                type="button"
                onClick={() => setRating("down")}
                className={`flex-1 font-arcade text-xs py-3 border-4 ${
                  rating === "down"
                    ? "bg-arcade-red text-arcade-cream border-arcade-dark"
                    : "bg-arcade-cream text-arcade-dark border-arcade-dark/40 hover:border-arcade-dark"
                }`}
              >
                👎 NÃO CURTI
              </button>
            </div>

            <label className="block font-arcade text-[9px] mb-1">
              COMENTÁRIO (OPCIONAL)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 500))}
              maxLength={500}
              rows={3}
              placeholder="Conta o que rolou..."
              className="w-full font-body text-sm border-2 border-arcade-dark bg-white text-arcade-dark px-2 py-1 mb-1"
            />
            <div className="text-[10px] font-body text-arcade-dark/60 text-right mb-3">
              {comment.length}/500
            </div>

            <label className="block font-arcade text-[9px] mb-1">
              SEU NOME OU @ (OPCIONAL)
            </label>
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value.slice(0, 60))}
              maxLength={60}
              placeholder="ex: @guilherme"
              className="w-full font-body text-sm border-2 border-arcade-dark bg-white text-arcade-dark px-2 py-1 mb-4"
            />

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                disabled={sending}
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
                className="font-arcade text-[10px] px-3 py-2 bg-arcade-cream text-arcade-dark border-2 border-arcade-dark hover:bg-arcade-yellow disabled:opacity-50"
              >
                CANCELAR
              </button>
              <button
                type="button"
                disabled={sending || !rating}
                onClick={onSend}
                className="font-arcade text-[10px] px-3 py-2 bg-arcade-green text-arcade-cream border-2 border-arcade-dark hover:bg-arcade-red disabled:opacity-50"
              >
                {sending ? "ENVIANDO..." : "ENVIAR"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
