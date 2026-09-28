import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isAdmin } from "@/game/cardsRepo";
import { sound } from "@/game/audio";
import { LS_KEYS, writeJSON } from "@/game/storage";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Entrar ou Criar Conta — Zero to Top | Card" },
      { name: "description", content: "Acesse sua coleção e dispute duelos retrô no Zero to Top Card." },
    ],
  }),
});

type AuthMode = "login" | "register";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nickname, setNickname] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Se já estiver logado, redireciona adequadamente
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        const ok = await isAdmin(data.user.id, data.user.email);
        if (ok) {
          navigate({ to: "/admin" });
        } else {
          navigate({ to: "/" });
        }
      }
    });
  }, [navigate]);

  // Login com Google
  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);
    try {
      sound.playAttrSelect();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao conectar com Google.");
      setLoading(false);
    }
  }

  // Login com E-mail e Senha
  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();

    try {
      sound.playAttrSelect();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (error) throw error;
      if (!data.user) throw new Error("Usuário não encontrado.");

      const authorized = await isAdmin(data.user.id, data.user.email);
      if (authorized) {
        navigate({ to: "/admin" });
      } else {
        navigate({ to: "/" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na autenticação.");
    } finally {
      setLoading(false);
    }
  }

  // Cadastro com E-mail e Senha
  async function handleEmailRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (password !== confirmPassword) {
      setError("As senhas informadas não coincidem.");
      setLoading(false);
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanNickname = nickname.trim() || "Treinador";

    try {
      sound.playAttrSelect();
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            nickname: cleanNickname,
            avatar: "av1",
          },
        },
      });
      if (error) throw error;

      if (data.session) {
        writeJSON(LS_KEYS.nickname, cleanNickname);
        sound.playCoinEarn();
        navigate({ to: "/" });
      } else {
        setSuccessMessage("Conta criada com sucesso! Faça login ou verifique a confirmação no seu e-mail.");
        setMode("login");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar conta.");
    } finally {
      setLoading(false);
    }
  }

  // Modo Convidado (Visitante)
  function handleGuestMode() {
    sound.playAttrSelect();
    if (typeof window !== "undefined") {
      localStorage.setItem("ztt.auth.guest", "true");
    }
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-arcade-blue flex items-center justify-center p-3 sm:p-6 relative selection:bg-arcade-yellow selection:text-arcade-dark">
      {/* Luzes / Efeito Arcade de Fundo */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-arcade-yellow/15 blur-3xl rounded-full pointer-events-none" />

      <div className="w-full max-w-md bg-gradient-to-b from-arcade-dark to-slate-950 border-4 border-arcade-yellow shadow-2xl rounded-2xl p-5 sm:p-7 relative z-10">
        
        {/* ── 1. LOGO & TÍTULO RETRÔ ── */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-arcade-blue border-2 border-arcade-yellow shadow mb-2 text-2xl animate-pulse">
            ⚽
          </div>
          <h1 className="font-arcade text-xl sm:text-2xl text-arcade-yellow drop-shadow-[2px_2px_0_var(--arcade-dark)] tracking-wider leading-none">
            ZERO TO TOP
          </h1>
          <div className="font-display text-[9px] sm:text-[10px] text-arcade-cream/80 tracking-widest uppercase mt-1">
            CARD · DUELO RETRÔ ANOS 90
          </div>
        </div>

        {/* ── 2. SELETOR DE ABAS (ENTRAR | CRIAR CONTA) ── */}
        <div className="grid grid-cols-2 gap-1.5 bg-black/50 p-1 rounded-xl border border-arcade-yellow/30 mb-5">
          <button
            type="button"
            onClick={() => {
              sound.playAttrSelect();
              setMode("login");
              setError(null);
            }}
            className={`py-2 rounded-lg font-arcade text-xs transition-all cursor-pointer ${
              mode === "login"
                ? "bg-gradient-to-r from-arcade-yellow to-amber-500 text-arcade-dark font-bold shadow"
                : "text-arcade-cream/70 hover:text-arcade-cream"
            }`}
          >
            ENTRAR
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playAttrSelect();
              setMode("register");
              setError(null);
            }}
            className={`py-2 rounded-lg font-arcade text-xs transition-all cursor-pointer ${
              mode === "register"
                ? "bg-gradient-to-r from-arcade-yellow to-amber-500 text-arcade-dark font-bold shadow"
                : "text-arcade-cream/70 hover:text-arcade-cream"
            }`}
          >
            CRIAR CONTA
          </button>
        </div>

        {/* ── 3. BOTÃO 1-CLIQUE GOOGLE ── */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-sans font-bold text-xs py-3 px-4 rounded-xl shadow border-2 border-slate-300 transition-all cursor-pointer active:scale-95 disabled:opacity-60 mb-4"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continuar com o Google (1 clique)</span>
        </button>

        {/* Divisor Retrô */}
        <div className="flex items-center gap-2 mb-4">
          <div className="h-px bg-arcade-yellow/30 flex-1" />
          <span className="font-arcade text-[8px] text-arcade-cream/60 uppercase tracking-widest">
            OU COM SEU E-MAIL
          </span>
          <div className="h-px bg-arcade-yellow/30 flex-1" />
        </div>

        {/* ── 4. FORMULÁRIO (LOGIN OU CADASTRO) ── */}
        <form onSubmit={mode === "login" ? handleEmailLogin : handleEmailRegister} className="space-y-3">
          
          {mode === "register" && (
            <div>
              <label className="font-arcade text-[9px] text-arcade-yellow block mb-1">
                👤 APELIDO DE TREINADOR
              </label>
              <input
                type="text"
                required
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border-2 border-arcade-yellow/60 bg-black/60 font-body text-sm text-arcade-cream placeholder:text-arcade-cream/30 focus:border-arcade-yellow focus:outline-none transition-colors"
                placeholder="Ex: Zico90, Fenômeno..."
                autoComplete="nickname"
              />
            </div>
          )}

          <div>
            <label className="font-arcade text-[9px] text-arcade-yellow block mb-1">
              ✉️ SEU E-MAIL
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border-2 border-arcade-yellow/60 bg-black/60 font-body text-sm text-arcade-cream placeholder:text-arcade-cream/30 focus:border-arcade-yellow focus:outline-none transition-colors"
              placeholder="voce@exemplo.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="font-arcade text-[9px] text-arcade-yellow block mb-1">
              🔑 SENHA
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border-2 border-arcade-yellow/60 bg-black/60 font-body text-sm text-arcade-cream placeholder:text-arcade-cream/30 focus:border-arcade-yellow focus:outline-none transition-colors"
              placeholder="••••••••"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>

          {mode === "register" && (
            <div>
              <label className="font-arcade text-[9px] text-arcade-yellow block mb-1">
                🔒 CONFIRMAR SENHA
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border-2 border-arcade-yellow/60 bg-black/60 font-body text-sm text-arcade-cream placeholder:text-arcade-cream/30 focus:border-arcade-yellow focus:outline-none transition-colors"
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
          )}

          {error && (
            <div className="font-body text-xs text-rose-300 bg-rose-950/70 border border-rose-600 rounded-xl px-3 py-2 text-center">
              ⚠️ {error}
            </div>
          )}

          {successMessage && (
            <div className="font-body text-xs text-emerald-300 bg-emerald-950/70 border border-emerald-600 rounded-xl px-3 py-2 text-center">
              ✅ {successMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full font-arcade text-xs bg-gradient-to-b from-arcade-yellow via-amber-400 to-amber-500 text-arcade-dark border-2 border-arcade-cream py-3 rounded-xl hover:brightness-105 active:translate-y-0.5 shadow-lg font-black tracking-wider transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? "CARREGANDO..." : mode === "login" ? "⚽ ENTRAR NO JOGO" : "⭐ CRIAR MINHA CONTA"}
          </button>
        </form>

        {/* ── 5. MODO CONVIDADO (VISITANTE ZERO FRICÇÃO) ── */}
        <div className="mt-5 pt-4 border-t-2 border-arcade-yellow/20 text-center">
          <button
            type="button"
            onClick={handleGuestMode}
            className="w-full font-arcade text-[10px] sm:text-xs py-2.5 px-4 bg-arcade-blue/50 hover:bg-arcade-blue border border-arcade-yellow/50 text-arcade-cream hover:text-arcade-yellow rounded-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2 mb-2"
          >
            <span>🎮</span>
            <span>JOGAR COMO CONVIDADO (MODO VISITANTE)</span>
          </button>
          <p className="font-body text-[10px] text-arcade-cream/60 leading-tight">
            Seu progresso fica salvo neste navegador. Você poderá vincular uma conta gratuita a qualquer momento para não perder suas cartas!
          </p>
        </div>

        {/* Link Voltar */}
        <div className="mt-4 text-center">
          <Link to="/" className="font-arcade text-[9px] text-arcade-yellow/70 hover:text-arcade-yellow underline">
            ← CONTINUAR PARA O JOGO
          </Link>
        </div>

      </div>
    </div>
  );
}
