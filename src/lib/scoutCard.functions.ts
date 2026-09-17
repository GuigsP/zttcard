import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { attrsForPosition, POSITIONS, type Position } from "@/game/types";
import {
  calculateCardOverall,
  distributeAttributesForOverall,
  getRarityFromOverall,
  type CompetitionTier,
  type SquadRole,
} from "@/types/cardScale";

const ScoutInputSchema = z.object({
  realName: z.string().min(1).max(80),
  position: z.enum(POSITIONS as [Position, ...Position[]]),
  teamOrSelection: z.string().max(80).optional().default(""),
  year: z.string().max(20).optional().default(""),
  championship: z.string().max(80).optional().default(""),
  competitionTier: z.enum(["COPA_DO_MUNDO", "CONTINENTAL", "LIGA_NACIONAL", "ESTADUAL"]).optional().default("LIGA_NACIONAL"),
  squadRole: z.enum(["TITULAR", "RESERVA_1", "RESERVA_2", "RESERVA_3"]).optional().default("TITULAR"),
  existingNames: z.array(z.string()).max(500).default([]),
});

export type ScoutResult = {
  suggestedName: string;
  suggestedPosition?: Position;
  competitionTier: CompetitionTier;
  squadRole: SquadRole;
  baseScore: number;
  ovr: number;
  rarity: "comum" | "rara" | "epica" | "lendaria";
  attrs: Record<string, number>;
  quote: string;
  visualPrompt: string;
};

