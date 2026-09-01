import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpenText,
  ChevronDown,
  ExternalLink,
  Highlighter,
  Layers3,
  ListFilter,
  SearchX,
  Sparkles,
} from "lucide-react";

import { HighlightedCorpusText } from "@/features/consteca/highlight";
import type {
  CorpusResultGroup,
  CorpusSearchResponse,
  CorpusSearchResult,
  ResultsView,
} from "@/features/consteca/types";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const PILL_STYLES = [
  "border-rose-200/80 bg-rose-50 text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/45 dark:text-rose-200",
  "border-amber-200/80 bg-amber-50 text-amber-900 dark:border-amber-800/55 dark:bg-amber-950/35 dark:text-amber-100",
  "border-emerald-200/80 bg-emerald-50 text-emerald-800 dark:border-emerald-800/55 dark:bg-emerald-950/35 dark:text-emerald-100",
  "border-violet-200/80 bg-violet-50 text-violet-800 dark:border-violet-800/55 dark:bg-violet-950/35 dark:text-violet-100",
  "border-cyan-200/80 bg-cyan-50 text-cyan-800 dark:border-cyan-800/55 dark:bg-cyan-950/35 dark:text-cyan-100",
] as const;

function Pill({ children, index = 0 }: { children: React.ReactNode; index?: number }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium leading-tight",
        PILL_STYLES[index % PILL_STYLES.length],
      )}
    >
      {children}
    </span>
  );
}

