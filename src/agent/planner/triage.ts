import { planAgent } from "@/agent/planner/plan";
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
  const plan = await planAgent(ctx);
  return {
    mode: plan.route,
    responseMode: plan.responseMode,
    answer: plan.answer,
    answerOrigin: plan.answerOrigin,
    actions: plan.actions,
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
