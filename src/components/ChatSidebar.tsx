import { useState } from "react";
import { PanelLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ChatSidebarContent, type ChatSidebarProps } from "@/components/ChatSidebarContent";
import { ResizableSidebar } from "@/components/ResizableSidebar";

export function ChatSidebar(props: ChatSidebarProps) {
  return (
    <ResizableSidebar>
      <ChatSidebarContent {...props} />
    </ResizableSidebar>
  );
}

export function ChatSidebarSheet(
  props: ChatSidebarProps & {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  },
) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = props.open ?? internalOpen;
  const setOpen = props.onOpenChange ?? setInternalOpen;

  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Abrir conversas e configurações">
          <PanelLeft />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[88vw] max-w-sm p-0">
        <SheetTitle className="sr-only">Conversas e configurações</SheetTitle>
        <ChatSidebarContent
          {...props}
          onSelect={(id) => {
            props.onSelect(id);
            close();
          }}
          onNew={() => {
            props.onNew();
            close();
          }}
        />
      </SheetContent>
    </Sheet>
  );
}
