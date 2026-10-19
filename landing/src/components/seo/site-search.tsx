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

// Set once the palette's chunk is in. Until then there is no input to type into, see `early` below.
let paletteLoaded = false;
const loadPalette = () =>
  import("./search-palette").then((mod) => {
    paletteLoaded = true;
    return mod;
  });
const SearchPalette = dynamic(loadPalette, { ssr: false });

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
  // What was typed after opening but before the palette loaded, handed to it as its first query.
  const [early, setEarly] = useState("");
  const openRef = useRef(false);
  const router = useRouter();

  const show = useCallback((next: boolean) => {
    if (next) {
      setWanted(true);
      // Until the palette's input exists, keys must not reach whatever had focus (Enter, paste).
      if (!paletteLoaded) (document.activeElement as HTMLElement | null)?.blur?.();
      // If the palette's code will not load, the full search page still works.
      loadPalette().catch(() => router.push("/search"));
    } else {
      setEarly("");
      // Closed before the palette mounted (Escape or ⌘K): Radix never had focus, so hand it back here.
      if (!paletteLoaded && openRef.current) button.current?.focus();
    }
    openRef.current = next;
    setOpen(next);
  }, [router]);

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
      if (openRef.current && !paletteLoaded && !mod && !event.altKey) {
        if (event.key === "Escape") show(false);
        else if (event.key === "Backspace") setEarly((text) => text.slice(0, -1));
        else if (event.key.length === 1) setEarly((text) => text + event.key);
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
      if (!openRef.current || paletteLoaded) return;
      event.preventDefault();
      const text = event.clipboardData?.getData("text").replace(/\s+/g, " ") ?? "";
      setEarly((typed) => typed + text);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("paste", onPaste);
    };
  }, [openPalette, show]);

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
      {wanted ? <SearchPalette open={open} onOpenChange={show} trigger={button} initialQuery={early} /> : null}
    </>
  );
}
