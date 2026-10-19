import { MAX_AGENT_ACTIONS } from "@/agent/tools/registry";
import { planAgent, requestDirection } from "@/agent/planner/plan";
import { matchDeterministicActions } from "@/agent/planner/rules";
import type {
  AgentAction,
  AgentAnswerOrigin,
  AgentContext,
  AgentDirection,
  AgentPlan,
  AgentPlanOrigin,
  AgentResponseMode,
  AgentRoute,
} from "@/agent/types";

/** O turno passa por dois blocos de Decisions, em série mas sem que o
 * segundo segure a resposta:
 *
 *  1. CLASSIFICADOR (`triageAgent`), antes da resposta: decide a rota — modelo
 *     principal, resposta direta ou corpus. O envio espera só por ele.
 *  2. DIRECIONADOR (`directAgent`), disparado logo depois: decide os pills de
 *     ação. Corre junto com a resposta e os pills aparecem quando ela termina.
 *
 * No fallback pela Responses API as duas decisões saem de uma chamada só; o
 * Direcionador então apenas devolve os pills que ela já trouxe. */
export type AgentTriage = {
  mode: AgentRoute;
  responseMode: AgentResponseMode;
  answer: string;
  answerOrigin: AgentAnswerOrigin;
  /** Só ações que fazem parte da rota (list_sources) ou, no fallback, os
   * pills que vieram na mesma chamada. Os demais pills são do Direcionador. */
  actions: AgentAction[];
  confidence: number;
  responseConfidence: number;
  reason: string;
  origin: AgentPlanOrigin;
  proposedRoute?: AgentRoute;
  proposedResponseMode?: AgentResponseMode;
  durationMs?: number;
  classifierResponse?: string;
  engine?: AgentPlan["engine"];
  decisionAnswers?: AgentPlan["decisionAnswers"];
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

/** CLASSIFICADOR — a rota do turno. */
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
    engine: plan.engine,
    decisionAnswers: plan.decisionAnswers,
  };
}

/** DIRECIONADOR — os pills de ação do turno, depois do Classificador.
 *
 * Turnos diretos não ganham pills: a saudação não precisa deles, e a lista de
 * fontes já é a ação do turno. As regras determinísticas (periódicos, livros
 * em PDF) completam o que o Direcionador decidiu, sem passar de três. */
export async function directAgent(ctx: AgentContext, triage: AgentTriage): Promise<AgentDirection> {
  if (!ctx.settings.enabled || triage.origin === "bypass")
    return { actions: [], reason: "agent_disabled" };
  if (triage.responseMode === "direct") return { actions: [], reason: "direct_turn" };

  let direction: AgentDirection;
  if (triage.engine === "decisions") {
    direction = (await requestDirection(ctx, triage)) ?? {
      actions: [],
      reason: "director_unavailable",
    };
  } else {
    // Fallback: a chamada única já trouxe os pills.
    direction = { actions: triage.actions, reason: "responses_single_call" };
  }

  // As regras determinísticas são rede de segurança, não complemento: no log
  // real (2.040 perguntas, set–out 2026) o padrão «artigo» disparava em quem
  // escreve um artigo ou pede formato de citação, e «livro… link» em quem
  // discute capítulos do próprio livro — 35 pills indevidos. Só entram quando
  // o Direcionador não respondeu.
  const fallback = direction.reason === "director_unavailable";
  const known = new Set(direction.actions.map((action) => action.href));
  const extra = fallback
    ? matchDeterministicActions(ctx).filter((action) => !known.has(action.href))
    : [];
  const actions = [...direction.actions, ...extra]
    .slice(0, MAX_AGENT_ACTIONS)
    .map((action, position) => ({ ...action, position }));
  return { ...direction, actions };
}
