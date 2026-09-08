import type { ReactNode } from "react";
import { Maximize2, Moon, Sun } from "lucide-react";

import { AppModeSwitcher } from "@/components/AppModeSwitcher";
import { cn } from "@/lib/utils";

type ProductHeaderProps = {
  product: "BOT" | "TECA";
  subtitle: string;
  containerWidthClass: string;
  containerWidthLabel: string;
  isDark: boolean;
  onCycleContainerWidth: () => void;
  onToggleTheme: () => void;
  mobileNavigation?: ReactNode;
  brandHref?: string;
  showModeSwitcher?: boolean;
};

export function ProductHeader({
  product,
  subtitle,
  containerWidthClass,
  containerWidthLabel,
  isDark,
  onCycleContainerWidth,
  onToggleTheme,
  mobileNavigation,
  brandHref,
  showModeSwitcher = true,
}: ProductHeaderProps) {
  const brand = (
    <>
      <img
        alt=""
        aria-hidden="true"
        className="h-12 w-12 shrink-0 object-contain transition-transform duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_color-mix(in_oklch,var(--primary)_40%,transparent)]"
        src="/icon.png"
      />
      <span className="flex min-w-0 items-center gap-2">
        <h1 className="max-w-[14rem] shrink-0 truncate font-nunito text-[1.35rem] font-normal tracking-tight text-foreground sm:max-w-none">
          Cons<em className="ml-[3px] font-semibold italic text-primary">{product}</em>
        </h1>
        <span className="mx-1 hidden h-4 w-px bg-border sm:inline" />
        <span className="hidden font-nunito-sans text-[10px] uppercase tracking-[0.22em] text-muted-foreground sm:inline">
          {subtitle}
        </span>
      </span>
    </>
  );

  return (
    <header className="flex h-16 shrink-0 items-center border-b border-border/70">
      <div
        className={cn(
          "mx-auto flex w-full items-center gap-3 px-4 transition-all duration-300",
          containerWidthClass,
        )}
      >
        {mobileNavigation ? <div className="lg:hidden">{mobileNavigation}</div> : null}
        {brandHref ? (
          <a
            aria-label={`Página inicial do Cons${product}`}
            className="group flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            href={brandHref}
            rel="noopener noreferrer"
            target="_blank"
            title="Ir para www.cons-ia.org"
          >
            {brand}
          </a>
        ) : (
          <div className="group flex min-w-0 items-center gap-3" aria-label={`Cons${product}`}>
            {brand}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {showModeSwitcher ? <AppModeSwitcher compact /> : null}
          <button
            aria-label={`Largura da tela: ${containerWidthLabel}`}
            className="hidden size-8 items-center justify-center rounded-lg border border-border/70 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
            onClick={onCycleContainerWidth}
            title={`Largura da tela: ${containerWidthLabel}`}
            type="button"
          >
            <Maximize2 aria-hidden="true" className="size-4" />
          </button>
          <button
            aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
            className="inline-flex size-8 items-center justify-center rounded-lg border border-border/70 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={onToggleTheme}
            title={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
            type="button"
          >
            {isDark ? (
              <Sun aria-hidden="true" className="size-4" />
            ) : (
              <Moon aria-hidden="true" className="size-4" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
