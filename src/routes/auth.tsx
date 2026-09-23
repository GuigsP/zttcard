import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import { isAdmin, ADMIN_EMAILS } from "@/game/cardsRepo";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Entrar — Zero to Top | Card Studio" },
      { name: "description", content: "Acesso restrito ao Painel do Administrador." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        const ok = await isAdmin(data.user.id, data.user.email);
        if (ok) {
          navigate({ to: "/admin" });
        }
      }
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    const cleanEmail = email.trim().toLowerCase();

    try {
      if (mode === "signup") {
        if (!ADMIN_EMAILS.includes(cleanEmail)) {
          throw new Error("O cadastro no Studio é restrito a e-mails autorizados pela administração.");
        }
        const { error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { emailRedirectTo: window.location.origin + "/admin" },
        });
        if (error) throw error;
        setInfo("Conta de administrador criada com sucesso. Faça login.");
        setMode("login");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) throw error;
        if (!data.user) throw new Error("Usuário não encontrado.");

        const authorized = await isAdmin(data.user.id, data.user.email);
        if (!authorized) {
          await supabase.auth.signOut();
          throw new Error("Acesso negado: esta conta não possui privilégios de administrador.");
        }

        navigate({ to: "/admin" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na autenticação.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-arcade-blue flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-arcade-cream border-4 border-arcade-dark shadow-arcade p-6">
        <div className="text-center mb-6">
          <div className="font-arcade text-2xl text-arcade-red">
            ZERO TO TOP | CARD
          </div>
          <div className="font-arcade text-xs text-arcade-dark mt-2">
            PAINEL DO ADMINISTRADOR
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 font-arcade text-[10px] py-2 border-2 border-arcade-dark ${
              mode === "login" ? "bg-arcade-yellow text-arcade-dark" : "bg-arcade-cream text-arcade-dark"
            }`}
          >
            ENTRAR
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 font-arcade text-[10px] py-2 border-2 border-arcade-dark ${
              mode === "signup" ? "bg-arcade-yellow text-arcade-dark" : "bg-arcade-cream text-arcade-dark"
            }`}
          >
            CRIAR CONTA
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="font-arcade text-[10px] text-arcade-dark block mb-1">E-MAIL</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-3 border-2 border-arcade-dark bg-white font-body text-base text-arcade-dark placeholder:text-arcade-dark/40 tracking-wide"
              placeholder="voce@exemplo.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="font-arcade text-[10px] text-arcade-dark block mb-1">SENHA</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-3 border-2 border-arcade-dark bg-white font-body text-lg text-arcade-dark placeholder:text-arcade-dark/40 tracking-[0.3em]"
              placeholder="••••••••"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </div>
          {error && (
            <div className="font-body text-sm text-arcade-red border-2 border-arcade-red px-3 py-2">
              {error}
            </div>
          )}
          {info && (
            <div className="font-body text-sm text-arcade-dark border-2 border-arcade-green px-3 py-2 bg-arcade-green/10">
              {info}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full font-arcade text-xs bg-arcade-red text-arcade-cream border-2 border-arcade-dark py-3 hover:bg-arcade-dark disabled:opacity-60"
          >
            {loading ? "..." : mode === "login" ? "ENTRAR" : "CRIAR CONTA"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link to="/" className="font-arcade text-[10px] text-arcade-dark underline">
            ← VOLTAR PARA O JOGO
          </Link>
        </div>
      </div>
    </div>
  );
}
