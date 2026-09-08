import type {
  AgentAction,
  AgentContext,
  AgentMatch,
  SourceListItem,
  SourceListResult,
} from "@/agent/types";

function filenameWithoutExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot > 0 ? filename.slice(0, lastDot) : filename;
}

export function sourceListAnswer(
  card: SourceListResult,
  english: boolean,
  hasActiveBase: boolean,
): string {
  if (!hasActiveBase)
    return english
      ? "RAG search is disabled, so no documentary files are loaded. Select a File Search source in Settings."
      : "A busca com RAG está desativada, portanto não há arquivos documentais carregados. Selecione uma base de File Search em Config.";
  if (!card.items.length)
    return english
      ? "The active consultation base currently has no attached files."
      : "A base de consulta ativa está selecionada, porém nenhum arquivo foi anexado a ela até o momento.";
  const intro = english
    ? `Loaded consultation sources (${card.total}):`
    : `Fontes de consulta carregadas (${card.total}):`;
  return `${intro}\n\n${card.items.map((item) => `- ${item.source}`).join("\n")}`;
}
export function sourceListErrorAnswer(english: boolean): string {
  return english
    ? "The active source is selected, but its file list could not be loaded."
    : "A base de consulta ativa está selecionada, mas não foi possível carregar sua lista de arquivos.";
}

async function execute(
  _match: Pick<AgentMatch, "intent" | "term">,
  ctx: AgentContext,
  signal?: AbortSignal,
): Promise<SourceListResult> {
  const { host } = ctx;
  if (!host.vectorStoreId || host.vectorStoreId === "none") {
    return {
      intent: "list_sources",
      term: "",
      total: 1,
      saturated: false,
      items: [
        { source: host.english ? "No active source base" : "Nenhuma base ativa", snippet: "" },
      ],
    };
  }
  const data = host.loadActiveSourceFiles
    ? await host.loadActiveSourceFiles()
    : ((await fetch(
        `${host.apiBase}/api/vector-stores/${encodeURIComponent(host.vectorStoreId)}/files`,
        { signal },
      ).then((response) => {
        if (!response.ok) throw new Error("source_list_failed");
        return response.json();
      })) as {
        totalFiles?: number;
        truncated?: boolean;
        files?: Array<{ filename?: string; status?: string }>;
      });
  const items: SourceListItem[] = (data.files ?? []).map((file) => ({
    source: filenameWithoutExtension(String(file.filename ?? "")),
    snippet: file.status ? `Status: ${file.status}` : "",
  }));
  return {
    intent: "list_sources",
    term: "",
    total: data.totalFiles ?? items.length,
    saturated: Boolean(data.truncated),
    items,
  };
}

export const listSources = { execute };
export function executeAgentAction(action: AgentAction, ctx: AgentContext, signal?: AbortSignal) {
  if (action.id !== "list_sources")
    return Promise.reject(new Error("Only list_sources is locally executable"));
  return execute({ intent: "list_sources", term: "" }, ctx, signal);
}
