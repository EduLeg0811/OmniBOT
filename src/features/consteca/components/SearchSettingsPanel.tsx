import {
  BookOpen,
  Layers,
  ListOrdered,
  RotateCcw,
  Settings2,
  Sparkles,
} from "lucide-react";

import type { ResultsView, SearchKind } from "@/features/consteca/types";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type SearchSettingsPanelProps = {
  kind: SearchKind;
  onKindChange: (kind: SearchKind) => void;
  view: ResultsView;
  onViewChange: (view: ResultsView) => void;
  literalLimit: number;
  onLiteralLimitChange: (limit: number) => void;
  smartLimit: number;
  onSmartLimitChange: (limit: number) => void;
  miniTextWindow: number;
  onMiniTextWindowChange: (window: number) => void;
  highlightEnabled: boolean;
  onHighlightEnabledChange: (enabled: boolean) => void;
  minScore: number | null;
  onMinScoreChange: (score: number | null) => void;
  onResetDefaults: () => void;
  idPrefix?: string;
};

export function SearchSettingsPanel({
  kind,
  onKindChange,
  view,
  onViewChange,
  literalLimit,
  onLiteralLimitChange,
  smartLimit,
  onSmartLimitChange,
  miniTextWindow,
  onMiniTextWindowChange,
  highlightEnabled,
  onHighlightEnabledChange,
  minScore,
  onMinScoreChange,
  onResetDefaults,
  idPrefix = "consteca-settings",
}: SearchSettingsPanelProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start gap-2.5 pb-2">
        <div className="rounded-xl bg-primary/10 p-2 text-primary">
          <Settings2 className="size-4" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Configurações de Busca</h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            Ajuste modo, limites e o formato dos resultados.
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        {/* Seção 1: Modo e Apresentação */}
        <section className="space-y-3 rounded-2xl border border-border/70 bg-secondary/[0.18] p-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Modo de Busca
          </p>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Modo de busca">
            {(
              [
                ["literal", "Literal", "Termos exatos & operadores", BookOpen],
                ["smart", "Inteligente", "Similaridade semântica", Sparkles],
              ] as const
            ).map(([mode, label, description, Icon]) => {
              const active = kind === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onKindChange(mode)}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-xl border p-2.5 text-left transition-all",
                    active
                      ? "border-primary/50 bg-primary/10 text-primary shadow-xs"
                      : "border-border/70 bg-background/60 text-muted-foreground hover:border-border hover:bg-secondary/40 hover:text-foreground",
                  )}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">{label}</span>
                    <Icon className={cn("size-3.5", active ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <span className="text-[9px] leading-tight text-muted-foreground">
                    {description}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="border-t border-border/60 pt-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Visualização dos Resultados
            </p>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Visualização">
              {(
                [
                  ["grouped", "Por Obra", "Separado por fonte", Layers],
                  ["ranked", "Ranking Único", "Lista unificada", ListOrdered],
                ] as const
              ).map(([viewOption, label, desc, Icon]) => {
                const active = view === viewOption;
                return (
                  <button
                    key={viewOption}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onViewChange(viewOption)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border p-2 text-left transition-all",
                      active
                        ? "border-primary/50 bg-primary/10 text-primary shadow-xs"
                        : "border-border/70 bg-background/60 text-muted-foreground hover:border-border hover:bg-secondary/40 hover:text-foreground",
                    )}
                  >
                    <Icon className={cn("size-3.5 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                    <div className="min-w-0">
                      <span className="block text-xs font-medium text-foreground">{label}</span>
                      <span className="block text-[9px] text-muted-foreground">{desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Seção 2: Densidade e Limites de Resultados */}
        <section className="space-y-3 rounded-2xl border border-border/70 bg-secondary/[0.18] p-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Limites de Resultados
          </p>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor={`${idPrefix}-literal-limit`}
                className="text-xs font-medium text-foreground"
              >
                Busca Literal (por fonte)
              </label>
              <input
                id={`${idPrefix}-literal-limit`}
                type="number"
                min={1}
                max={100}
                value={literalLimit}
                onChange={(e) =>
                  onLiteralLimitChange(Math.min(100, Math.max(1, Number(e.target.value) || 1)))
                }
                className="h-7 w-16 rounded-md border border-input bg-background px-2 text-right text-xs tabular-nums outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              Teto de ocorrências exibidas por livro ou documento.
            </p>
            <div className="flex gap-1 pt-1">
              {[5, 10, 20, 50].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => onLiteralLimitChange(val)}
                  className={cn(
                    "rounded-md border px-2 py-0.5 text-[10px] transition-colors",
                    literalLimit === val
                      ? "border-primary/50 bg-primary/10 font-semibold text-primary"
                      : "border-border/70 bg-background/50 text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  )}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border/60 pt-2 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor={`${idPrefix}-smart-limit`}
                className="text-xs font-medium text-foreground"
              >
                Busca Inteligente (total)
              </label>
              <input
                id={`${idPrefix}-smart-limit`}
                type="number"
                min={1}
                max={100}
                value={smartLimit}
                onChange={(e) =>
                  onSmartLimitChange(Math.min(100, Math.max(1, Number(e.target.value) || 1)))
                }
                className="h-7 w-16 rounded-md border border-input bg-background px-2 text-right text-xs tabular-nums outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              Total consolidado de trechos mais relevantes do acervo.
            </p>
            <div className="flex gap-1 pt-1">
              {[10, 20, 30, 50].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => onSmartLimitChange(val)}
                  className={cn(
                    "rounded-md border px-2 py-0.5 text-[10px] transition-colors",
                    smartLimit === val
                      ? "border-primary/50 bg-primary/10 font-semibold text-primary"
                      : "border-border/70 bg-background/50 text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  )}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Seção 3: Recorte de Contexto e Visualização */}
        <section className="space-y-3 rounded-2xl border border-border/70 bg-secondary/[0.18] p-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Recorte de Contexto
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">Janela de Contexto</span>
              <span className="rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary tabular-nums">
                ± {miniTextWindow} {miniTextWindow === 1 ? "frase" : "frases"}
              </span>
            </div>
            <Slider
              min={1}
              max={8}
              step={1}
              value={[miniTextWindow]}
              onValueChange={([val]) => val !== undefined && onMiniTextWindowChange(val)}
              className="py-1"
            />
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Controla quantas sentenças antes e depois do match são incluídas em fontes longas (como a Minitertúlia), fundindo trechos próximos com <code className="text-foreground">[...]</code>.
            </p>
          </div>

          <div className="border-t border-border/60 pt-3 flex items-center justify-between gap-2">
            <div>
              <span className="block text-xs font-medium text-foreground">Destaque de Termos</span>
              <span className="block text-[10px] text-muted-foreground">
                Realce visual amarelo (<mark className="rounded bg-amber-200 px-1 dark:bg-amber-800/80 dark:text-amber-100">mark</mark>) nos termos buscados.
              </span>
            </div>
            <Switch
              id={`${idPrefix}-highlight-switch`}
              checked={highlightEnabled}
              onCheckedChange={onHighlightEnabledChange}
              aria-label="Ativar destaque visual dos termos"
            />
          </div>
        </section>

        {/* Seção 4: Relevância e Presets */}
        <section className="space-y-2.5 rounded-2xl border border-border/70 bg-secondary/[0.18] p-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Sensibilidade Semântica
          </p>
          <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Sensibilidade semântica">
            {(
              [
                [null, "Ampla", "Todos os trechos"],
                [0.65, "Equilibrada", "Padrão sugerido"],
                [0.75, "Rigorosa", "Alta aderência"],
              ] as const
            ).map(([scoreVal, label, tooltip]) => {
              const active = minScore === scoreVal;
              return (
                <button
                  key={label}
                  type="button"
                  title={tooltip}
                  onClick={() => onMinScoreChange(scoreVal)}
                  className={cn(
                    "rounded-xl border p-2 text-center transition-all",
                    active
                      ? "border-primary/50 bg-primary/10 font-semibold text-primary shadow-xs"
                      : "border-border/70 bg-background/50 text-muted-foreground hover:bg-secondary/40 hover:text-foreground",
                  )}
                >
                  <span className="block text-xs">{label}</span>
                  <span className="block text-[9px] text-muted-foreground">
                    {scoreVal === null ? "0.0+" : `${scoreVal}+`}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Filtra ocorrências com base no score de similaridade conceitual vetorial.
          </p>
        </section>
      </div>

      {/* Rodapé: Restaurar padrões */}
      <div className="mt-3 border-t border-border/65 pt-3">
        <button
          type="button"
          onClick={onResetDefaults}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border/80 bg-background/80 px-3 py-2 text-xs font-medium text-muted-foreground transition-all hover:border-primary/50 hover:bg-secondary/50 hover:text-foreground active:scale-[0.99]"
        >
          <RotateCcw className="size-3.5" /> Restaurar Configurações Padrão
        </button>
      </div>
    </div>
  );
}
