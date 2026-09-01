import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, LibraryBig, LoaderCircle, PanelLeft, Search, Sparkles } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { ProductHeader } from "@/components/ProductHeader";
import { ResizableSidebar } from "@/components/ResizableSidebar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CorpusSearchError, fetchCorpusSources, searchCorpus } from "@/features/consteca/api";
import {
  SearchKindControl,
  SourceFilterPanel,
} from "@/features/consteca/components/SearchControls";
import { ResultsSkeleton, SearchResults } from "@/features/consteca/components/SearchResults";
import type {
  CorpusSearchResponse,
  CorpusSource,
  ResultsView,
  SearchKind,
  SearchPreferences,
} from "@/features/consteca/types";
import { useAppTheme } from "@/lib/app-theme";
import { logFeatureAccess } from "@/lib/access-log";
import { CONTAINER_WIDTH_CONFIG, nextContainerWidth, type ContainerWidth } from "@/lib/app-layout";
import { cn } from "@/lib/utils";

const PREFERENCES_KEY = "consteca:preferences:v1";
const DEFAULT_PREFERENCES: SearchPreferences = {
  kind: "smart",
  sourceIds: ["lo", "dac"],
  view: "grouped",
  smartLimit: 20,
  literalLimit: 10,
};

function loadPreferences(): SearchPreferences {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(PREFERENCES_KEY) || "{}",
    ) as Partial<SearchPreferences>;
    return {
      kind: parsed.kind === "literal" ? "literal" : "smart",
      sourceIds:
        Array.isArray(parsed.sourceIds) && parsed.sourceIds.length
          ? parsed.sourceIds.map(String)
          : [...DEFAULT_PREFERENCES.sourceIds],
      view: parsed.view === "ranked" ? "ranked" : "grouped",
      smartLimit: Math.min(
        100,
        Math.max(1, Number(parsed.smartLimit) || DEFAULT_PREFERENCES.smartLimit),
      ),
      literalLimit: Math.min(
        100,
        Math.max(1, Number(parsed.literalLimit) || DEFAULT_PREFERENCES.literalLimit),
      ),
    };
  } catch {
    return { ...DEFAULT_PREFERENCES, sourceIds: [...DEFAULT_PREFERENCES.sourceIds] };
  }
}

function paramsKind(value: string | null, fallback: SearchKind): SearchKind {
  return value === "literal" ? "literal" : value === "smart" ? "smart" : fallback;
}

function paramsView(value: string | null, fallback: ResultsView): ResultsView {
  return value === "ranked" ? "ranked" : value === "grouped" ? "grouped" : fallback;
}

