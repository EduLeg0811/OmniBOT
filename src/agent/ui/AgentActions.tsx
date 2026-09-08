import { ExternalLink, Sparkles } from "lucide-react";

import type { AgentHost } from "@/agent/host";
import type { AgentSettings } from "@/agent/settings";
import type { AgentAction, AgentMessage } from "@/agent/types";
type Props = {
  threadId: string;
  settings: AgentSettings;
  host: AgentHost;
  /** Mensagens completas, usadas pela apresentação Citações para o último turno. */
  messages?: AgentMessage[];
  /** Turno específico, usado pela apresentação Clássico sob a resposta correspondente. */
  userMessage?: AgentMessage | null;
  expandedByDefault?: boolean;
  followUpQuestion?: string;
  onFollowUp?: (question: string) => void;
  disabled?: boolean;
};

function latestUser(messages: AgentMessage[]) {
  return [...messages].reverse().find((message) => message.role === "user") ?? null;
}

function textOf(message: AgentMessage | null): string {
  return (
    message?.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text ?? "")
      .join(" ")
      .trim() ?? ""
  );
}

function actionsOf(message: AgentMessage | null): AgentAction[] {
  const metadata = message?.metadata;
  if (!metadata || typeof metadata !== "object" || !("agentPlan" in metadata)) return [];
  const actions = (metadata as { agentPlan?: { actions?: unknown } }).agentPlan?.actions;
  if (!Array.isArray(actions)) return [];
  return actions.filter(
    (action): action is AgentAction =>
      Boolean(action) &&
      typeof action === "object" &&
      typeof (action as AgentAction).id === "string" &&
      typeof (action as AgentAction).label === "string" &&
      typeof (action as AgentAction).href === "string",
  );
}

/** Ações são decididas uma única vez por Luna e lidas do metadata do turno. */
export function AgentActions({
  threadId,
  settings,
  host,
  messages,
  userMessage,
  expandedByDefault = false,
  followUpQuestion,
  onFollowUp,
  disabled = false,
}: Props) {
  const user = userMessage ?? latestUser(messages ?? []);
  // A decisão pertence ao turno gravado. Alterar o interruptor depois não deve
  // apagar pills nem o card de fontes de uma resposta já existente.
  const actions = actionsOf(user);
  const externalActions = actions.filter((action) => action.kind === "open-url");
  if (externalActions.length === 0 && !followUpQuestion) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {externalActions.map((action) => (
        <a
          key={action.id}
          href={action.href}
          target="_blank"
          rel="noopener noreferrer"
          title={action.title}
          onClick={() =>
            host.logEvent({
              intent: action.id,
              via: "link",
              detection: "llm",
              meta: action.meta,
            })
          }
          className="inline-flex items-center gap-1.5 rounded-full border border-chart-2/40 bg-chart-2/10 px-3 py-1.5 text-xs font-chat text-foreground transition-colors hover:border-chart-2/60 hover:bg-chart-2/20"
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
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/35 bg-primary/8 px-3 py-1.5 text-xs font-chat text-foreground transition-colors hover:border-primary/55 hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Sparkles className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span>{followUpQuestion}</span>
        </button>
      ) : null}
    </div>
  );
}
