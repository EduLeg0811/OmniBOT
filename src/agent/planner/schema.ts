import { AGENT_TOOLS } from "@/agent/tools/registry";

function buildSchema() {
  const extras: Record<string, unknown> = {};
  for (const tool of AGENT_TOOLS) Object.assign(extras, tool.parameters ?? {});
  const properties = {
    intent: { type: "string", enum: AGENT_TOOLS.map((tool) => tool.name) },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    term: { type: "string", description: "Termo limpo da ação; vazio quando não se aplica." },
    ...extras,
  };
  return {
    type: "object",
    properties: {
      actions: {
        type: "array",
        maxItems: 2,
        items: {
          type: "object",
          properties,
          required: Object.keys(properties),
          additionalProperties: false,
        },
      },
      responseMode: {
        type: "string",
        enum: ["full", "action_only", "direct", "clarify", "corpus"],
      },
      responseConfidence: { type: "number", minimum: 0, maximum: 1 },
      reason: { type: "string" },
      answer: { type: "string" },
    },
    required: ["actions", "responseMode", "responseConfidence", "reason", "answer"],
    additionalProperties: false,
  };
}

export const AGENT_PLANNER_SCHEMA = buildSchema();
