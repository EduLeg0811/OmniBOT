import { BookOpen, Check, Gauge, RotateCcw, Sparkles } from "lucide-react";

import type { CorpusSource, SearchKind } from "@/features/consteca/types";
import { cn } from "@/lib/utils";

export function SearchKindControl({
  value,
  onChange,
}: {
  value: SearchKind;
  onChange: (value: SearchKind) => void;
}) {
  return (
    <div
      aria-label="Tipo de busca"
      className="grid grid-cols-2 rounded-xl border border-border/75 bg-background/70 p-1 shadow-sm"
      role="group"
    >
      {(
        [
          ["literal", "Literal", "Termos e expressões", BookOpen],
          ["smart", "Inteligente", "Busca por significado", Sparkles],
        ] as const
      ).map(([kind, label, description, Icon]) => {
        const active = value === kind;
        return (
          <button
            aria-pressed={active}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-left transition-all duration-200",
              active
                ? "bg-primary text-primary-foreground shadow-[0_6px_18px_-12px_var(--primary)]"
                : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
            )}
            key={kind}
            onClick={() => onChange(kind)}
            type="button"
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-xs font-semibold">{label}</span>
              <span
                className={cn(
                  "hidden text-[9px] sm:block",
                  active ? "text-primary-foreground/75" : "text-muted-foreground",
                )}
              >
                {description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function SourceFilterPanel({
  sources,
  selected,
  kind,
  limit,
  onLimitChange,
  onChange,
  idPrefix = "consteca",
}: {
  sources: CorpusSource[];
  selected: string[];
  kind: SearchKind;
  limit: number;
  onLimitChange: (value: number) => void;
  onChange: (ids: string[]) => void;
  idPrefix?: string;
}) {
  const available = sources.filter((source) =>
    kind === "smart" ? source.semanticAvailable : source.lexicalAvailable,
  );
  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id]);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start gap-2.5">
        <div className="rounded-xl bg-primary/10 p-2 text-primary">
          <Gauge className="size-4" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Refinar Acervo</h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            Escolha onde a pesquisa será realizada.
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Fontes · {selected.filter((id) => available.some((source) => source.id === id)).length}
        </p>
        <div className="flex items-center gap-1.5 text-[10px] font-medium">
          <button
            className="text-primary hover:underline"
            onClick={() => onChange(available.map((source) => source.id))}
            type="button"
          >
            Todas
          </button>
          <span className="text-border">/</span>
          <button
            className="text-muted-foreground hover:text-foreground"
            onClick={() => onChange([])}
            type="button"
          >
            Limpar
          </button>
        </div>
      </div>

      <div className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {sources.map((source) => {
          const enabled = kind === "smart" ? source.semanticAvailable : source.lexicalAvailable;
          const active = enabled && selected.includes(source.id);
          return (
            <button
              aria-pressed={active}
              className={cn(
                "group flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-all",
                active
                  ? "border-primary/35 bg-primary/[0.07] text-foreground"
                  : "border-transparent bg-transparent text-muted-foreground hover:border-border/70 hover:bg-secondary/45 hover:text-foreground",
                !enabled && "cursor-not-allowed opacity-40",
              )}
              disabled={!enabled}
              key={source.id}
              onClick={() => toggle(source.id)}
              title={
                !enabled
                  ? `Fonte indisponível para busca ${kind === "smart" ? "inteligente" : "literal"}`
                  : source.label
              }
              type="button"
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-md border text-primary",
                  active ? "border-primary/45 bg-primary/10" : "border-border bg-background",
                )}
              >
                {active ? <Check className="size-3" /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-semibold">{source.code}</span>
                <span className="block truncate text-[9px] text-muted-foreground">
                  {source.label}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 space-y-2 border-t border-border/65 pt-4">
        <label
          className="flex items-center justify-between gap-3 text-[11px] font-medium text-foreground"
          htmlFor={`${idPrefix}-limit`}
        >
          <span>{kind === "smart" ? "Resultados totais" : "Resultados por fonte"}</span>
          <input
            className="h-8 w-16 rounded-lg border border-input bg-background px-2 text-right text-xs tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            id={`${idPrefix}-limit`}
            max={100}
            min={1}
            onChange={(event) =>
              onLimitChange(Math.min(100, Math.max(1, Number(event.target.value) || 1)))
            }
            type="number"
            value={limit}
          />
        </label>
        <button
          className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => {
            onChange(["lo", "dac"].filter((id) => available.some((source) => source.id === id)));
            onLimitChange(kind === "smart" ? 20 : 10);
          }}
          type="button"
        >
          <RotateCcw className="size-3" /> Restaurar padrão
        </button>
      </div>
    </div>
  );
}
