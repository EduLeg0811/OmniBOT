import {
  AGENT_ANSWER_MAX,
  AGENT_BOOK_IDS,
  AGENT_CLASSIFIER_MODEL,
  AGENT_CLASSIFIER_REASONING,
  AGENT_CONFIDENCE_HIGH,
  AGENT_CONFIDENCE_MEDIUM,
  AGENT_ICGE_AREAS,
  AGENT_PLANNER_TIMEOUT_MS,
  AGENT_RESOURCE_IDS,
  AGENT_VERBETE_FIELDS,
} from "@/agent/config";
import { agentInstructionsFor, presentationInstructionFor } from "@/agent/planner/prompt";
import { AGENT_PLANNER_SCHEMA } from "@/agent/planner/schema";
import { actionsFromMatches, agentTool } from "@/agent/tools/registry";
import type {
  AgentContext,
  AgentIntentId,
  AgentMatch,
  AgentPlan,
  AgentResponseMode,
  AgentRoute,
} from "@/agent/types";

type PlannerAction = {
  intent?: unknown;
  confidence?: unknown;
  term?: unknown;
  field?: unknown;
  book?: unknown;
  area?: unknown;
  resource?: unknown;
  style?: unknown;
};
export type PlannerPayload = {
  actions?: unknown;
  responseMode?: unknown;
  responseConfidence?: unknown;
  reason?: unknown;
  answer?: unknown;
};
const FAILED = Symbol("failed");
const RESULT_CLAIM =
  /\b(?:encontrei|não\s+encontrei|nao\s+encontrei|não\s+existe|nao\s+existe|achei|localizei|foram\s+encontrad|resultados?\s+encontrad|apenas\s+\d+|found|not\s+found|does\s+not\s+exist|only\s+\d+)\b/iu;
const MODES: AgentResponseMode[] = ["full", "action_only", "direct", "clarify", "corpus"];
const number01 = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1 ? value : null;
const text = (value: unknown, max = 160) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";
const oneOf = <T extends readonly string[]>(value: unknown, values: T, fallback: T[number]) =>
  typeof value === "string" && values.includes(value) ? (value as T[number]) : fallback;
const routeFor = (mode: AgentResponseMode): AgentRoute =>
  mode === "action_only"
    ? "direct"
    : mode === "direct" || mode === "clarify" || mode === "corpus"
      ? mode
      : "full";
