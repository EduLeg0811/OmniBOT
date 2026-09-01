import type { ReactNode } from "react";

const BOOLEAN_WORDS = new Set(["and", "or", "not", "e", "ou", "nao", "não"]);

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

// Shared with adapter tests; keeping it beside the renderer avoids duplicating
// the exact normalization rules used by the visual highlight.
// eslint-disable-next-line react-refresh/only-export-components
export function extractHighlightTerms(query: string): string[] {
  const quoted = [...query.matchAll(/["“”']([^"“”']+)["“”']/g)].map((match) => match[1]!.trim());
  const words = query
    .replace(/["“”'()]/g, " ")
    .split(/[^\p{L}\p{N}-]+/u)
    .map((word) => word.trim())
    .filter((word) => word.length >= 2 && !BOOLEAN_WORDS.has(normalize(word)));
  const unique = new Map<string, string>();
  for (const term of [...quoted, ...words].sort((a, b) => b.length - a.length)) {
    if (term) unique.set(normalize(term), term);
  }
  return [...unique.values()];
}

function highlightedNodes(value: string, terms: string[], keyPrefix: string): ReactNode[] {
  if (!value || terms.length === 0) return [value];
  const normalizedValue = normalize(value);
  const ranges: Array<[number, number]> = [];
  for (const term of terms) {
    const normalizedTerm = normalize(term);
    if (!normalizedTerm) continue;
    let cursor = 0;
    while (cursor < normalizedValue.length) {
      const start = normalizedValue.indexOf(normalizedTerm, cursor);
      if (start < 0) break;
      ranges.push([start, start + normalizedTerm.length]);
      cursor = start + Math.max(1, normalizedTerm.length);
    }
  }
  if (!ranges.length) return [value];
  ranges.sort((left, right) => left[0] - right[0] || right[1] - left[1]);
  const merged: Array<[number, number]> = [];
  for (const range of ranges) {
    const previous = merged.at(-1);
    if (previous && range[0] <= previous[1]) previous[1] = Math.max(previous[1], range[1]);
    else merged.push([...range]);
  }
  const nodes: ReactNode[] = [];
  let cursor = 0;
  merged.forEach(([start, end], index) => {
    if (start > cursor) nodes.push(value.slice(cursor, start));
    nodes.push(
      <mark
        className="rounded-[0.22rem] bg-amber-200/85 px-0.5 text-inherit ring-1 ring-amber-300/35 dark:bg-amber-300/80 dark:text-stone-950"
        key={`${keyPrefix}-${index}`}
      >
        {value.slice(start, end)}
      </mark>,
    );
    cursor = end;
  });
  if (cursor < value.length) nodes.push(value.slice(cursor));
  return nodes;
}

function InlineText({ value, terms, line }: { value: string; terms: string[]; line: number }) {
  const parts = value.split(/(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*)/g).filter(Boolean);
  return parts.map((part, index) => {
    const bold =
      (part.startsWith("**") && part.endsWith("**")) ||
      (part.startsWith("__") && part.endsWith("__"));
    const italic = !bold && part.startsWith("*") && part.endsWith("*");
    const content = bold ? part.slice(2, -2) : italic ? part.slice(1, -1) : part;
    const children = highlightedNodes(content, terms, `${line}-${index}`);
    if (bold) return <strong key={`${line}-${index}`}>{children}</strong>;
    if (italic) return <em key={`${line}-${index}`}>{children}</em>;
    return <span key={`${line}-${index}`}>{children}</span>;
  });
}

export function HighlightedCorpusText({
  text,
  query,
  highlight = true,
}: {
  text: string;
  query: string;
  highlight?: boolean;
}) {
  const terms = highlight ? extractHighlightTerms(query) : [];
  return (
    <div className="space-y-2">
      {text.split(/\n{2,}/).map((paragraph, index) => (
        <p className="whitespace-pre-line" key={index}>
          <InlineText line={index} terms={terms} value={paragraph} />
        </p>
      ))}
    </div>
  );
}
