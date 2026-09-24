export function renderErrorPage(error?: unknown): string {
  const errMsg = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const errStack = error instanceof Error ? error.stack : "";

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Ops! Falha ao carregar</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #0a0f1f; color: #fff; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 32rem; width: 100%; text-align: center; padding: 2rem; background: #131a30; border: 2px solid #ffd60a; border-radius: 0.75rem; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; color: #ffd60a; }
      p { color: #94a3b8; margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1rem; border-radius: 0.375rem; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; font-weight: 600; font-size: 13px; }
      .primary { background: #ffd60a; color: #0a0f1f; }
      .secondary { background: #1e293b; color: #f8fafc; border-color: #475569; }
      .danger { background: #b45309; color: #fff; }
      pre { text-align: left; background: #050811; color: #f87171; padding: 0.75rem; border-radius: 0.375rem; font-size: 11px; overflow-x: auto; margin-top: 1rem; border: 1px solid #334155; }
    </style>
  </head>
  <body>
    <div class="card">
      <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">⚠️</div>
      <h1>Ops! Falha ao carregar a página</h1>
      <p>Ocorreu uma falha no servidor SSR ao renderizar o jogo. Você pode recarregar ou limpar o cache local.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Tentar novamente</button>
        <a class="secondary" href="/">Início</a>
        <button class="danger" onclick="try{localStorage.clear();sessionStorage.clear();}catch(e){}location.href='/'">Limpar Cache</button>
      </div>
      ${errMsg ? `<details style="margin-top: 1rem; text-align: left;"><summary style="cursor:pointer; color:#94a3b8; font-size: 12px;">Detalhes do erro</summary><pre>${errMsg}\n${errStack || ""}</pre></details>` : ""}
    </div>
  </body>
</html>`;
}
