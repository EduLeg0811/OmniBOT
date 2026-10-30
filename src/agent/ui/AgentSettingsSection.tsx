import { useState } from "react";
import { ChevronRight } from "lucide-react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { AGENT_CLASSIFIER_MODEL, AGENT_CLASSIFIER_REASONING } from "@/agent/config";
import { agentInstructionsFor } from "@/agent/planner/prompt";
import type { AgentSettings } from "@/agent/settings";

type Props = {
  value: AgentSettings;
  onChange: (next: AgentSettings) => void;
  isAdmin: boolean;
  english: boolean;
};

/** O modo já é escolhido na recuperação documental; aqui só se calibra Luna. */
export function AgentSettingsSection({ value, onChange, isAdmin, english }: Props) {
  const [promptOpen, setPromptOpen] = useState(false);
  if (!isAdmin) return null;

  const set = (patch: Partial<AgentSettings>) => onChange({ ...value, ...patch });

  return (
    <section className="space-y-2 rounded-xl border border-chart-2/20 bg-chart-2/5 p-3">
      <button
        type="button"
        onClick={() => setPromptOpen((open) => !open)}
        className="flex w-full items-center gap-1.5 text-left text-[11px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronRight
          className={`size-3 shrink-0 transition-transform ${promptOpen ? "rotate-90" : ""}`}
          aria-hidden="true"
        />
        <span className="font-medium text-foreground">Configurações do Agent</span>
        <span className="ml-auto text-[10px] text-muted-foreground/70">
          {AGENT_CLASSIFIER_MODEL} · {AGENT_CLASSIFIER_REASONING.label}
        </span>
      </button>
      <p className="pl-[18px] text-[10px] leading-relaxed text-muted-foreground">
        Controla a continuidade sugerida e a calibração de Luna.
      </p>

      {promptOpen ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-card/80 px-3 py-2.5">
            <div>
              <label className="text-[11px] font-medium text-foreground" htmlFor="agent-follow-up">
                Pergunta de continuidade
              </label>
              <p className="mt-0.5 text-[9px] leading-snug text-muted-foreground">
                Sugere um pill curto e contextual ao final da resposta.
              </p>
            </div>
            <SwitchPrimitives.Root
              id="agent-follow-up"
              aria-label="Ativar pergunta de continuidade"
              className="inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-input shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=checked]:bg-primary"
              checked={value.followUpSuggestions}
              onCheckedChange={(checked) => set({ followUpSuggestions: checked })}
            >
              <SwitchPrimitives.Thumb className="pointer-events-none block size-4 rounded-full bg-background shadow-lg transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0" />
            </SwitchPrimitives.Root>
          </div>

          <div className="space-y-2 rounded-lg border border-border/70 bg-card/80 p-3">
            <div>
              <label className="text-[11px] font-medium text-foreground">
                Destino das buscas sugeridas (Pills)
              </label>
              <p className="mt-0.5 text-[9px] leading-snug text-muted-foreground">
                Define para onde apontam os pills de verbetes e livros citados na resposta.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => set({ pillDestination: "cons-ia" })}
                className={`flex flex-col items-start rounded-md border p-2 text-left transition-colors ${
                  value.pillDestination !== "consteca"
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border/60 bg-background/50 text-muted-foreground hover:bg-background"
                }`}
              >
                <span className="text-[10px] font-semibold">Opção B (Padrão)</span>
                <span className="text-[9px] leading-tight text-muted-foreground">
                  Ferramentas Cons-IA (externas)
                </span>
              </button>
              <button
                type="button"
                onClick={() => set({ pillDestination: "consteca" })}
                className={`flex flex-col items-start rounded-md border p-2 text-left transition-colors ${
                  value.pillDestination === "consteca"
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border/60 bg-background/50 text-muted-foreground hover:bg-background"
                }`}
              >
                <span className="text-[10px] font-semibold">Opção A</span>
                <span className="text-[9px] leading-tight text-muted-foreground">
                  ConsTECA (busca interna)
                </span>
              </button>
            </div>
          </div>

          <label className="block text-[10px] font-medium text-foreground" htmlFor="agent-prompt">
            Prompt avançado de Luna
          </label>
          <textarea
            id="agent-prompt"
            className="flex min-h-[96px] w-full rounded-lg border border-input bg-card px-3 py-2 text-[11px] leading-relaxed shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={value.prompt || agentInstructionsFor(english)}
            rows={8}
            onChange={(event) => set({ prompt: event.target.value })}
          />
        </div>
      ) : null}
    </section>
  );
}
