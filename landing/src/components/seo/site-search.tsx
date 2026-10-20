"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { buttonClass, cn } from "../ui";
import { trackEvent } from "@/lib/client-analytics";
import { useVisitorOs } from "@/lib/use-visitor-os";

/*
 * The header's search button and the ⌘K and / shortcuts. The palette itself (cmdk inside a dialog,
 * see search-palette.tsx) is on every page but opened on few visits, so it loads on first use
 * instead of with the page. Hovering or focusing the button starts that load a moment early.
 */

const loadPalette = () => import("./search-palette");

/** Stands in when the palette's code will not load: the full search page still works. */
function SearchPageInstead({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  useEffect(() => {
    if (!open) return;
    // Close first: the header outlives the navigation, and an open search keeps taking every key.
    onOpenChange(false);
    router.push("/search");
  }, [open, onOpenChange, router]);
  return null;
}

// Never rejects: a failed load would throw while rendering and take the header down with it.
const SearchPalette = dynamic(() => loadPalette().catch(() => ({ default: SearchPageInstead })), { ssr: false });

function preload() {
  loadPalette().catch(() => {});
}

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
  const button = useRef<HTMLButtonElement>(null);
  // Set once the palette's input has focus. Until then there is no input to type into, and keys go
  // to `early` instead, which the palette takes as its query when it opens.
  const ready = useRef(false);
  const early = useRef("");
  const openRef = useRef(false);

  const show = useCallback((next: boolean) => {
    if (next) {
      setWanted(true);
      // Until the palette's input exists, keys must not reach whatever had focus (Enter, paste).
      if (!ready.current) (document.activeElement as HTMLElement | null)?.blur?.();
    } else {
      early.current = "";
      // Closed before the palette took focus (Escape or ⌘K): Radix never had it, so hand it back here.
      if (!ready.current && openRef.current) button.current?.focus();
    }
    openRef.current = next;
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
      // Search is open but still loading: every key belongs to it. Shortcuts with a modifier pass
      // through (paste arrives as a paste event, below), except the ⌘K toggle handled after this.
      if (openRef.current && !ready.current && !mod && !event.altKey) {
        if (event.key === "Escape") show(false);
        else if (event.key === "Backspace") early.current = early.current.slice(0, -1);
        else if (event.key.length === 1) early.current += event.key;
        event.preventDefault();
        return;
      }
      if (mod && !event.shiftKey && !event.altKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        show(!openRef.current);
      } else if (event.key === "/" && !mod && !isTyping(event.target)) {
        event.preventDefault();
        openPalette("slash");
      }
    };
    const onPaste = (event: ClipboardEvent) => {
      if (!openRef.current || ready.current) return;
      event.preventDefault();
      early.current += event.clipboardData?.getData("text").replace(/\s+/g, " ") ?? "";
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("paste", onPaste);
    };
  }, [openPalette, show]);

  // The palette's input has focus: from here on keys go to it, and it starts from what was typed.
  const takeEarly = useCallback(() => {
    ready.current = true;
    const typed = early.current;
    early.current = "";
    return typed;
  }, []);

  return (
    <>
      <button
        ref={button}
        type="button"
        onClick={() => openPalette("button")}
        onPointerEnter={preload}
        onFocus={preload}
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
      {wanted ? <SearchPalette open={open} onOpenChange={show} trigger={button} onReady={takeEarly} /> : null}
    </>
  );
}