const empty = (reason = "classifier_unavailable"): AgentPlan => ({
  actions: [],
  responseMode: "full",
  responseConfidence: 0,
  route: "full",
  answer: "",
  confidence: 0,
  reason,
  origin: "fallback",
});
const cleanTerm = (value: unknown) =>
  text(value, 100).replace(/^[\s"'“”‘’]+|[\s"'“”‘’?.!,;:]+$/gu, "");

function classifierMessage(ctx: AgentContext): string {
  const en = ctx.host.english;
  const blocks: string[] = [];
  if (ctx.previousUserText?.trim())
    blocks.push(
      `${en ? "Previous user question (reference data)" : "Pergunta anterior (dados de referência)"}:\n${ctx.previousUserText.trim().slice(0, 500)}`,
    );
  if (ctx.assistantText?.trim())
    blocks.push(
      `${en ? "Last assistant answer (reference data)" : "Última resposta do assistente (dados de referência)"}:\n${ctx.assistantText.trim().slice(0, 900)}`,
    );
  blocks.push(
    en
      ? `Sources: File Search ${ctx.hasFileSearch ? "active" : "inactive"}; semantic: ${ctx.semanticSourceIds?.join(", ") || "none"}; presentation: ${ctx.settings.presentation}.`
      : `Fontes: File Search ${ctx.hasFileSearch ? "ativo" : "inativo"}; semânticas: ${ctx.semanticSourceIds?.join(", ") || "nenhuma"}; apresentação: ${ctx.settings.presentation}.`,
  );
  blocks.push(`${en ? "Current user question" : "Pergunta atual"}:\n${ctx.userText.trim()}`);
  return blocks.join("\n\n");
}

export function normalizePlannerPayload(
  payload: PlannerPayload,
  ctx: AgentContext,
  durationMs = 0,
  raw = "",
): AgentPlan {
  const proposed = oneOf(payload.responseMode, MODES, "full");
  const responseConfidence = number01(payload.responseConfidence);
  if (responseConfidence === null)
    return {
      ...empty("invalid_confidence"),
      durationMs,
      proposedResponseMode: proposed,
      proposedRoute: routeFor(proposed),
    };
  const matches: AgentMatch[] = (Array.isArray(payload.actions) ? payload.actions : [])
    .slice(0, 2)
    .flatMap((rawAction) => {
      const item = rawAction as PlannerAction;
      const intent = text(item.intent) as AgentIntentId;
      const confidence = number01(item.confidence);
      if (!agentTool(intent) || confidence === null) return [];
      return [
        {
          intent,
          confidence,
          term: cleanTerm(item.term),
          field: oneOf(item.field, AGENT_VERBETE_FIELDS, "texto"),
          book: oneOf(item.book, ["", ...AGENT_BOOK_IDS] as const, ""),
          area: oneOf(item.area, AGENT_ICGE_AREAS, ""),
          resource: oneOf(item.resource, ["", ...AGENT_RESOURCE_IDS] as const, ""),
          style: oneOf(item.style, ["", "bee", "simples"] as const, ""),
        },
      ];
    });
  const actions = actionsFromMatches(matches, ctx);
  let effective = proposed;
  let reason = text(payload.reason, 120) || "classifier_decision";
  if (responseConfidence < AGENT_CONFIDENCE_MEDIUM) {
    effective = "full";
    reason = "low_confidence";
  } else if (
    ["action_only", "direct", "clarify"].includes(effective) &&
    responseConfidence < AGENT_CONFIDENCE_HIGH
  ) {
    effective = "full";
    reason = `${proposed}_requires_high_confidence`;
  }
  if (ctx.settings.presentation === "classic" && effective === "corpus") {
    effective = "full";
    reason = "classic_corpus_to_full";
  }
  if (effective === "direct" && actions.some((item) => item.id !== "list_sources")) {
    effective = "action_only";
    reason = "external_direct_to_action_only";
  }
  if (effective === "action_only" && !actions.length) {
    effective = "full";
    reason = "action_only_without_action";
  }
  const rawAnswer = typeof payload.answer === "string" ? payload.answer.trim() : "";
  let answer = text(payload.answer, AGENT_ANSWER_MAX);
  if (effective === "full") answer = "";
  if (
    effective === "action_only" &&
    (!answer || rawAnswer.length > AGENT_ANSWER_MAX || RESULT_CLAIM.test(answer))
  ) {
    const first = matches.find((match) => actions.some((item) => item.id === match.intent));
    answer = first ? agentTool(first.intent)!.intro(first, ctx.host.english) : "";
  }
  if ((effective === "direct" || effective === "clarify" || effective === "corpus") && !answer) {
    effective = "full";
    reason = "missing_direct_answer";
  }
  return {
    actions,
    responseMode: effective,
    responseConfidence,
    route: routeFor(effective),
    answer,
    confidence: responseConfidence,
    reason,
    origin: "luna",
    ...(effective === proposed
      ? {}
      : { proposedResponseMode: proposed, proposedRoute: routeFor(proposed) }),
    durationMs,
    classifierResponse: raw,
  };
}

let cached: { key: string; plan: Promise<AgentPlan> } | null = null;
export function planAgent(ctx: AgentContext): Promise<AgentPlan> {
  const key = JSON.stringify([
    ctx.userText,
    ctx.previousUserText?.slice(-500),
    ctx.assistantText?.slice(-900),
    ctx.settings,
    ctx.semanticSourceIds,
    ctx.hasFileSearch,
    ctx.host.english,
  ]);
  if (cached?.key === key) return cached.plan;
  const plan = requestPlan(ctx).then((value) => {
    if (value !== FAILED) return value;
    if (cached?.key === key) cached = null;
    return empty();
  });
  cached = { key, plan };
  return plan;
}
async function requestPlan(ctx: AgentContext): Promise<AgentPlan | typeof FAILED> {
  if (ctx.userText.trim().length < 2) return empty();
  const instructions = [
    agentInstructionsFor(ctx.host.english),
    ctx.settings.prompt.trim(),
    presentationInstructionFor(ctx.host.english, ctx.settings.presentation),
  ]
    .filter(Boolean)
    .join("\n\n");
  const started = performance.now();
  try {
    const response = await fetch(`${ctx.host.apiBase}/api/llm`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      signal: AbortSignal.timeout(AGENT_PLANNER_TIMEOUT_MS),
      body: JSON.stringify({
        messages: [{ role: "user", content: classifierMessage(ctx) }],
        systemPrompt: instructions,
        promptCacheKey: `agent-router-v2-${ctx.settings.presentation}-${ctx.host.english ? "en" : "pt"}`,
        model: AGENT_CLASSIFIER_MODEL,
        reasoningEffort: AGENT_CLASSIFIER_REASONING.id,
        verbosity: "low",
        responseSchema: AGENT_PLANNER_SCHEMA,
        responseSchemaName: "agent_plan",
        responseSchemaDescription: "Modo de resposta e ações independentes para um turno.",
      }),
    });
    if (!response.ok) return FAILED;
    const result = (await response.json()) as { content?: string };
    if (!result.content) return FAILED;
    return normalizePlannerPayload(
      JSON.parse(result.content) as PlannerPayload,
      ctx,
      Math.round(performance.now() - started),
      result.content,
    );
  } catch {
    cached = null;
    return FAILED;
  }
}

export function buildAgentResponseContext(
  plan: Pick<AgentPlan, "actions">,
  english: boolean,
): string {
  if (!plan.actions.length) return "";
  const lines = plan.actions
    .map(
      (item) =>
        `- ${item.label}: serviço ${item.service}; escopo ${item.destination}; ainda não consultado.`,
    )
    .join("\n");
  return english
    ? `Trusted action context:\n${lines}\nThese external services have not been queried. Answer the question substantively. Never present a pill as a result. If current RAG lacks evidence, say only that it was not located in the sources consulted for this answer; do not claim nonexistence. Explain that the pill opens an independent or more specific search.`
    : `Contexto confiável das ações:\n${lines}\nEsses serviços externos ainda não foram consultados. Responda substantivamente. Nunca trate um pill como resultado. Se o RAG atual não trouxer evidência, diga apenas que ela não foi localizada nas fontes consultadas nesta resposta; não afirme inexistência. Explique que o pill abre pesquisa independente ou mais específica.`;
}
