"use client";

import { createContext, use } from "react";

/** Where product overlays mount; null falls back to document.body. */
export const PortalContainer = createContext<HTMLElement | null>(null);

export function usePortalContainer(): HTMLElement | null {
  return use(PortalContainer);
}

/** Outside a demo, always; inside one, only while focus is already in that demo. */
export function mayAutoFocus(el: HTMLElement): boolean {
  const demo = el.closest(".helicon-app");
  if (!demo) return true;
  // An open dialog keeps focus, as the app's modal dialogs do.
  return demo.contains(document.activeElement) && !demo.querySelector('[role="dialog"]');
}
