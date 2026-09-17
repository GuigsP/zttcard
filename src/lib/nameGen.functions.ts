import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  realName: z.string().min(1).max(80),
  existingNames: z.array(z.string()).max(500).default([]),
});

export const generateRetroName = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY não configurada.");

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const usedList = data.existingNames.slice(0, 300).join(", ");

    const prompt = `Você é um gerador de apelidos estilo "Bomba Patch" / PES clássico.
Recebe um nome REAL de jogador de futebol e devolve UM apelido cômico/retrô, curto (1 a 3 palavras), em Title Case (primeira letra maiúscula em cada palavra, resto minúsculo), no mesmo espírito de:
Dida → Dida Boladão, Cafu → Cafuzinho, Taffarel → Raffareldo, Ronaldo → Ronieldo, Rivaldo → Ribaldo, Neymar → Reymar, Roberto Carlos → Roberto Larcos, Bebeto → Bebetin, Gabigol → Gabiol.

Regras:
- Mantenha a "sonoridade" do nome original.
- Pode trocar letras, adicionar sufixos engraçados (-ão, -inho, -eldo, -uzinho), inverter sílabas.
- NÃO use o nome real igualzinho.
- NÃO use nenhum dos nomes já existentes abaixo.
- Escreva em Title Case (ex: "Dida Boladão"), NUNCA em CAIXA ALTA.
- Responda APENAS com o apelido final, sem aspas, sem explicação, sem pontuação final.

Nomes já existentes (evite repetir): ${usedList || "(nenhum)"}

Nome real: ${data.realName}
Apelido:`;

    try {
      const { text } = await generateText({
        model,
        prompt,
        temperature: 0.9,
      });
      const raw = text
        .split("\n")[0]
        .replace(/["'`.]/g, "")
        .trim()
        .slice(0, 40);
      if (!raw) throw new Error("Resposta vazia.");
      const minor = new Set(["de", "da", "do", "das", "dos", "e"]);
      const parts = raw.toLocaleLowerCase("pt-BR").split(/\s+/).filter(Boolean);
      const clean = parts
        .map((w, i) => {
          if (i > 0 && minor.has(w)) return w;
          return w.charAt(0).toLocaleUpperCase("pt-BR") + w.slice(1);
        })
        .join(" ");
      return { name: clean };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha na IA.";
      throw new Error(msg);
    }
  });
