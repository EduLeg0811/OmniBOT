import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

const MIN_WIDTH = 200;
const MAX_WIDTH = 600;

export function ResizableSidebar({ children }: { children: ReactNode }) {
  const [width, setWidth] = useState(300);
  const draggingRef = useRef(false);

  const onPointerDown = useCallback(() => {
    draggingRef.current = true;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  }, []);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (!draggingRef.current) return;
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, event.clientX)));
    };
    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, []);

  return (
    <aside
      className="relative hidden shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex lg:flex-col"
      style={{ width }}
    >
      {children}
      <div
        aria-label="Ajustar largura do painel"
        aria-orientation="vertical"
        className="absolute inset-y-0 -right-1 w-2 cursor-col-resize hover:bg-primary/40"
        onPointerDown={onPointerDown}
        role="separator"
      />
    </aside>
  );
}