function sourceIdsFromParams(value: string | null, fallback: string[]) {
  if (!value) return fallback;
  return [
    ...new Set(
      value
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

export function ConsTecaPage() {
  const { isDark, toggleTheme } = useAppTheme();
  const [containerWidth, setContainerWidth] = useState<ContainerWidth>("full");
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPreferences = useMemo(loadPreferences, []);
  const [query, setQuery] = useState(() => searchParams.get("q") || "");
  const [kind, setKind] = useState<SearchKind>(() =>
    paramsKind(searchParams.get("type"), initialPreferences.kind),
  );
  const [view, setView] = useState<ResultsView>(() =>
    paramsView(searchParams.get("view"), initialPreferences.view),
  );
  const [selectedSources, setSelectedSources] = useState(() =>
    sourceIdsFromParams(searchParams.get("sources"), initialPreferences.sourceIds),
  );
  const [smartLimit, setSmartLimit] = useState(initialPreferences.smartLimit);
  const [literalLimit, setLiteralLimit] = useState(initialPreferences.literalLimit);
  const [sources, setSources] = useState<CorpusSource[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [sourcesError, setSourcesError] = useState<string | null>(null);
  const [response, setResponse] = useState<CorpusSearchResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error" | "quota">("idle");
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const requestSequenceRef = useRef(0);
  const lastRequestKeyRef = useRef("");
  const limitsRef = useRef({ smart: smartLimit, literal: literalLimit });
  limitsRef.current = { smart: smartLimit, literal: literalLimit };

  useEffect(() => {
    const controller = new AbortController();
    setSourcesLoading(true);
    fetchCorpusSources(controller.signal)
      .then((catalog) => {
        setSources(catalog);
        setSourcesError(null);
        setSelectedSources((current) => {
          const valid = current.filter((id) => catalog.some((source) => source.id === id));
          return valid.length
            ? valid
            : ["lo", "dac"].filter((id) => catalog.some((source) => source.id === id));
        });
      })
      .catch((reason: unknown) => {
        if ((reason as Error)?.name !== "AbortError")
          setSourcesError(
            reason instanceof Error ? reason.message : "Não foi possível carregar o catálogo.",
          );
      })
      .finally(() => setSourcesLoading(false));
    return () => controller.abort();
  }, []);

  const executeSearch = useCallback(
    async (nextQuery: string, nextKind: SearchKind, nextSources: string[]) => {
      const availableIds = nextSources.filter((id) => {
        const source = sources.find((item) => item.id === id);
        return nextKind === "smart" ? source?.semanticAvailable : source?.lexicalAvailable;
      });
      if (!nextQuery.trim() || !availableIds.length) return;

      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      const sequence = ++requestSequenceRef.current;
      setStatus("loading");
      setError(null);
      setResponse(null);
      const limit = limitsRef.current[nextKind];

      try {
        const result = await searchCorpus({
          query: nextQuery.trim(),
          kind: nextKind,
          sourceIds: availableIds,
          limit,
          catalog: sources,
          signal: controller.signal,
        });
        if (sequence !== requestSequenceRef.current) return;
        setResponse(result);
        setStatus("done");
        logFeatureAccess({
          module: "consteca",
          action: nextKind === "smart" ? "smart_search" : "literal_search",
          label: "Busca no ConsTECA",
          value: nextQuery.trim(),
          meta: {
            sources: availableIds,
            results_count: result.shownCount,
            total_found: result.totalFound,
            duration_ms: result.durationMs,
          },
        });
      } catch (reason) {
        if ((reason as Error)?.name === "AbortError" || sequence !== requestSequenceRef.current)
          return;
        const searchError = reason instanceof CorpusSearchError ? reason : null;
        setError(reason instanceof Error ? reason.message : "Não foi possível realizar a busca.");
        setStatus(searchError?.quotaExceeded ? "quota" : "error");
      }
    },
    [sources],
  );

  useEffect(() => {
    if (!sources.length) return;
    const requestedQuery = (searchParams.get("q") || "").trim();
    if (!requestedQuery) return;
    const requestedKind = paramsKind(searchParams.get("type"), initialPreferences.kind);
    const requestedSources = sourceIdsFromParams(
      searchParams.get("sources"),
      initialPreferences.sourceIds,
    );
    const requestedView = paramsView(searchParams.get("view"), initialPreferences.view);
    setQuery(requestedQuery);
    setKind(requestedKind);
    setSelectedSources(requestedSources);
    setView(requestedView);
    const requestKey = `${requestedKind}|${requestedQuery}|${requestedSources.join(",")}`;
    if (lastRequestKeyRef.current === requestKey) return;
    lastRequestKeyRef.current = requestKey;
    void executeSearch(requestedQuery, requestedKind, requestedSources);
  }, [executeSearch, initialPreferences, searchParams, sources]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const availableSelected = selectedSources.filter((id) => {
    const source = sources.find((item) => item.id === id);
    return kind === "smart" ? source?.semanticAvailable : source?.lexicalAvailable;
  });
  const activeLimit = kind === "smart" ? smartLimit : literalLimit;
  const currentContainerWidth = CONTAINER_WIDTH_CONFIG[containerWidth];

  const savePreferences = (overrides: Partial<SearchPreferences> = {}) => {
    const preferences: SearchPreferences = {
      kind,
      sourceIds: selectedSources,
      view,
      smartLimit,
      literalLimit,
      ...overrides,
    };
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    } catch {
      // URL still preserves the active search when storage is unavailable.
    }
  };

  const submit = () => {
    const trimmed = query.trim();
    if (!trimmed || !availableSelected.length || status === "loading") return;
    savePreferences();
    const next = new URLSearchParams();
    next.set("q", trimmed);
    next.set("type", kind);
    next.set("sources", availableSelected.join(","));
    next.set("view", view);
    const requestKey = `${kind}|${trimmed}|${availableSelected.join(",")}`;
    if (next.toString() === searchParams.toString()) {
      lastRequestKeyRef.current = requestKey;
      void executeSearch(trimmed, kind, availableSelected);
    } else {
      setSearchParams(next);
    }
  };

  const changeView = (nextView: ResultsView) => {
    setView(nextView);
    savePreferences({ view: nextView });
    if (searchParams.get("q")) {
      const next = new URLSearchParams(searchParams);
      next.set("view", nextView);
      setSearchParams(next, { replace: true });
    }
  };

  const changeKind = (nextKind: SearchKind) => {
    setKind(nextKind);
    setResponse(null);
    setStatus("idle");
    setError(null);
    savePreferences({ kind: nextKind });
  };

  const startNewSearch = () => {
    controllerRef.current?.abort();
    requestSequenceRef.current += 1;
    lastRequestKeyRef.current = "";
    setQuery("");
    setResponse(null);
    setStatus("idle");
    setError(null);

    const next = new URLSearchParams();
    next.set("type", kind);
    next.set("sources", selectedSources.join(","));
    next.set("view", view);
    setSearchParams(next);
  };

  const filterPanel = (idPrefix: string) => (
    <SourceFilterPanel
      idPrefix={idPrefix}
      kind={kind}
      limit={activeLimit}
      onChange={setSelectedSources}
      onLimitChange={kind === "smart" ? setSmartLimit : setLiteralLimit}
      selected={selectedSources}
      sources={sources}
    />
  );

  const sidebarContent = (idPrefix: string) => (
    <div className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 shrink-0 items-center justify-center border-b border-border/70 px-3">
        <button
          className="group inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          onClick={startNewSearch}
          type="button"
        >
          <Sparkles className="size-4 text-amber-500 transition-transform group-hover:scale-110 group-hover:text-orange-500" />
          Nova Pesquisa
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
        <section className="shrink-0 space-y-2 border-b border-sidebar-border pb-4">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Modo de Busca
          </h2>
          <SearchKindControl onChange={changeKind} value={kind} />
        </section>
        <div className="min-h-0 flex-1">
          {sourcesLoading ? (
            <div className="flex items-center gap-2 py-8 text-xs text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" /> Carregando acervo...
            </div>
          ) : sourcesError ? (
            <p className="py-4 text-xs leading-relaxed text-destructive">{sourcesError}</p>
          ) : (
            filterPanel(idPrefix)
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="consteca-shell flex h-dvh bg-background text-foreground">
      <ResizableSidebar>{sidebarContent("consteca-desktop")}</ResizableSidebar>

      <div className="flex min-w-0 flex-1 flex-col">
        <ProductHeader
          containerWidthClass={currentContainerWidth.className}
          containerWidthLabel={currentContainerWidth.label}
          isDark={isDark}
          mobileNavigation={
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  aria-label="Abrir modos e fontes de pesquisa"
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <PanelLeft />
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[88vw] max-w-sm bg-sidebar p-0" side="left">
                <SheetHeader className="sr-only">
                  <SheetTitle>Configurações do ConsTECA</SheetTitle>
                  <SheetDescription>
                    Selecione o modo de busca, as fontes e o limite de resultados.
                  </SheetDescription>
                </SheetHeader>
                {sidebarContent("consteca-mobile")}
              </SheetContent>
            </Sheet>
          }
          onCycleContainerWidth={() => setContainerWidth((current) => nextContainerWidth(current))}
          onToggleTheme={toggleTheme}
          product="TECA"
          subtitle="Pesquisa no corpus da Conscienciologia"
        />

        <main
          className={cn(
            "mx-auto flex min-h-0 w-full flex-1 overflow-hidden transition-all duration-300",
            currentContainerWidth.className,
          )}
        >
          <div className="flex min-w-0 flex-1 flex-col px-4">
            <section aria-live="polite" className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto min-h-full py-5 sm:py-10">
                {status === "idle" ? (
                  <div className="flex min-h-full flex-col items-center justify-center pb-12 text-center">
                    <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <LibraryBig className="size-5" />
                    </span>
                    <h2 className="mt-5 font-display text-[24px] font-normal leading-[1.2] text-foreground sm:text-[42px]">
                      Pesquisa no corpus
                      <br />
                      <span className="italic text-primary/80">com contexto e precisão</span>
                    </h2>
                    <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">
                      Consulte ideias por significado ou encontre expressões exatas preservando a
                      origem bibliográfica de cada trecho.
                    </p>
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[10px] font-medium text-muted-foreground">
                      <span className="rounded-full border border-border bg-card px-3 py-1.5">
                        {kind === "smart" ? "Busca inteligente" : "Busca literal"}
                      </span>
                      <span className="rounded-full border border-border bg-card px-3 py-1.5">
                        {availableSelected.length} fonte
                        {availableSelected.length === 1 ? "" : "s"} selecionada
                        {availableSelected.length === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                ) : null}

                {status === "loading" ? <ResultsSkeleton /> : null}

                {status === "error" || status === "quota" ? (
                  <div
                    className={cn(
                      "rounded-2xl border px-5 py-6",
                      status === "quota"
                        ? "border-amber-300/55 bg-amber-50/70 dark:border-amber-800/50 dark:bg-amber-950/25"
                        : "border-destructive/30 bg-destructive/5",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle
                        className={cn(
                          "mt-0.5 size-5 shrink-0",
                          status === "quota"
                            ? "text-amber-700 dark:text-amber-300"
                            : "text-destructive",
                        )}
                      />
                      <div>
                        <h2 className="text-sm font-semibold">
                          {status === "quota"
                            ? "Cota diária de buscas inteligentes atingida"
                            : "Não foi possível concluir a busca"}
                        </h2>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {error}
                        </p>
                        {status === "quota" ? (
                          <button
                            className="mt-3 text-xs font-semibold text-primary hover:underline"
                            onClick={() => changeKind("literal")}
                            type="button"
                          >
                            Continuar com busca Literal
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}

                {status === "done" && response ? (
                  <SearchResults onViewChange={changeView} response={response} view={view} />
                ) : null}
              </div>
            </section>

            <div className="shrink-0 bg-background pb-9 pt-3 sm:pb-5">
              {kind === "smart" && availableSelected.length > 4 ? (
                <p className="mb-2 rounded-xl border border-amber-300/45 bg-amber-50/65 px-3 py-2 text-[10px] text-amber-900 dark:border-amber-800/45 dark:bg-amber-950/25 dark:text-amber-100">
                  A busca inteligente em muitas fontes pode levar mais tempo.
                </p>
              ) : null}
              <PromptInput
                className="[&_[data-slot=input-group]]:rounded-[28px] [&_[data-slot=input-group]]:border-border/70 [&_[data-slot=input-group]]:bg-card [&_[data-slot=input-group]]:shadow-[0_3px_14px_-5px_color-mix(in_oklch,var(--primary)_28%,transparent)]"
                onSubmit={(_message, event) => {
                  event.preventDefault();
                  submit();
                }}
              >
                <PromptInputTextarea
                  aria-label="Consulta ao corpus"
                  className="field-sizing-content max-h-48 min-h-14 resize-none bg-transparent px-5 py-4 text-base font-chat"
                  maxLength={4000}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={
                    kind === "smart"
                      ? "Que ideia ou relação você quer encontrar no corpus?"
                      : "Qual termo ou expressão você quer localizar?"
                  }
                  value={query}
                />
                <div className="flex shrink-0 items-center pr-2">
                  <PromptInputSubmit
                    aria-label="Pesquisar no corpus"
                    className="size-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-primary/35 disabled:text-primary-foreground"
                    disabled={!query.trim() || !availableSelected.length || status === "loading"}
                    status={status === "loading" ? "submitted" : "ready"}
                  >
                    {status === "loading" ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Search className="size-5" />
                    )}
                  </PromptInputSubmit>
                </div>
              </PromptInput>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-2 text-[11px] text-muted-foreground/60">
                <span>
                  {kind === "smart" ? "Inteligente" : "Literal"} · {availableSelected.length} fonte
                  {availableSelected.length === 1 ? "" : "s"} · Enter para pesquisar
                </span>
                <span className="tabular-nums">{query.length.toLocaleString("pt-BR")} / 4.000</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
