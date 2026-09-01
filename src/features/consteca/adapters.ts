import type {
  CorpusMetadata,
  CorpusResultGroup,
  CorpusSearchResponse,
  CorpusSearchResult,
  CorpusSource,
} from "@/features/consteca/types";

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function text(value: unknown): string {
  return value === null || value === undefined ? "" : String(value).trim();
}

function numberOrNull(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function metadataFrom(value: unknown): CorpusMetadata {
  const raw = record(value);
  const metadata: CorpusMetadata = {};
  const fields = ["author", "area", "theme", "date", "section", "folha", "sigla", "link"] as const;
  for (const field of fields) {
    const normalized = text(raw[field]);
    if (normalized) metadata[field] = normalized;
  }
  const argument = text(raw.argument || raw.argumento);
  if (argument) metadata.argument = argument;
  return metadata;
}

export function mergeSourceCatalog(
  lexicalPayload: unknown,
  semanticPayload: unknown,
): CorpusSource[] {
  const lexicalSources = Array.isArray(record(lexicalPayload).sources)
    ? (record(lexicalPayload).sources as unknown[])
    : [];
  const semanticIndexes = Array.isArray(record(semanticPayload).indexes)
    ? (record(semanticPayload).indexes as unknown[])
    : [];
  const catalog = new Map<string, CorpusSource>();

  for (const value of lexicalSources) {
    const item = record(value);
    const id = text(item.indexId || item.id).toLowerCase();
    if (!id) continue;
    catalog.set(id, {
      id,
      code: text(item.id || item.fileStem || id).toUpperCase(),
      label: text(item.label || item.id || id),
      fileStem: text(item.fileStem || item.id || id).toUpperCase(),
      recordCount: numberOrNull(item.recordCount),
      lexicalAvailable: true,
      semanticAvailable: false,
    });
  }

  for (const value of semanticIndexes) {
    const item = record(value);
    const id = text(item.id).toLowerCase();
    if (!id) continue;
    const existing = catalog.get(id);
    catalog.set(id, {
      id,
      code: existing?.code ?? text(item.label || id).toUpperCase(),
      label: existing?.label ?? text(item.label || id),
      fileStem: existing?.fileStem ?? text(item.label || id).toUpperCase(),
      recordCount: existing?.recordCount ?? numberOrNull(item.sourceRows),
      lexicalAvailable: existing?.lexicalAvailable ?? false,
      semanticAvailable: true,
    });
  }

  return [...catalog.values()].sort((left, right) =>
    left.label.localeCompare(right.label, "pt-BR", { sensitivity: "base" }),
  );
}

function sourceFor(
  catalog: CorpusSource[],
  identifier: unknown,
  fallbackLabel?: unknown,
): CorpusSource {
  const key = text(identifier).toLowerCase();
  return (
    catalog.find(
      (source) =>
        source.id === key ||
        source.code.toLowerCase() === key ||
        source.fileStem.toLowerCase() === key,
    ) ?? {
      id: key || "unknown",
      code: text(identifier || fallbackLabel || "Fonte").toUpperCase(),
      label: text(fallbackLabel || identifier || "Fonte desconhecida"),
      fileStem: text(identifier || "unknown").toUpperCase(),
      recordCount: null,
      lexicalAvailable: false,
      semanticAvailable: false,
    }
  );
}

function dedupeResults(results: CorpusSearchResult[]): CorpusSearchResult[] {
  const seen = new Set<string>();
  return results.filter((result) => {
    const normalizedText = result.text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
    const key = `${result.sourceId}|${result.paragraph ?? ""}|${normalizedText}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildGroups(
  results: CorpusSearchResult[],
  totals = new Map<string, number>(),
): CorpusResultGroup[] {
  const groups = new Map<string, CorpusResultGroup>();
  for (const result of results) {
    const group = groups.get(result.sourceId) ?? {
      sourceId: result.sourceId,
      sourceCode: result.sourceCode,
      sourceLabel: result.sourceLabel,
      totalFound: totals.get(result.sourceId) ?? 0,
      shownCount: 0,
      topScore: null,
      results: [],
    };
    group.results.push(result);
    group.shownCount += 1;
    group.totalFound = Math.max(group.totalFound, group.shownCount);
    if (result.score !== null) group.topScore = Math.max(group.topScore ?? 0, result.score);
    groups.set(result.sourceId, group);
  }
  return [...groups.values()].sort((left, right) => {
    if (left.topScore !== null || right.topScore !== null) {
      return (right.topScore ?? 0) - (left.topScore ?? 0);
    }
    return left.sourceLabel.localeCompare(right.sourceLabel, "pt-BR", { sensitivity: "base" });
  });
}

export function adaptSemanticResponse(
  payload: unknown,
  catalog: CorpusSource[],
): CorpusSearchResponse {
  const body = record(payload);
  const rawResults = Array.isArray(body.results) ? body.results : [];
  const results = dedupeResults(
    rawResults.map((value, index): CorpusSearchResult => {
      const item = record(value);
      const source = sourceFor(catalog, item.sourceId, item.sourceLabel);
      return {
        id: text(item.id) || `${source.id}-${index + 1}`,
        sourceId: source.id,
        sourceCode: source.code,
        sourceLabel: source.label,
        title: text(item.title) || null,
        page: text(item.page) || null,
        paragraph: numberOrNull(item.paragraph),
        text: text(item.text),
        score: numberOrNull(item.score),
        matchKind: "semantic",
        metadata: metadataFrom(item.metadata),
      };
    }),
  ).sort((left, right) => (right.score ?? 0) - (left.score ?? 0));

  const failures = Array.isArray(body.failedSources)
    ? body.failedSources.map((value) => {
        const item = record(value);
        return { sourceId: text(item.sourceId), detail: text(item.detail) };
      })
    : [];
  const rawRateLimit = record(body.rateLimit);
  const remaining = rawRateLimit.remaining;

  return {
    query: text(body.query),
    kind: "smart",
    totalFound: numberOrNull(body.totalFound) ?? results.length,
    shownCount: results.length,
    durationMs: numberOrNull(body.durationMs) ?? 0,
    groups: buildGroups(results),
    results,
    failures,
    ...(Object.keys(rawRateLimit).length
      ? {
          rateLimit: {
            count: numberOrNull(rawRateLimit.count) ?? 0,
            remaining: remaining === null ? null : numberOrNull(remaining),
          },
        }
      : {}),
  };
}

export function adaptLiteralResponse(
  payload: unknown,
  catalog: CorpusSource[],
  durationMs: number,
): CorpusSearchResponse {
  const body = record(payload);
  const rawGroups = Array.isArray(body.groups) ? body.groups : [];
  const totals = new Map<string, number>();
  const mapped: CorpusSearchResult[] = [];

  for (const groupValue of rawGroups) {
    const group = record(groupValue);
    const source = sourceFor(catalog, group.bookCode || group.indexId, group.bookLabel);
    totals.set(source.id, numberOrNull(group.totalFound) ?? 0);
    const matches = Array.isArray(group.matches) ? group.matches : [];
    matches.forEach((value, index) => {
      const item = record(value);
      const data = record(item.data);
      mapped.push({
        id: `${source.id}-${text(item.row || item.number) || index + 1}`,
        sourceId: source.id,
        sourceCode: source.code,
        sourceLabel: source.label,
        title: text(item.title || data.title) || null,
        page: text(item.pagina || data.page || data.pagina) || null,
        paragraph: numberOrNull(item.number || item.row || data.paragraph_number),
        text: text(item.text),
        score: null,
        matchKind: "literal",
        metadata: metadataFrom(data),
      });
    });
  }

  const results = dedupeResults(mapped);
  return {
    query: text(body.term),
    kind: "literal",
    totalFound: numberOrNull(body.totalFound) ?? results.length,
    shownCount: results.length,
    durationMs,
    groups: buildGroups(results, totals),
    results,
    failures: [],
  };
}
