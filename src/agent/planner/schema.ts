import { AGENT_TOOLS } from "@/agent/tools/registry";

function buildSchema() {
  const extras: Record<string, unknown> = {};
  for (const tool of AGENT_TOOLS) Object.assign(extras, tool.parameters ?? {});
  const properties = {
    intent: { type: "string", enum: AGENT_TOOLS.map((tool) => tool.name) },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    term: {
      type: "string",
      maxLength: 60,
      description:
        "Termo central e conciso da ação, com no máximo 4 palavras; nunca concatene palavras da resposta. Vazio quando não se aplica.",
    },
    ...extras,
  };
  return {
    type: "object",
    // A ordem é a ordem de geração. `reason` vem primeiro de propósito: é o
    // único espaço em que o modelo raciocina antes de decidir. Quando ele
    // vinha depois, a decisão já estava escrita e a justificativa era
    // retrospectiva.
    properties: {
      reason: {
        type: "string",
        description:
          "Antes de decidir: em uma frase, o que o usuário quer neste turno e se alguma ação acrescenta algo que a resposta sozinha não dá.",
      },
      responseMode: {
        type: "string",
        enum: ["full", "direct", "corpus"],
      },
      responseConfidence: { type: "number", minimum: 0, maximum: 1 },
      actions: {
        type: "array",
        maxItems: 2,
        description:
          "Ações independentes da resposta. Lista vazia é o resultado esperado na maioria dos turnos.",
        items: {
          type: "object",
          properties,
          required: Object.keys(properties),
          additionalProperties: false,
        },
      },
      answer: { type: "string" },
    },
    required: ["reason", "responseMode", "responseConfidence", "actions", "answer"],
    additionalProperties: false,
  };
}

export const AGENT_PLANNER_SCHEMA = buildSchema();
