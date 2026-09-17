import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listFeedback, deleteFeedback } from "@/lib/feedback.functions";

type FeedbackRow = {
  id: string;
  rating: "up" | "down";
  comment: string;
  handle: string;
  user_id: string | null;
  page: string;
  user_agent: string;
  created_at: string;
};

export function FeedbackTab() {
  const [items, setItems] = useState<FeedbackRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "up" | "down">("ALL");
  const [busy, setBusy] = useState(false);
  const list = useServerFn(listFeedback);
  const del = useServerFn(deleteFeedback);

  async function refresh() {
    setErr(null);
    try {
      const res = await list();
      setItems((res.items ?? []) as FeedbackRow[]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao carregar feedbacks.");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Apagar este feedback?")) return;
    setBusy(true);
    try {
      await del({ data: { id } });
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao apagar.");
    } finally {
      setBusy(false);
    }
  }

  const rows = (items ?? []).filter((r) => filter === "ALL" || r.rating === filter);
  const ups = (items ?? []).filter((r) => r.rating === "up").length;
  const downs = (items ?? []).filter((r) => r.rating === "down").length;

  return (
    <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 md:p-6 space-y-5 shadow-sm">
      
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="text-base font-bold text-white flex items-center gap-2">
            <span>💬</span>
            <span>Feedbacks dos Jogadores</span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            Comentários e avaliações enviadas pela comunidade durante os testes do jogo.
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3.5 py-1.5 rounded-xl text-xs">
            <span className="text-emerald-400 font-bold">👍 {ups}</span>
            <span className="text-slate-600">·</span>
            <span className="text-rose-400 font-bold">👎 {downs}</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">Total: <b className="text-white">{items?.length ?? 0}</b></span>
          </div>
        </div>
      </div>

      {err && <div className="p-3 bg-red-950/50 border border-red-800 text-red-200 text-xs rounded-xl">{err}</div>}

      {/* Filter Tabs & Refresh */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              filter === "ALL" ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Todos ({items?.length ?? 0})
          </button>
          <button
            onClick={() => setFilter("up")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              filter === "up" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            👍 Positivos ({ups})
          </button>
          <button
            onClick={() => setFilter("down")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              filter === "down" ? "bg-rose-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            👎 Negativos ({downs})
          </button>
        </div>

        <button
          onClick={() => void refresh()}
          className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-medium transition-colors cursor-pointer"
        >
          🔄 Recarregar
        </button>
      </div>

      {/* Feedbacks Table */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              <tr>
                <th className="p-3.5">Data / Hora</th>
                <th className="p-3.5 text-center">Avaliação</th>
                <th className="p-3.5">Comentário</th>
                <th className="p-3.5">Identificação</th>
                <th className="p-3.5">Página de Origem</th>
                <th className="p-3.5">User ID</th>
                <th className="p-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {items === null && (
                <tr><td colSpan={7} className="p-8 text-center text-slate-500">Carregando feedbacks...</td></tr>
              )}
              {items !== null && rows.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-slate-500">Nenhum feedback registrado ainda.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/40 transition-colors align-top">
                  <td className="p-3.5 whitespace-nowrap text-slate-400 text-xs">
                    {new Date(r.created_at).toLocaleString("pt-BR")}
                  </td>
                  <td className="p-3.5 text-center">
                    <span className={`inline-block text-base px-2 py-0.5 rounded-md ${
                      r.rating === "up" ? "bg-emerald-950 text-emerald-300 border border-emerald-800/60" : "bg-rose-950 text-rose-300 border border-rose-800/60"
                    }`}>
                      {r.rating === "up" ? "👍" : "👎"}
                    </span>
                  </td>
                  <td className="p-3.5 max-w-md whitespace-pre-wrap break-words text-slate-100 font-medium">
                    {r.comment || <span className="text-slate-600 italic">Sem comentário escrito</span>}
                  </td>
                  <td className="p-3.5 text-slate-400">
                    {r.handle || <span className="text-slate-600">—</span>}
                  </td>
                  <td className="p-3.5 text-slate-400 font-mono text-[11px]">
                    {r.page || <span className="text-slate-600">—</span>}
                  </td>
                  <td className="p-3.5 font-mono text-[10px] text-slate-500">
                    {r.user_id ? r.user_id.slice(0, 8) : "anônimo"}
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      disabled={busy}
                      onClick={() => handleDelete(r.id)}
                      className="px-2.5 py-1 text-xs font-semibold bg-slate-800/50 hover:bg-rose-950 text-slate-400 hover:text-rose-300 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Apagar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
