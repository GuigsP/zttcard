import { useMemo, useState } from "react";
import type { Difficulty } from "../../types";
import { getPlayerWallet } from "../../economy/economyService";
import { getMasterCatalog } from "../../economy/cardCatalog";
import { getPlayerLevel } from "../../playerLevel";
import { sound } from "../../audio";
import { LS_KEYS, readJSON, writeJSON } from "../../storage";
import type { StartScreenProps } from "../mobile/StartScreenMobile";

export function StartScreenDesktop({
  onStart, onOpenTutorial, onPlayHuman, onOpenAlbum, onOpenShop, onOpenTrades, lastResult, initialPack,
}: StartScreenProps) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(() => readJSON<Difficulty>(LS_KEYS.difficulty) || "NORMAL");
  const [selectedPack] = useState<string>(() => readJSON<string>(LS_KEYS.selectedCupPack) || initialPack || "copa-90");
  const [playMode, setPlayMode] = useState<"solo" | "online">("solo");
  const wallet = getPlayerWallet();
  const playerLevel = getPlayerLevel();
  const catalog = getMasterCatalog() || [];

  const squadPreviewCards = useMemo(() => {
    const cards = catalog.filter((c) => c && c.position);
    const le = cards.find((c) => c.position === "LE" || c.position === "LD") || cards[0];
    const ata = cards.find((c) => c.position === "ATA" || c.position === "PD" || c.position === "PE") || cards[1];
    const vol = cards.find((c) => c.position === "VOL" || c.position === "MC" || c.position === "MEI") || cards[2];
    const gol = cards.find((c) => c.position === "GOL") || cards[3];
    return [le || { id: "1", name: "OLIVEIRA", position: "LE", ovr: 92 }, ata || { id: "2", name: "FERREIRA", position: "ATA", ovr: 90 }, vol || { id: "3", name: "SANTOS", position: "VOL", ovr: 88 }, gol || { id: "4", name: "COSTA", position: "GOL", ovr: 89 }];
  }, [catalog]);

  const handleSelectDifficulty = (d: Difficulty) => {
    sound.playAttrSelect();
    setSelectedDifficulty(d);
    writeJSON(LS_KEYS.difficulty, d);
  };
  const handlePlayNow = () => {
    sound.playWhistle();
    if (playMode === "online") onPlayHuman();
    else onStart(selectedDifficulty, selectedPack);
  };
  const difficultyLabel = selectedDifficulty === "EASY" ? "FÁCIL" : selectedDifficulty === "HARD" ? "DIFÍCIL" : "MÉDIO";

  return (
    <div className="relative flex min-h-screen min-h-[100dvh] flex-col overflow-x-hidden bg-[#070e1b] px-5 py-5 text-arcade-cream sm:px-8 lg:px-12">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(29,78,216,0.16),transparent_72%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,.3)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.3)_1px,transparent_1px)] [background-size:32px_32px]" />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="shrink-0">
          <span className="block font-arcade text-sm tracking-tight text-arcade-yellow sm:text-base">ZERO TO TOP</span>
          <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">CARD <span className="text-emerald-400">/</span> DUELO RETRÔ</span>
        </div>
        <nav className="hidden items-center gap-1 rounded-full border border-white/10 bg-slate-950/70 p-1 md:flex" aria-label="Navegação principal">
          <span className="rounded-full bg-arcade-yellow px-4 py-2 text-xs font-black text-[#111827]">⚽ Jogar</span>
          <button type="button" onClick={onOpenAlbum} className="rounded-full px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white">Álbum</button>
          <button type="button" onClick={onOpenShop} className="rounded-full px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white">Banca</button>
          <button type="button" onClick={onOpenTrades} className="rounded-full px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white">Pracinha</button>
        </nav>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onOpenShop} title="Abrir banca" className="flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/5 px-3 py-2 text-xs font-bold text-amber-200 transition hover:border-amber-300/50"><span>🪙</span><span>{wallet.coins}</span><span className="text-amber-400">+</span></button>
          <button type="button" onClick={onOpenTutorial} title="Ajuda e configurações" aria-label="Ajuda e configurações" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-arcade-yellow/50 hover:text-arcade-yellow">⚙</button>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-5 py-6 sm:py-8">
        <section className="relative isolate grid min-h-[340px] overflow-hidden rounded-3xl border border-white/10 bg-[#0c1728] shadow-[0_24px_80px_rgba(0,0,0,.35)] lg:grid-cols-[1.25fr_.75fr]">
          <img src="/hero-entrar-em-campo.jpg" alt="" aria-hidden="true" className="absolute inset-0 -z-20 h-full w-full object-cover object-center opacity-45" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#07101f] via-[#07101f]/90 to-[#07101f]/35" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#07101f]/90 via-transparent to-[#07101f]/20" />
          <div className="flex flex-col items-start justify-center p-7 sm:p-10 lg:p-12">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-200"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />O próximo jogo começa aqui</div>
            <h1 className="max-w-xl font-display text-5xl font-black uppercase leading-[0.9] tracking-wide text-white sm:text-6xl lg:text-7xl">Seu time.<br /><span className="text-arcade-yellow">Sua história.</span></h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-300 sm:text-base">Monte sua estratégia, escolha suas cartas e entre em campo. A próxima vitória está a um botão de distância.</p>
            <button type="button" onClick={handlePlayNow} className="mt-7 inline-flex min-h-14 items-center gap-3 rounded-xl bg-arcade-yellow px-6 py-4 font-arcade text-[11px] text-[#101522] shadow-[0_5px_0_#a16207,0_12px_30px_rgba(0,0,0,.3)] transition hover:-translate-y-0.5 hover:bg-yellow-300 active:translate-y-1 active:shadow-none sm:px-8 sm:text-xs"><span className="text-lg">⚽</span><span>{playMode === "solo" ? "JOGAR AGORA" : "BUSCAR ADVERSÁRIO"}</span><span aria-hidden="true">→</span></button>
            <p className="mt-3 text-[11px] text-slate-400">Partida rápida <span className="px-1.5 text-slate-600">·</span> Recompensas a cada jogo</p>
          </div>

          <div className="flex flex-col justify-center border-t border-white/10 bg-[#081222]/75 p-6 sm:p-8 lg:border-l lg:border-t-0">
            <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Modo de jogo</p><p className="mt-1 font-display text-2xl font-bold uppercase tracking-wide text-white">{playMode === "solo" ? "Solo vs IA" : "1 contra 1"}</p></div><span className="text-2xl">{playMode === "solo" ? "🤖" : "🆚"}</span></div>
            <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-black/20 p-1.5">
              <button type="button" onClick={() => setPlayMode("solo")} className={`rounded-lg px-3 py-2.5 text-xs font-bold transition ${playMode === "solo" ? "bg-white/10 text-white shadow-inner" : "text-slate-400 hover:text-white"}`}>Solo vs IA</button>
              <button type="button" onClick={() => setPlayMode("online")} className={`rounded-lg px-3 py-2.5 text-xs font-bold transition ${playMode === "online" ? "bg-white/10 text-white shadow-inner" : "text-slate-400 hover:text-white"}`}>Jogar online</button>
            </div>
            <div className="mt-6">
              <div className="mb-2.5 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{playMode === "solo" ? "Dificuldade da IA" : "Partida online"}</span>{playMode === "solo" && <span className="text-xs font-semibold text-arcade-yellow">{difficultyLabel}</span>}</div>
              {playMode === "solo" ? <div className="grid grid-cols-3 gap-2">{(["EASY", "NORMAL", "HARD"] as Difficulty[]).map((d) => { const active = selectedDifficulty === d; const label = d === "EASY" ? "Fácil" : d === "HARD" ? "Difícil" : "Médio"; return <button key={d} type="button" onClick={() => handleSelectDifficulty(d)} aria-pressed={active} className={`rounded-lg border px-2 py-3 text-xs font-bold transition ${active ? "border-arcade-yellow/70 bg-arcade-yellow/10 text-arcade-yellow" : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/25 hover:text-white"}`}>{label}</button>; })}</div> : <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3 text-xs leading-relaxed text-slate-400">Encontre um adversário e teste seu esquadrão contra outro treinador.</p>}
            </div>
            <button type="button" onClick={onOpenTutorial} className="mt-5 self-start text-xs font-semibold text-slate-400 transition hover:text-arcade-yellow">Como jogar e dicas <span aria-hidden="true">↗</span></button>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
          <div className="rounded-2xl border border-white/10 bg-[#0b1525]/90 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Preparação</p><h2 className="mt-1 font-display text-xl font-bold uppercase tracking-wide text-white">Seu esquadrão</h2></div><button type="button" onClick={onOpenAlbum} className="rounded-lg px-3 py-2 text-xs font-bold text-arcade-yellow transition hover:bg-arcade-yellow/10">Ver álbum <span aria-hidden="true">→</span></button></div>
            <div className="grid grid-cols-4 gap-2 sm:gap-3">{squadPreviewCards.map((card, index) => <button key={`${card.id}-${index}`} type="button" onClick={onOpenAlbum} className="group min-w-0 rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-black/20 p-2 text-left transition hover:border-arcade-yellow/40 hover:bg-white/[0.07] sm:p-3"><div className="flex items-center justify-between gap-1"><span className="font-display text-xl font-bold leading-none text-arcade-yellow sm:text-2xl">{card.ovr ?? 88}</span><span className="rounded bg-emerald-400/10 px-1.5 py-1 text-[9px] font-bold text-emerald-300">{card.position}</span></div><div className="my-2 flex aspect-square items-center justify-center rounded-lg bg-[#111f32] text-2xl transition group-hover:scale-[1.02] sm:text-3xl">⚽</div><span className="block truncate text-[9px] font-bold uppercase tracking-wide text-slate-300 group-hover:text-white sm:text-[10px]">{card.name}</span></button>)}</div>
          </div>

          <div className="flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-[#0b1525]/90 p-4 sm:p-5">
            <div><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Sua carreira</p><h2 className="mt-1 font-display text-xl font-bold uppercase tracking-wide text-white">{playerLevel.title}</h2><p className="mt-1 text-xs text-slate-400">Nível {playerLevel.level} <span className="px-1 text-slate-600">·</span> Fase {playerLevel.phase}</p></div><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-300/10 text-xl">🏟️</div></div><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${playerLevel.progressPercent}%` }} /></div><div className="mt-1.5 flex justify-between text-[10px] text-slate-500"><span>Progresso</span><span>{playerLevel.xp} / {playerLevel.nextLevelXp} XP</span></div></div>
            <div className="border-t border-white/10 pt-3"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Última partida</p>{lastResult ? <p className="mt-1 text-sm font-bold text-white">Você <span className="text-arcade-yellow">{lastResult.goals.p} × {lastResult.goals.ai}</span> IA</p> : <p className="mt-1 text-xs text-slate-400">Sua história começa no apito inicial.</p>}</div><div className="text-right"><p className="text-[10px] text-slate-500">Pacotes</p><p className="mt-1 text-sm font-bold text-arcade-yellow">{wallet.unopenedPacks ?? 0} <span className="text-xs font-medium text-slate-400">disponíveis</span></p></div></div></div>
          </div>
        </section>

        <nav className="grid grid-cols-3 gap-2 sm:gap-3 md:hidden" aria-label="Atalhos"><button type="button" onClick={onOpenAlbum} className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-3 text-xs font-bold text-slate-300">🎴 Álbum</button><button type="button" onClick={onOpenShop} className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-3 text-xs font-bold text-slate-300">🪙 Banca</button><button type="button" onClick={onOpenTrades} className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-3 text-xs font-bold text-slate-300">👟 Pracinha</button></nav>
      </main>

      <footer className="relative z-10 mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3 text-[10px] text-slate-500"><span className="font-semibold uppercase tracking-[0.2em]">Colecione <span className="px-1 text-slate-700">·</span> Monte <span className="px-1 text-slate-700">·</span> Conquiste</span><span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Rádio retrô recolhido <span className="text-slate-600">—</span> toque no player para expandir</span></footer>
    </div>
  );
}