export const scoutCardFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => ScoutInputSchema.parse(data))
  .handler(async ({ data }): Promise<ScoutResult> => {
    const geminiKey = process.env.GEMINI_API_KEY;
    const lovableKey = process.env.LOVABLE_API_KEY;
    const requiredAttrs = attrsForPosition(data.position);
    const usedList = data.existingNames.slice(0, 200).join(", ");

    const prompt = `Você é o Historiador e Engenheiro Matemático Oficial do jogo retrô de futebol brasileiro "Zero to Top | Card".
Você cria figurinhas estilo Super Trunfo, International Superstar Soccer (Allejo) e Bomba Patch dos anos 90 com cálculo ponderado de Overall.

Analise o atleta real usando rigorosamente as 4 chaves históricas fornecidas:
1. ATLETA REAL: "${data.realName}"
2. TIME OU SELEÇÃO: "${data.teamOrSelection || "Geral"}"
3. ANO OU ÉPOCA: "${data.year || "Auge"}"
4. CAMPEONATO: "${data.championship || "Geral"}"
5. NÍVEL DE COMPETIÇÃO FORNECIDO: "${data.competitionTier}"
6. STATUS NO ELENCO FORNECIDO: "${data.squadRole}"
7. POSIÇÃO INFORMADA: "${data.position}"
8. POSIÇÕES VÁLIDAS: ["GOL", "LD", "ZAD", "ZAE", "LE", "VOL", "M8", "M10", "PD", "PE", "ATA"]
9. ATRIBUTOS DA POSIÇÃO: ${requiredAttrs.join(", ")}

FÓRMULA DE CÁLCULO PONDERADO DE OVERALL:
Overall = Base do Atleta + Modificador de Competição + Modificador de Status no Elenco (Travado entre 40 e 99)

- Base do Atleta (Qualidade intrínseca da carreira):
  * GOAT / Lenda Mundial (Pelé, Zico, Ronaldinho, Romário, Ronaldo Fenômeno): Base 86 a 90
  * Craque / Titular de Seleção / Ídolo Consagrado (Rivaldo, Cafu, Roberto Carlos, Neto, Dida, Raí): Base 80 a 85
  * Coadjuvante de Alto Nível / Titular de Grande Clube (Juninho Paulista, Denílson, Viola, Marcelo Djian): Base 74 a 79
  * Operário / Composição de Elenco / Reserva (Vampeta, Dagoberto reserva, Anderson Polga, Jacenir): Base 68 a 73
  * Várzea / Aposta da Base / Início de carreira: Base 40 a 67

- Modificador de Competição (competitionTier):
  * "COPA_DO_MUNDO": +5 pts (Reta final / título de Copa)
  * "CONTINENTAL": +3 pts (Libertadores / Champions League)
  * "LIGA_NACIONAL": +0 pts (Brasileirão / LaLiga / Série A)
  * "ESTADUAL": -3 pts (Paulistão / Carioca / Início de carreira)

- Modificador de Status no Elenco (squadRole):
  * "TITULAR": +4 pts (Titular Absoluto / Protagonista da campanha)
  * "RESERVA_1": +1 pt (1º Reserva / 12º jogador / entra em todo jogo)
  * "RESERVA_2": -2 pts (2º Reserva / rotação secundária)
  * "RESERVA_3": -5 pts (3º Reserva / convocado de composição)

REGRAS DE CRIAÇÃO DO NOME PARÓDIA (PADRÃO ALLEJO / ANOS 90):
Crie um nome cômico, carismático e imediatamente reconhecível usando uma destas 3 fórmulas:
- Regra 1: Fusão com Várzea/Comida/Gíria/Apelido de Rua (ex: Tafferalho, Romarinho Peixe, Didão Parede, Zetti da Fiel, Ray Terror do Morumbi, Edmundão Animal).
- Regra 2: Sufixo Diminutivo ou Aumentativo Caricato (ex: Cafuzinho 2 Pulmões, Vampetinha do Povo, Rivaldão Perna Torta, Jorginho Perna Fina, Marcão Canelada, Mullerzinho Liso).
- Regra 3: Paródia Fonética ISS / Bomba Patch (ex: Zunga Capitão, Berbeto Embala-Neném, Mauro Sivestre, Roberto Carlinhos, Denilshow dos Dribles).
NÃO use nomes já cadastrados: [${usedList || "nenhum"}].

FRASE DE EFEITO:
- Escreva uma frase curta (máximo 80 caracteres), cômica ou lendária da crônica esportiva / várzea dos anos 90.

Responda ESTRITAMENTE em formato JSON com este schema:
{
  "suggestedName": "Nome Paródia Anos 90",
  "suggestedPosition": "POSIÇÃO_VÁLIDA",
  "competitionTier": "${data.competitionTier}",
  "squadRole": "${data.squadRole}",
  "baseScore": 84,
  "ovr": 88,
  "attrs": {
    ${requiredAttrs.map((k) => `"${k}": 88`).join(",\n    ")}
  },
  "quote": "Frase de efeito marcante",
  "visualPrompt": "Descrição da caricatura retrô"
}`;

    // 1. Google Gemini API Call
    if (geminiKey) {
      try {
        type GeminiResponse = {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        let resData: GeminiResponse | null = null;
        const models = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.0-flash"];

        for (const model of models) {
          try {
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: prompt }] }],
                  generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0.7,
                  },
                }),
              }
            );

            if (response.ok) {
              resData = (await response.json()) as GeminiResponse;
              break;
            }
          } catch {
            // try next
          }
        }

        if (resData) {
          const rawJson = resData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawJson) {
            const parsed = JSON.parse(rawJson) as {
              suggestedName?: string;
              suggestedPosition?: string;
              competitionTier?: CompetitionTier;
              squadRole?: SquadRole;
              baseScore?: number;
              ovr?: number;
              attrs?: Record<string, number>;
              quote?: string;
              visualPrompt?: string;
            };

            const competition = (parsed.competitionTier || data.competitionTier) as CompetitionTier;
            const role = (parsed.squadRole || data.squadRole) as SquadRole;
            const baseScore = typeof parsed.baseScore === "number" ? Math.min(90, Math.max(40, Math.round(parsed.baseScore))) : 78;
            
            // Exact formula verification
            const exactOvr = calculateCardOverall(baseScore, competition, role);
            const validPos = POSITIONS.includes(parsed.suggestedPosition as Position)
              ? (parsed.suggestedPosition as Position)
              : data.position;

            // Distribute attributes around the calculated overall
            const finalAttrs = distributeAttributesForOverall(validPos, exactOvr);
            if (parsed.attrs) {
              for (const k of requiredAttrs) {
                if (typeof parsed.attrs[k] === "number") {
                  finalAttrs[k] = Math.min(99, Math.max(40, Math.round(parsed.attrs[k])));
                }
              }
            }

            return {
              suggestedName: (parsed.suggestedName || data.realName).trim(),
              suggestedPosition: validPos,
              competitionTier: competition,
              squadRole: role,
              baseScore,
              ovr: exactOvr,
              rarity: getRarityFromOverall(exactOvr),
              attrs: finalAttrs,
              quote: (parsed.quote || `Lenda dos gramados em ${data.year || "campo"}.`).trim().slice(0, 90),
              visualPrompt: (parsed.visualPrompt || `Caricatura retrô de ${data.realName}`).trim(),
            };
          }
        }
      } catch (err) {
        console.error("Erro Gemini Scout:", err);
      }
    }

    // 2. Lovable Gateway Fallback
    if (lovableKey) {
      try {
        const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
        const gateway = createLovableAiGatewayProvider(lovableKey);
        const model = gateway("google/gemini-2.5-flash");

        const { text } = await generateText({
          model,
          prompt,
          temperature: 0.7,
        });

        const cleanJson = text.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanJson);

        const competition = (parsed.competitionTier || data.competitionTier) as CompetitionTier;
        const role = (parsed.squadRole || data.squadRole) as SquadRole;
        const baseScore = typeof parsed.baseScore === "number" ? Math.min(90, Math.max(40, Math.round(parsed.baseScore))) : 78;
        const exactOvr = calculateCardOverall(baseScore, competition, role);
        const validPos = POSITIONS.includes(parsed.suggestedPosition as Position)
          ? (parsed.suggestedPosition as Position)
          : data.position;
        const finalAttrs = distributeAttributesForOverall(validPos, exactOvr);

        return {
          suggestedName: (parsed.suggestedName || data.realName).trim(),
          suggestedPosition: validPos,
          competitionTier: competition,
          squadRole: role,
          baseScore,
          ovr: exactOvr,
          rarity: getRarityFromOverall(exactOvr),
          attrs: finalAttrs,
          quote: (parsed.quote || `Craque consagrado em ${data.year || "campo"}.`).trim().slice(0, 90),
          visualPrompt: (parsed.visualPrompt || `Caricatura retrô de ${data.realName}`).trim(),
        };
      } catch (err) {
        console.error("Erro Lovable Scout:", err);
      }
    }

    // 3. Smart Local 90s Parody & Math Engine
    const nameLower = data.realName.toLowerCase();
    let parodyName = `${data.realName} Paródia`;
    let baseScore = 74;

    if (nameLower.includes("ronaldinho") && (nameLower.includes("gaucho") || nameLower.includes("gaúcho"))) {
      parodyName = "Ronaldinho dos Rolês";
      baseScore = 88;
    } else if (nameLower.includes("romario") || nameLower.includes("romário")) {
      parodyName = "Romarinho Peixe";
      baseScore = 89;
    } else if (nameLower.includes("ronaldo") && (nameLower.includes("fenomeno") || nameLower.includes("fenômeno"))) {
      parodyName = "Ronaldo Fenômeno";
      baseScore = 90;
    } else if (nameLower.includes("ronaldo") && (nameLower.includes("giovanelli") || nameLower.includes("corinthians"))) {
      parodyName = "Ronaldo Muralha";
      baseScore = 84;
    } else if (nameLower.includes("dagoberto")) {
      parodyName = "Dagoberto Reserva Seguro";
      baseScore = 71;
    } else if (nameLower.includes("neto")) {
      parodyName = "Neto Canhão da Fiel";
      baseScore = 88;
    } else if (nameLower.includes("taffarel")) {
      parodyName = "Tafferalho";
      baseScore = 86;
    } else if (nameLower.includes("dida")) {
      parodyName = "Didão Parede";
      baseScore = 86;
    } else if (nameLower.includes("cafu")) {
      parodyName = "Cafuzinho 2 Pulmões";
      baseScore = 86;
    } else if (nameLower.includes("rivaldo")) {
      parodyName = "Rivaldão Perna Torta";
      baseScore = 87;
    } else if (nameLower.includes("roberto carlos")) {
      parodyName = "Roberto Carlinhos";
      baseScore = 87;
    } else if (nameLower.includes("dunga")) {
      parodyName = "Zunga Capitão";
      baseScore = 83;
    } else if (nameLower.includes("juninho") && nameLower.includes("paulista")) {
      parodyName = "Juninho do Drible Curto";
      baseScore = 76;
    } else if (nameLower.includes("vampeta")) {
      parodyName = "Vampeta da Cambalhota";
      baseScore = 71;
    } else {
      const parts = data.realName.trim().split(" ");
      const firstName = parts[0];
      const suffix =
        data.position === "GOL"
          ? "Paredão"
          : data.position === "ATA" || data.position === "PE" || data.position === "PD"
          ? "do Gol"
          : data.position === "M10" || data.position === "M8"
          ? "Maestro"
          : "Canelada";
      parodyName = `${firstName}zinho ${suffix}`;
    }

    const calculatedOvr = calculateCardOverall(baseScore, data.competitionTier as CompetitionTier, data.squadRole as SquadRole);
    const finalAttrs = distributeAttributesForOverall(data.position, calculatedOvr);

    return {
      suggestedName: parodyName,
      suggestedPosition: data.position,
      competitionTier: data.competitionTier as CompetitionTier,
      squadRole: data.squadRole as SquadRole,
      baseScore,
      ovr: calculatedOvr,
      rarity: getRarityFromOverall(calculatedOvr),
      attrs: finalAttrs,
      quote: `Destaque do ${data.teamOrSelection || "clube"} em ${data.year || "campo"}.`,
      visualPrompt: `Caricatura retrô de futebol anos 90 de ${data.realName}.`,
    };
  });