function safeLink(value?: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function ResultCard({
  result,
  query,
  position,
  highlight,
}: {
  result: CorpusSearchResult;
  query: string;
  position: number;
  highlight: boolean;
}) {
  const metadata = result.metadata;
  const link = safeLink(metadata.link);
  const details = [
    metadata.area,
    metadata.theme,
    metadata.author,
    metadata.date,
    metadata.section,
    metadata.argument,
    metadata.folha,
    metadata.sigla,
  ].filter(Boolean) as string[];

  return (
    <article className="group relative border-b border-border/60 py-3 first:pt-1 last:border-b-0 last:pb-1">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 w-7 shrink-0 font-mono text-[10px] font-semibold tabular-nums text-primary/75">
          {String(position).padStart(2, "0")}.
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-0 flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              {result.title ? (
                <h3 className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/80">
                  {result.title}
                </h3>
              ) : null}
              {/* <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary/80">
                {result.sourceLabel}
              </p> */}
            </div>
            {result.matchKind === "semantic" && result.score !== null ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/25 bg-primary/[0.07] px-2 py-1 text-[9px] font-semibold text-primary">
                <Sparkles className="size-2.5" /> {Math.round(result.score * 100)}% similar
              </span>
            ) : null}
          </div>

          <div className="text-[11px] leading-[1.4] text-foreground/90 sm:text-[13px]">
            <HighlightedCorpusText highlight={highlight} query={query} text={result.text} />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Pill index={0}>{result.sourceCode}</Pill>
            {result.page ? <Pill index={2}>pág. {result.page}</Pill> : null}
            {/* {result.paragraph ? <Pill index={3}>§ {result.paragraph}</Pill> : null} */}
            {details.map((detail, index) => (
              <Pill index={index + 1} key={`${detail}-${index}`}>
                {detail}
              </Pill>
            ))}
            {link ? (
              <a
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-primary hover:bg-primary/10"
                href={link}
                rel="noopener noreferrer"
                target="_blank"
              >
                Abrir fonte <ExternalLink className="size-2.5" />
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function GroupPanel({
  group,
  query,
  highlight,
  open,
  onToggle,
}: {
  group: CorpusResultGroup;
  query: string;
  highlight: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border/75 bg-card/92 shadow-[var(--shadow-soft)]">
      <button
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/45"
        onClick={onToggle}
        type="button"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-mono text-[10px] font-bold text-primary">
          {group.sourceCode.slice(0, 5)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold text-foreground">
            {group.sourceLabel}
          </span>
          <span className="mt-0.5 block text-[10px] text-muted-foreground">
            {group.shownCount} exibido{group.shownCount === 1 ? "" : "s"}
            {group.totalFound > group.shownCount ? ` de ${group.totalFound}` : ""}
          </span>
        </span>
        {group.topScore !== null ? (
          <span className="hidden text-[10px] font-semibold text-primary sm:block">
            até {Math.round(group.topScore * 100)}%
          </span>
        ) : null}
        <ChevronDown
          className={cn(
            "size-4 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div className="border-t border-border/65 bg-background/45 px-4 py-4 sm:px-6">
          {group.results.map((result, index) => (
            <ResultCard
              highlight={highlight}
              key={result.id}
              position={index + 1}
              query={query}
              result={result}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function ResultsSkeleton() {
  return (
    <div aria-label="Buscando no corpus" className="space-y-3" role="status">
      {[0, 1, 2].map((item) => (
        <div className="rounded-2xl border border-border/70 bg-card p-5" key={item}>
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-2.5 w-1/5" />
            </div>
          </div>
          <div className="mt-5 space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-[92%]" />
            <Skeleton className="h-3 w-[70%]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SearchResults({
  response,
  view,
  onViewChange,
}: {
  response: CorpusSearchResponse;
  view: ResultsView;
  onViewChange: (view: ResultsView) => void;
}) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [highlightEnabled, setHighlightEnabled] = useState(true);
  useEffect(() => {
    setOpenGroups(new Set(response.groups[0] ? [response.groups[0].sourceId] : []));
  }, [response]);
  const ordered = useMemo(
    () =>
      response.kind === "smart"
        ? [...response.results].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        : response.groups.flatMap((group) => group.results),
    [response],
  );

  if (!response.results.length) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-card/60 px-6 py-14 text-center">
        <SearchX className="mx-auto size-8 text-primary/55" />
        <h2 className="mt-4 font-display text-lg font-semibold">Nenhum trecho encontrado</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          Tente termos mais amplos, outra modalidade de busca ou acrescente novas fontes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {response.failures.length ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-300/50 bg-amber-50/70 px-3 py-2.5 text-[11px] text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/25 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>
            A busca foi concluída parcialmente. {response.failures.length} fonte
            {response.failures.length === 1 ? " falhou" : "s falharam"}.
          </span>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/75 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <BookOpenText className="size-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">
              {response.shownCount.toLocaleString("pt-BR")} trecho
              {response.shownCount === 1 ? "" : "s"} exibido{response.shownCount === 1 ? "" : "s"}
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {response.totalFound.toLocaleString("pt-BR")} encontrado
              {response.totalFound === 1 ? "" : "s"} ·{" "}
              {(response.durationMs / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} s
              {response.rateLimit?.remaining !== null && response.rateLimit?.remaining !== undefined
                ? ` · ${response.rateLimit.remaining} consultas IA restantes`
                : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            aria-label={
              highlightEnabled ? "Ocultar destaque dos termos" : "Mostrar destaque dos termos"
            }
            aria-pressed={highlightEnabled}
            className={cn(
              "rounded-lg border p-2 transition-colors",
              highlightEnabled
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setHighlightEnabled((current) => !current)}
            title={highlightEnabled ? "Ocultar destaque dos termos" : "Mostrar destaque dos termos"}
            type="button"
          >
            <Highlighter className="size-3.5" />
          </button>
          <div className="flex rounded-lg border border-border bg-background p-0.5">
            <button
              aria-label="Agrupar por obra"
              aria-pressed={view === "grouped"}
              className={cn(
                "rounded-md p-1.5 transition-colors",
                view === "grouped"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => onViewChange("grouped")}
              title="Agrupar por obra"
              type="button"
            >
              <Layers3 className="size-3.5" />
            </button>
            <button
              aria-label={response.kind === "smart" ? "Ordenar por relevância" : "Lista contínua"}
              aria-pressed={view === "ranked"}
              className={cn(
                "rounded-md p-1.5 transition-colors",
                view === "ranked"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => onViewChange("ranked")}
              title={response.kind === "smart" ? "Ranking de relevância" : "Lista contínua"}
              type="button"
            >
              <ListFilter className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {view === "grouped" ? (
        <div className="space-y-2.5">
          {response.groups.map((group) => (
            <GroupPanel
              group={group}
              highlight={highlightEnabled}
              key={group.sourceId}
              onToggle={() =>
                setOpenGroups((current) => {
                  const next = new Set(current);
                  if (next.has(group.sourceId)) next.delete(group.sourceId);
                  else next.add(group.sourceId);
                  return next;
                })
              }
              open={openGroups.has(group.sourceId)}
              query={response.query}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-border/75 bg-card/92 px-4 py-5 shadow-[var(--shadow-soft)] sm:px-6">
          {ordered.map((result, index) => (
            <ResultCard
              highlight={highlightEnabled}
              key={result.id}
              position={index + 1}
              query={response.query}
              result={result}
            />
          ))}
        </div>
      )}
    </div>
  );
}
