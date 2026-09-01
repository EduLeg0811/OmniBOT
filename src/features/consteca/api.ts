import {
  adaptLiteralResponse,
  adaptSemanticResponse,
  mergeSourceCatalog,
} from "@/features/consteca/adapters";
import type { CorpusSearchResponse, CorpusSource, SearchKind } from "@/features/consteca/types";
import { API_BASE } from "@/lib/main-server";

export class CorpusSearchError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "CorpusSearchError";
  }

  get quotaExceeded() {
    return this.status === 403;
  }
}

async function jsonOrError(response: Response): Promise<unknown> {
  const payload = await response.json().catch(() => ({}));
  if (response.ok) return payload;
  const detail = (payload as { detail?: unknown }).detail;
  const message =
    typeof detail === "string"
      ? detail
      : detail && typeof detail === "object" && "message" in detail
        ? String((detail as { message?: unknown }).message || "")
        : "";
  throw new CorpusSearchError(
    message || `A busca falhou (HTTP ${response.status}).`,
    response.status,
  );
}

export async function fetchCorpusSources(signal?: AbortSignal): Promise<CorpusSource[]> {
  const [lexical, semantic] = await Promise.all([
    fetch(`${API_BASE}/api/lexical/sources`, { signal, headers: { Accept: "application/json" } }),
    fetch(`${API_BASE}/api/semantic/indexes`, { signal, headers: { Accept: "application/json" } }),
  ]);
  return mergeSourceCatalog(await jsonOrError(lexical), await jsonOrError(semantic));
}

export async function searchCorpus({
  query,
  kind,
  sourceIds,
  limit,
  catalog,
  signal,
}: {
  query: string;
  kind: SearchKind;
  sourceIds: string[];
  limit: number;
  catalog: CorpusSource[];
  signal?: AbortSignal;
}): Promise<CorpusSearchResponse> {
  const startedAt = performance.now();
  const response = await fetch(
    `${API_BASE}${kind === "smart" ? "/api/semantic/context" : "/api/lexical/overview"}`,
    {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-App": "consteca",
        "X-Action": kind === "smart" ? "smart-search" : "literal-search",
      },
      body: JSON.stringify(
        kind === "smart"
          ? { query, sourceIds, limit, semanticOnly: true }
          : { term: query, sourceIds, limit },
      ),
    },
  );
  const payload = await jsonOrError(response);
  return kind === "smart"
    ? adaptSemanticResponse(payload, catalog)
    : adaptLiteralResponse(payload, catalog, Math.round(performance.now() - startedAt));
}
