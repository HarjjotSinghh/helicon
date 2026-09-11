import { PanelLeftOpen } from "lucide-react";
import type { ReactNode } from "react";
import { useApp, useController } from "../app/context.js";
import { CaptionSpacer } from "../app/frame.js";
import { Tip } from "./ui/overlays.js";
import { IconButton, MOD, cn } from "./ui/primitives.js";

export function SidebarToggle() {
  const controller = useController();
  const collapsed = useApp((s) => s.prefs.sidebarCollapsed);
  if (!collapsed) {
    return null;
  }
  return (
    <Tip label="Show sidebar" shortcut={[MOD, "B"]}>
      <IconButton label="Show sidebar" onClick={() => controller.toggleSidebar()}>
        <PanelLeftOpen size={16} />
      </IconButton>
    </Tip>
  );
}

/** The 48px bar every main view starts with, so switching views never shifts content. */
export function TopBar(props: { children?: ReactNode; className?: string }) {
  return (
    <header data-drag-region className={cn("flex h-12 shrink-0 items-center gap-2 px-3", props.className)}>
      <SidebarToggle />
      {props.children}
      <CaptionSpacer />
    </header>
  );
}
