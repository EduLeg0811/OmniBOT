import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useLayoutEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AppThemeProvider } from "@/lib/app-theme";
import { HomePage } from "@/pages/HomePage";

const ConsTecaPage = lazy(() =>
  import("@/features/consteca/ConsTecaPage").then((module) => ({ default: module.ConsTecaPage })),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

function AppRoutes() {
  const location = useLocation();
  useLayoutEffect(() => {
    document.documentElement.dataset.productMode = location.pathname.startsWith("/search")
      ? "search"
      : "chat";
  }, [location.pathname]);

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route
        path="/search"
        element={
          <Suspense fallback={<div className="min-h-dvh bg-background" />}>
            <ConsTecaPage />
          </Suspense>
        }
      />
      <Route path="/c/:threadId" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppThemeProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AppThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
