import type { AgentIntentId, AgentVerbeteField } from "@/agent/config";
import type { AgentHost } from "@/agent/host";
import type { AgentSettings } from "@/agent/settings";

export type { AgentIntentId, AgentVerbeteField };
export type AgentRoute = "direct" | "full" | "corpus" | "clarify";
export type AgentResponseMode = "full" | "action_only" | "direct" | "clarify" | "corpus";
export type AgentPlanOrigin = "luna" | "fallback" | "bypass";
export type AgentToolPolicy = "local" | "fulfills_explicit_action" | "complementary";
export type AgentActionKind = "open-url" | "inline-result";

export type AgentAction = {
  id: AgentIntentId;
  kind: AgentActionKind;
  label: string;
  title?: string;
  href: string;
  confidence: number;
  service: string;
  destination: string;
  position?: number;
  turnId?: string;
  meta?: Record<string, string>;
};

export type AgentMatch = {
  intent: AgentIntentId;
  confidence: number;
  term: string;
  field?: AgentVerbeteField;
  book?: string;
  area?: string;
  resource?: string;
  style?: string;
};

/** Resultado do executor local list_sources; não integra o catálogo externo. */
export type SourceListItem = { source: string; snippet: string };
export type SourceListResult = {
  intent: AgentIntentId;
  term: string;
  total: number;
  saturated: boolean;
  items: SourceListItem[];
};

export type AgentContext = {
  userText: string;
  assistantText?: string;
  previousUserText?: string;
  semanticSourceIds?: string[];
  hasFileSearch?: boolean;
  settings: AgentSettings;
  host: AgentHost;
  threadId: string;
};

export type AgentMessage = {
  id: string;
  role: string;
  parts: Array<{ type: string; text?: string }>;
  metadata?: unknown;
};

export type AgentTool = {
  name: AgentIntentId;
  describe: (english: boolean) => string;
  parameters?: Record<string, unknown>;
  termRequired: boolean;
  responsePolicy: AgentToolPolicy;
  intro: (match: AgentMatch, english: boolean) => string;
  toAction: (match: AgentMatch, ctx: AgentContext) => AgentAction;
};

export type AgentPlan = {
  actions: AgentAction[];
  responseMode: AgentResponseMode;
  responseConfidence: number;
  route: AgentRoute;
  answer: string;
  confidence: number;
  reason: string;
  origin: AgentPlanOrigin;
  proposedResponseMode?: AgentResponseMode;
  proposedRoute?: AgentRoute;
  durationMs?: number;
  classifierResponse?: string;
  turnId?: string;
};
