import { ExternalLink, Sparkles } from "lucide-react";
import { useEffect, useMemo } from "react";

import { extractCitationActions } from "@/agent/citations-extractor";
import type { AgentHost } from "@/agent/host";
import type { AgentSettings } from "@/agent/settings";
import { withoutRepeatedActions } from "@/agent/tools/registry";
import type { AgentAction, AgentMessage } from "@/agent/types";

type Props = {
  threadId: string;
  settings: AgentSettings;
  host: AgentHost;
  /** Mensagens completas, usadas pela apresentação Citações para o último turno. */
  messages?: AgentMessage[];
  /** Turno específico, usado pela apresentação Clássico sob a resposta correspondente. */
  userMessage?: AgentMessage | null;
  /** Resposta do assistente associada a este turno (usada para extração de citações). */
  assistantMessage?: AgentMessage | null;
  expandedByDefault?: boolean;
  followUpQuestion?: string;
  onFollowUp?: (question: string) => void;
  disabled?: boolean;
  showExternalActions?: boolean;
};

function latestUser(messages: AgentMessage[]) {
  return [...messages].reverse().find((message) => message.role === "user") ?? null;
}

function latestAssistant(messages: AgentMessage[]) {
  return [...messages].reverse().find((message) => message.role === "assistant") ?? null;
}

function textOf(message: AgentMessage | null | undefined): string {
  return (
    message?.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text ?? "")
      .join(" ")
      .trim() ?? ""
  );
}

function dedupeActions(actions: AgentAction[]): AgentAction[] {
  const seen = new Set<string>();
  return actions.filter((action) => {
    const key = `${action.id}:${action.href}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function actionsOf(message: AgentMessage | null | undefined): AgentAction[] {
  if (!message) return [];
  const metadata = message.metadata;
  if (!metadata || typeof metadata !== "object") return [];
  const metaObj = metadata as Record<string, unknown>;
  const rawActions =
    "agentPlan" in metaObj &&
    metaObj.agentPlan &&
    typeof metaObj.agentPlan === "object" &&
    Array.isArray((metaObj.agentPlan as { actions?: unknown }).actions)
      ? (metaObj.agentPlan as { actions: unknown[] }).actions
      : "agentPills" in metaObj && Array.isArray(metaObj.agentPills)
        ? metaObj.agentPills
        : [];
  if (!Array.isArray(rawActions)) return [];
  return rawActions.filter(
    (action): action is AgentAction =>
      Boolean(action) &&
      typeof action === "object" &&
      typeof (action as AgentAction).id === "string" &&
      typeof (action as AgentAction).label === "string" &&
      typeof (action as AgentAction).href === "string",
  );
}

const loggedImpressions = new Set<string>();

/** Ações decididas por Luna somadas a citações mapeadas na própria resposta. */
export function AgentActions({
  threadId,
  settings,
  host,
  messages,
  userMessage,
  assistantMessage,
  expandedByDefault = false,
  followUpQuestion,
  onFollowUp,
  disabled = false,
  showExternalActions = true,
}: Props) {
  const user = userMessage ?? latestUser(messages ?? []);
  const assistant = assistantMessage ?? latestAssistant(messages ?? []);
  const baseActions = useMemo(() => actionsOf(user), [user]);
  const assistantActions = useMemo(() => actionsOf(assistant), [assistant]);
  const combinedSaved = useMemo(
    () => dedupeActions([...baseActions, ...assistantActions]),
    [baseActions, assistantActions],
  );

  const citationActions = useMemo(() => {
    const assistantText = textOf(assistant);
    if (!assistantText) return [];
    return extractCitationActions({
      assistantText,
      userQuestion: textOf(user),
      destination: settings?.pillDestination ?? "cons-ia",
      english: host.english,
      existingActions: combinedSaved,
      turnId: user?.id,
    });
  }, [assistant, user, settings?.pillDestination, host.english, combinedSaved]);

  const actions = useMemo(
    () => dedupeActions([...combinedSaved, ...citationActions]),
    [combinedSaved, citationActions],
  );

  const externalActions = useMemo(
    () => (showExternalActions ? actions.filter((action) => action.kind === "open-url") : []),
    [actions, showExternalActions],
  );

  useEffect(() => {
    for (const action of externalActions) {
      const key = `${threadId}:${user?.id ?? "unknown"}:${action.id}:${action.href}`;
      if (loggedImpressions.has(key)) continue;
      loggedImpressions.add(key);
      host.logEvent({
        intent: action.id,
        via: "impression",
        detection: "llm",
        meta: {
          ...(action.meta ?? {}),
          turn_id: action.turnId ?? user?.id ?? "",
          position: String(action.position ?? 0),
          confidence: String(action.confidence ?? ""),
          service: action.service ?? "",
          destination: action.destination ?? action.href,
        },
      });
    }
  }, [externalActions, host, threadId, user?.id]);

  if (externalActions.length === 0 && !followUpQuestion) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {externalActions.map((action) => (
        <a
          key={`${action.id}-${action.href}`}
          href={action.href}
          target="_blank"
          rel="noopener noreferrer"
          title={action.title}
          onClick={() =>
            host.logEvent({
              intent: action.id,
              via: "link",
              detection: "llm",
              meta: {
                ...(action.meta ?? {}),
                turn_id: action.turnId ?? user?.id ?? "",
                position: String(action.position ?? 0),
                confidence: String(action.confidence ?? ""),
                service: action.service ?? "",
                destination: action.destination ?? action.href,
              },
            })
          }
          className="inline-flex items-center gap-1.5 rounded-full border border-chart-2/40 bg-white px-3 py-1.5 text-xs font-chat text-slate-900 transition-colors hover:border-chart-2/60 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chart-2/35"
        >
          <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
          <span>{action.label}</span>
        </a>
      ))}
      {followUpQuestion ? (
        <button
          type="button"
          disabled={disabled}
          title={`Perguntar: ${followUpQuestion}`}
          onClick={() => onFollowUp?.(followUpQuestion)}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/35 bg-white px-3 py-1.5 text-xs font-chat text-slate-900 transition-colors hover:border-primary/55 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Sparkles className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span>{followUpQuestion}</span>
        </button>
      ) : null}
    </div>
  );
}
