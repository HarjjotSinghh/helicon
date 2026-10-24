"use client";

import { useEffect, useState } from "react";
import { detectMacArch, type MacArch } from "./mac-arch";

/**
 * The Mac's chip as the browser reports it, or null when it cannot (Safari, Firefox, still loading).
 * Null always means "show the universal DMG"; it never means Intel.
 */
export function useMacArch(): MacArch | null {
  const [arch, setArch] = useState<MacArch | null>(null);
  useEffect(() => {
    let live = true;
    void detectMacArch(navigator as Parameters<typeof detectMacArch>[0]).then((found) => {
      if (live) setArch(found);
    });
    return () => {
      live = false;
    };
  }, []);
  return arch;
}
