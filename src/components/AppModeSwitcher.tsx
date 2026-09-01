import { Bot, LibraryBig } from "lucide-react";
import { NavLink } from "react-router-dom";

import { cn } from "@/lib/utils";

export function AppModeSwitcher({ compact = false }: { compact?: boolean }) {
  return (
    <nav
      aria-label="Alternar produto"
      className="flex items-center rounded-xl border border-border/75 bg-secondary/50 p-1 shadow-sm"
    >
      {(
        [
          ["/", "ConsBOT", Bot],
          ["/search", "ConsTECA", LibraryBig],
        ] as const
      ).map(([to, label, Icon]) => (
        <NavLink
          aria-label={label}
          className={({ isActive }) =>
            cn(
              "inline-flex h-7 items-center justify-center gap-1.5 rounded-lg px-2.5 text-[10px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/75 hover:text-foreground",
            )
          }
          end={to === "/"}
          key={to}
          title={label}
          to={to}
        >
          <Icon className="size-3.5" aria-hidden="true" />
          <span className={compact ? "hidden sm:inline" : undefined}>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
