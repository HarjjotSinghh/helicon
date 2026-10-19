"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { buttonClass, cn } from "../ui";
import { trackEvent } from "@/lib/client-analytics";
import { useVisitorOs } from "@/lib/use-visitor-os";

/*
 * The header's search button and the ⌘K and / shortcuts. The palette itself (cmdk inside a dialog,
 * see search-palette.tsx) is on every page but opened on few visits, so it loads on first use
 * instead of with the page. Hovering or focusing the button starts that load a moment early.
 */

const loadPalette = () => import("./search-palette");
const SearchPalette = dynamic(loadPalette, { ssr: false });

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
}

export function SiteSearch({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  // Mounted on first open and kept, so closing still plays the dialog's exit animation.
  const [wanted, setWanted] = useState(false);
  const os = useVisitorOs();

  const show = useCallback((next: boolean) => {
    if (next) setWanted(true);
    setOpen(next);
  }, []);

  const openPalette = useCallback(
    (source: string) => {
      show(true);
      trackEvent("site_search_open", { source });
    },
    [show],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // The live product demos on the home page are their own little app; leave their keys alone.
      if ((event.target as HTMLElement | null)?.closest?.(".helicon-app")) return;
      const mod = event.metaKey || event.ctrlKey;
      if (mod && !event.shiftKey && !event.altKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setWanted(true);
        setOpen((value) => !value);
      } else if (event.key === "/" && !mod && !isTyping(event.target)) {
        event.preventDefault();
        openPalette("slash");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openPalette]);

  return (
    <>
      <button
        type="button"
        onClick={() => openPalette("button")}
        onPointerEnter={() => void loadPalette()}
        onFocus={() => void loadPalette()}
        aria-label="Search the site"
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(buttonClass("ghost", "sm", "gap-2 px-2.5 text-muted max-xl:size-9 max-xl:px-0"), className)}
      >
        <MagnifyingGlass weight="bold" aria-hidden="true" />
        <span className="max-xl:sr-only">Search</span>
        {os ? (
          <kbd className="ml-1 hidden rounded-md bg-sunken px-1.5 py-0.5 font-mono text-[11px] text-subtle shadow-[inset_0_0_0_1px_var(--border)] xl:inline">
            {os === "macos" ? "⌘K" : "Ctrl K"}
          </kbd>
        ) : null}
      </button>
      {wanted ? <SearchPalette open={open} onOpenChange={show} /> : null}
    </>
  );
}
