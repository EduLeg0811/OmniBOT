import { planAgent } from "@/agent/planner/plan";
import { matchDeterministicActions, matchDeterministicRules } from "@/agent/planner/rules";
import type {
  AgentAction,
  AgentAnswerOrigin,
  AgentContext,
  AgentPlanOrigin,
  AgentResponseMode,
  AgentRoute,
} from "@/agent/types";

export type AgentTriage = {
  mode: AgentRoute;
  responseMode: AgentResponseMode;
  answer: string;
  answerOrigin: AgentAnswerOrigin;
  actions: AgentAction[];
  confidence: number;
  responseConfidence: number;
  reason: string;
  origin: AgentPlanOrigin;
  proposedRoute?: AgentRoute;
  proposedResponseMode?: AgentResponseMode;
  durationMs?: number;
  classifierResponse?: string;
};
const BYPASS: AgentTriage = {
  mode: "full",
  responseMode: "full",
  answer: "",
  answerOrigin: "none",
  actions: [],
  confidence: 0,
  responseConfidence: 0,
  reason: "agent_disabled",
  origin: "bypass",
};
export async function triageAgent(ctx: AgentContext): Promise<AgentTriage> {
  if (!ctx.settings.enabled) return BYPASS;

  // 1. Regras determinísticas prioritárias (respostas diretas para restrições e navegações explícitas)
  const deterministic = matchDeterministicRules(ctx);
  if (deterministic) return deterministic;

  // 2. Classificador LLM (Luna)
  const plan = await planAgent(ctx);

  // 3. Complemento de ações determinísticas não presentes no plano
  let actions = plan.actions;
  const detActions = matchDeterministicActions(ctx);
  if (detActions.length > 0) {
    const existingHrefs = new Set(actions.map((a) => a.href));
    const toAdd = detActions.filter((a) => !existingHrefs.has(a.href));
    if (toAdd.length > 0) {
      actions = [...actions, ...toAdd].slice(0, 3).map((action, position) => ({
        ...action,
        position,
      }));
    }
  }

  return {
    mode: plan.route,
    responseMode: plan.responseMode,
    answer: plan.answer,
    answerOrigin: plan.answerOrigin,
    actions,
    confidence: plan.responseConfidence,
    responseConfidence: plan.responseConfidence,
    reason: plan.reason,
    origin: plan.origin,
    proposedRoute: plan.proposedRoute,
    proposedResponseMode: plan.proposedResponseMode,
    durationMs: plan.durationMs,
    classifierResponse: plan.classifierResponse,
  };
}
