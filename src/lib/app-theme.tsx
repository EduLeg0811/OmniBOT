import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type AppTheme = "light" | "dark";
type AppThemeContextValue = { theme: AppTheme; isDark: boolean; toggleTheme: () => void };

const STORAGE_KEY = "consbot:theme";
const AppThemeContext = createContext<AppThemeContextValue | null>(null);

function initialTheme(): AppTheme {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // The system preference remains the fallback when storage is unavailable.
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<AppTheme>(initialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Theme remains active for the current page even without storage.
    }
  }, [theme]);

  const value = useMemo<AppThemeContextValue>(
    () => ({
      theme,
      isDark: theme === "dark",
      toggleTheme: () => setTheme((current) => (current === "dark" ? "light" : "dark")),
    }),
    [theme],
  );
  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppTheme() {
  const context = useContext(AppThemeContext);
  if (!context) throw new Error("useAppTheme must be used within AppThemeProvider");
  return context;
}
