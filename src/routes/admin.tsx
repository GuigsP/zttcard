import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  deleteCard,
  deletePack,
  FOUNDER_SLUG,
  isAdmin,
  listAllCards,
  listPackCounts,
  listPacks,
  upsertCard,
  upsertPack,
  exportCardsJson,
  importCardsJson,
  resetToDefaultDeck,
  cardBelongsToPack,
  type DBCard,
  type DBPack,
  type UpsertCardInput,
  type UpsertPackInput,
} from "@/game/cardsRepo";
import { CardEditorModal } from "@/admin/components/CardEditorModal";
import { CardsTab } from "@/admin/components/CardsTab";
import { PacksTab } from "@/admin/components/PacksTab";
import { TacticalDeckView } from "@/admin/components/TacticalDeckView";
import { FeedbackTab } from "@/admin/components/FeedbackTab";
import { type Position } from "@/game/types";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin & Card Studio — Zero to Top | Card" },
      { name: "description", content: "Estúdio de Criação de Cartas e Gestão do ZTT Card." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Status = "loading" | "unauth" | "forbidden" | "ready";
type AdminTab = "cards" | "tactical" | "packs" | "feedback";

function AdminPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("loading");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [cards, setCards] = useState<DBCard[]>([]);
  const [packs, setPacks] = useState<DBPack[]>([]);
  const [packCounts, setPackCounts] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<AdminTab>("cards");
  const [editing, setEditing] = useState<Partial<DBCard> | null>(null);
  const [editingPack, setEditingPack] = useState<Partial<DBPack> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    try {
      const [rows, ps, counts] = await Promise.all([listAllCards(), listPacks(), listPackCounts()]);
      setCards(rows);
      setPacks(ps);
      setPackCounts(counts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dados.");
    }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error: userError } = await supabase.auth.getUser();
        if (!mounted) return;
        const user = data?.user;

        if (userError || !user) {
          setStatus("unauth");
          return;
        }

        const email = user.email || "";
        setUserEmail(email);

        const authorized = await isAdmin(user.id, email);
        if (!authorized) {
          setStatus("forbidden");
          return;
        }

        await refresh();
        if (mounted) setStatus("ready");
      } catch (err) {
        if (mounted) {
          console.error("Erro na verificação de administrador:", err);
          setStatus("forbidden");
        }
      }
    })();

    const sub = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        navigate({ to: "/auth" });
      } else if (session?.user) {
        const authorized = await isAdmin(session.user.id, session.user.email);
        if (!authorized) {
          setStatus("forbidden");
        }
      }
    });

    return () => {
      mounted = false;
      try {
        sub?.data?.subscription?.unsubscribe();
      } catch {
        // ignore
      }
    };
  }, [navigate]);

  async function signOut() {
    await supabase.auth.signOut().catch(() => {});
    navigate({ to: "/auth" });
  }

  async function handleSave(input: UpsertCardInput) {
    setError(null);
    try {
      await upsertCard(input);
      setEditing(null);
      await refresh();
      setSuccessMsg("Carta salva com sucesso!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  async function handleSaveAndNew(input: UpsertCardInput) {
    setError(null);
    try {
      await upsertCard(input);
      setEditing({
        side: input.side,
        position: input.position,
        attrs: {},
        name: "",
        real_name: "",
        quote: "",
        pack_ids: input.pack_ids,
      });
      setEditorKey((k) => k + 1);
      await refresh();
      setSuccessMsg("Carta salva! Formulário pronto para a próxima.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja apagar esta carta?")) return;
    setError(null);
    try {
      await deleteCard(id);
      await refresh();
      setSuccessMsg("Carta apagada.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao apagar.");
    }
  }

  async function handleSavePack(input: UpsertPackInput) {
    setError(null);
    try {
      await upsertPack(input);
      setEditingPack(null);
      await refresh();
      setSuccessMsg("Pacote salvo com sucesso!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar pacote.");
    }
  }

  async function handleDeletePack(pack: DBPack) {
    if (pack.slug === FOUNDER_SLUG) return;
    const linked = packCounts[pack.id] ?? 0;
    const msg = linked > 0
      ? `Apagar o pacote "${pack.name}"? Ele está vinculado a ${linked} carta(s). As cartas continuarão existindo, só perderão o vínculo com este pacote.`
      : `Apagar o pacote "${pack.name}"?`;
    if (!confirm(msg)) return;
    setError(null);
    try {
      await deletePack(pack.id);
      await refresh();
      setSuccessMsg("Pacote removido com sucesso.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao apagar pacote.");
    }
  }

  async function handleDownloadJson() {
    try {
      const jsonStr = await exportCardsJson();
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ztt-cards-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccessMsg("Base de cartas exportada em JSON com sucesso!");
      setShowToolsMenu(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError("Erro ao exportar JSON.");
    }
  }

  async function handleUploadJsonFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const count = await importCardsJson(text);
      await refresh();
      setSuccessMsg(`Sucesso! ${count} cartas importadas para a base de dados.`);
      setShowToolsMenu(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Arquivo JSON inválido.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleResetDefaultRoster() {
    if (!confirm("Restaurar o elenco padrão oficial dos anos 90 (Allejo, Romarinho, Neto, etc.)?")) return;
    try {
      await resetToDefaultDeck();
      await refresh();
      setSuccessMsg("Elenco padrão oficial restaurado com sucesso!");
      setShowToolsMenu(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError("Erro ao restaurar elenco.");
    }
  }

  async function handleForceSyncSupabase() {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("ztt.local.cards.db");
        localStorage.removeItem("ztt.local.packs.db");
      }
      await refresh();
      setSuccessMsg("Base de cartas e pacotes atualizada diretamente do Supabase!");
      setShowToolsMenu(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError("Erro ao sincronizar com o Supabase.");
    }
  }

  const founderPack = packs.find((p) => p.slug === FOUNDER_SLUG);
  const defaultPackIds = founderPack ? [founderPack.id] : [];

  function openNewCard(position?: Position, packId?: string, side?: "P" | "AI") {
    setEditing({
      side: side ?? "P",
      position: position ?? "GOL",
      attrs: {},
      name: "",
      real_name: "",
      quote: "",
      pack_ids: packId ? [packId] : defaultPackIds,
    });
    setEditorKey((k) => k + 1);
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-slate-300">
        <div className="w-10 h-10 border-3 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        <div className="text-sm font-medium tracking-wide">Carregando ZTT Studio...</div>
      </div>
    );
  }

  if (status === "unauth") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-2xl shadow-inner">
            🔒
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Acesso Restrito ao Studio</h2>
            <p className="text-sm text-slate-400 mt-1">
              Faça login com sua conta de administrador para gerenciar o catálogo de cartas.
            </p>
          </div>
          <div className="space-y-2.5">
            <Link
              to="/auth"
              className="block w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-emerald-900/30"
            >
              Ir para Login
            </Link>
            <Link
              to="/"
              className="block w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition-colors"
            >
              ← Voltar ao Jogo
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (status === "forbidden") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-red-900/40 rounded-2xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 bg-red-950/60 border border-red-800/50 rounded-2xl flex items-center justify-center mx-auto text-2xl">
            🚫
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Sem Permissão de Admin</h2>
            <p className="text-sm text-slate-400 mt-1">
              A conta <span className="font-semibold text-slate-200">{userEmail}</span> não tem permissão para acessar o painel.
            </p>
          </div>
          <div className="space-y-2.5">
            <button
              onClick={signOut}
              className="w-full py-3 bg-red-900/40 hover:bg-red-900/60 border border-red-700/50 text-red-200 font-semibold rounded-xl transition-colors"
            >
              Sair da Conta
            </button>
            <Link
              to="/"
              className="block w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition-colors"
            >
              ← Voltar ao Jogo
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-emerald-500 selection:text-slate-950">
      
      {/* 1. TOP HEADER (PROFESSIONAL DARK STUDIO) */}
      <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Left: Brand & Status */}
          <div className="flex items-center gap-3.5">
            <Link to="/admin" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-lg shadow-md shadow-emerald-950/50 group-hover:scale-105 transition-transform">
                ⚽
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                    ZTT Studio
                  </span>
                  <span className="text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.5 rounded-md">
                    v2.0
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Estúdio de Cartas & Decks</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Right: Global Actions & User Menu */}
          <div className="flex items-center gap-2.5">
            
            {/* Database / Tool Utilities Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowToolsMenu((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Ferramentas de Backup e Importação"
              >
                <span>⚙️</span>
                <span className="hidden sm:inline">Ferramentas</span>
                <span className="text-[10px] text-slate-500">▼</span>
              </button>

              {showToolsMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowToolsMenu(false)} />
                  <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-1.5 text-xs space-y-1 animate-in fade-in zoom-in-95 duration-100">
                    <button
                      onClick={handleDownloadJson}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-slate-200 hover:bg-slate-800 hover:text-white rounded-lg transition-colors cursor-pointer"
                    >
                      <span className="text-base">💾</span>
                      <div>
                        <div className="font-medium">Exportar JSON</div>
                        <div className="text-[10px] text-slate-400">Baixar backup completo de cartas</div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setShowToolsMenu(false);
                        fileInputRef.current?.click();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-slate-200 hover:bg-slate-800 hover:text-white rounded-lg transition-colors cursor-pointer"
                    >
                      <span className="text-base">📥</span>
                      <div>
                        <div className="font-medium">Importar JSON</div>
                        <div className="text-[10px] text-slate-400">Restaurar ou mesclar cartas</div>
                      </div>
                    </button>
                    <div className="h-px bg-slate-800 my-1" />
                    <button
                      onClick={handleForceSyncSupabase}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-teal-300 hover:bg-teal-950/40 rounded-lg transition-colors cursor-pointer"
                    >
                      <span className="text-base">🔄</span>
                      <div>
                        <div className="font-medium">Atualizar do Supabase</div>
                        <div className="text-[10px] text-teal-500/80">Limpar cache local e recarregar nuvem</div>
                      </div>
                    </button>
                    <button
                      onClick={handleResetDefaultRoster}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-amber-300 hover:bg-amber-950/40 rounded-lg transition-colors cursor-pointer"
                    >
                      <span className="text-base">⚡</span>
                      <div>
                        <div className="font-medium">Restaurar Clássicos 90</div>
                        <div className="text-[10px] text-amber-500/80">Recarregar elenco padrão original</div>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleUploadJsonFile}
              accept=".json,application/json"
              className="hidden"
            />

            {/* Back to Game Button */}
            <Link
              to="/"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors"
            >
              <span>🎮</span>
              <span className="hidden sm:inline">Jogar</span>
            </Link>

            {/* Primary Action: + Nova Carta */}
            <button
              onClick={() => openNewCard()}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-lg shadow-md shadow-emerald-950/60 transition-all hover:shadow-lg hover:shadow-emerald-900/40 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <span className="text-sm font-bold">+</span>
              <span>Nova Carta</span>
            </button>

            {/* User Profile Avatar / Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div
                className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300"
                title={userEmail ?? "Admin"}
              >
                {userEmail ? userEmail.slice(0, 2).toUpperCase() : "AD"}
              </div>
              <button
                onClick={signOut}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
                title="Sair da Conta"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-6">
        
        {/* Alerts & Notifications */}
        {error && (
          <div className="flex items-center justify-between p-3.5 bg-red-950/50 border border-red-800/60 rounded-xl text-red-200 text-sm animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-white text-xs font-bold px-2 py-1 cursor-pointer">✕</button>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center justify-between p-3.5 bg-emerald-950/50 border border-emerald-800/60 rounded-xl text-emerald-200 text-sm animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <span>✓</span>
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white text-xs font-bold px-2 py-1 cursor-pointer">✕</button>
          </div>
        )}

        {/* KPI Metrics Dashboard Bar */}
        <DashboardStatsBar cards={cards} packs={packs} />

        {/* Navigation Tabs Bar */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-800/80 pb-3">
          <nav className="flex items-center gap-1.5 p-1 bg-slate-900/80 border border-slate-800 rounded-xl overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveTab("cards")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === "cards"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/60"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <span>🎴</span>
              <span>Cartas & Coleções</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${activeTab === "cards" ? "bg-emerald-700/80 text-white" : "bg-slate-800 text-slate-400"}`}>
                {cards.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("tactical")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === "tactical"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/60"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <span>📋</span>
              <span>Visor Tático (11 Posições)</span>
            </button>

            <button
              onClick={() => setActiveTab("packs")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === "packs"
                  ? "bg-teal-600 text-white shadow-md shadow-teal-950/60"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <span>📦</span>
              <span>Pacotes & Molduras</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${activeTab === "packs" ? "bg-teal-700/80 text-white" : "bg-slate-800 text-slate-400"}`}>
                {packs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("feedback")}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === "feedback"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-950/60"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <span>💬</span>
              <span>Feedbacks</span>
            </button>
          </nav>
        </div>

        {/* Card Editor Modal/Drawer */}
        {editing && (
          <div className="animate-in fade-in duration-200">
            <CardEditorModal
              key={editorKey}
              initial={editing}
              packs={packs}
              allCards={cards}
              onCancel={() => setEditing(null)}
              onSave={handleSave}
              onSaveAndNew={handleSaveAndNew}
            />
          </div>
        )}

        {/* Tab Contents */}
        {activeTab === "cards" && (
          <CardsTab
            cards={cards}
            packs={packs}
            onEdit={(c) => {
              setEditing(c);
              setEditorKey((k) => k + 1);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onDelete={handleDelete}
          />
        )}

        {activeTab === "tactical" && (
          <TacticalDeckView
            cards={cards}
            packs={packs}
            onEditCard={(c) => {
              setEditing(c);
              setEditorKey((k) => k + 1);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onNewCardForPosition={(pos, packId, side) => {
              openNewCard(pos, packId, side);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        )}

        {activeTab === "packs" && (
          <PacksTab
            packs={packs}
            counts={packCounts}
            editing={editingPack}
            onNew={() => setEditingPack({ name: "", slug: "", description: "", sort_order: packs.length, is_active: true })}
            onEdit={(p: DBPack) => setEditingPack(p)}
            onCancelEdit={() => setEditingPack(null)}
            onSave={handleSavePack}
            onDelete={(id: string) => { const p = packs.find((x) => x.id === id); if (p) void handleDeletePack(p); }}
          />
        )}

        {activeTab === "feedback" && <FeedbackTab />}

      </main>
    </div>
  );
}

function DashboardStatsBar({ cards, packs }: { cards: DBCard[]; packs: DBPack[] }) {
  const totalCards = cards.length;
  const totalPacks = packs.length;

  const founderCards = cards.filter((c) => cardBelongsToPack(c, "fundador", packs));
  const founderP = founderCards.filter((c) => c.side === "P").length;
  const founderAI = founderCards.filter((c) => c.side === "AI").length;

  const psjCards = cards.filter((c) => cardBelongsToPack(c, "parque-sao-jorge-90", packs)).length;
  const copa90Cards = cards.filter((c) => cardBelongsToPack(c, "copa-90", packs)).length;
  const copa94Cards = cards.filter((c) => cardBelongsToPack(c, "copa-94", packs)).length;
  const copa98Cards = cards.filter((c) => cardBelongsToPack(c, "copa-98", packs)).length;
  const leoesCards = cards.filter((c) => cardBelongsToPack(c, "os-leoes", packs)).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
      {/* Stat 1: Total Cards */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-sm backdrop-blur-sm flex flex-col justify-between hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium uppercase tracking-wider">Total de Cartas</span>
          <span className="text-base">🎴</span>
        </div>
        <div className="text-3xl font-extrabold text-white mt-2 tracking-tight">
          {totalCards}
        </div>
        <div className="text-[11px] text-slate-400 mt-1">
          Cadastradas no catálogo
        </div>
      </div>

      {/* Stat 2: Active Packs */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-sm backdrop-blur-sm flex flex-col justify-between hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium uppercase tracking-wider">Pacotes & Molduras</span>
          <span className="text-base">📦</span>
        </div>
        <div className="text-3xl font-extrabold text-teal-400 mt-2 tracking-tight">
          {totalPacks}
        </div>
        <div className="text-[11px] text-slate-400 mt-1">
          Edições temáticas ativas
        </div>
      </div>

      {/* Stat 3: Founder Deck Balance */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-sm backdrop-blur-sm flex flex-col justify-between hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium uppercase tracking-wider">Deck Fundador</span>
          <span className="text-base">⚽</span>
        </div>
        <div className="text-2xl font-extrabold text-emerald-400 mt-2 flex items-center gap-1.5 tracking-tight">
          <span>{founderP} P</span>
          <span className="text-slate-600 font-normal">/</span>
          <span className="text-indigo-400">{founderAI} AI</span>
        </div>
        <div className="text-[11px] text-emerald-400/90 font-medium mt-1 flex items-center gap-1">
          <span>✓</span>
          <span>Deck 11 posições pronto</span>
        </div>
      </div>

      {/* Stat 4: Special Collections Summary */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-sm backdrop-blur-sm flex flex-col justify-between hover:border-slate-700 transition-colors">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium uppercase tracking-wider">Coleções Especiais</span>
          <span className="text-base">🏆</span>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <span className="bg-slate-800 text-slate-200 border border-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded-md">
            PSJ 90: <b className="text-white">{psjCards}</b>
          </span>
          <span className="bg-emerald-950 text-emerald-300 border border-emerald-800/60 text-[10px] font-semibold px-2 py-0.5 rounded-md">
            Copa 90: <b className="text-white">{copa90Cards}</b>
          </span>
          <span className="bg-blue-950 text-blue-300 border border-blue-800/60 text-[10px] font-semibold px-2 py-0.5 rounded-md">
            94: <b className="text-white">{copa94Cards}</b>
          </span>
          <span className="bg-rose-950 text-rose-300 border border-rose-800/60 text-[10px] font-semibold px-2 py-0.5 rounded-md">
            98: <b className="text-white">{copa98Cards}</b>
          </span>
          {leoesCards > 0 && (
            <span className="bg-amber-950 text-amber-300 border border-amber-800/60 text-[10px] font-semibold px-2 py-0.5 rounded-md">
              Leões 🔒: <b className="text-white">{leoesCards}</b>
            </span>
          )}
        </div>
        <div className="text-[11px] text-slate-400 mt-1">
          Baralhos temáticos
        </div>
      </div>
    </div>
  );
}
