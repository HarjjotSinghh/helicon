"use client";

import { ArrowCounterClockwise, TextAa, X } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

/*
 * Development-only type preview. It swaps --font-heading and --font-body on <html>, loading each
 * face from Google Fonts on demand. The production build never renders it (see layout.tsx).
 */

type Face = { name: string; axes: string };

// Faces with an empty axes string ship with the page through next/font.
const FACES: Face[] = [
  { name: "Instrument Sans", axes: "" },
  { name: "Manrope", axes: "" },
  { name: "Mona Sans", axes: "wdth,wght@75..125,200..900" },
  { name: "Hubot Sans", axes: "wght@200..900" },
  { name: "Geist", axes: "wght@100..900" },
  { name: "Inter Tight", axes: "wght@100..900" },
  { name: "Plus Jakarta Sans", axes: "wght@200..800" },
  { name: "DM Sans", axes: "wght@100..1000" },
  { name: "Space Grotesk", axes: "wght@300..700" },
  { name: "Schibsted Grotesk", axes: "wght@400..900" },
  { name: "Bricolage Grotesque", axes: "wght@200..800" },
  { name: "Onest", axes: "wght@100..900" },
  { name: "Figtree", axes: "wght@300..900" },
  { name: "Outfit", axes: "wght@100..900" },
  { name: "Sora", axes: "wght@100..800" },
  { name: "Hanken Grotesk", axes: "wght@100..900" },
  { name: "Albert Sans", axes: "wght@100..900" },
  { name: "Urbanist", axes: "wght@100..900" },
  { name: "IBM Plex Sans", axes: "wght@100..700" },
  { name: "Public Sans", axes: "wght@100..900" },
];

const DEFAULTS = { heading: "Instrument Sans", body: "Manrope" };
const LOCAL: Record<string, string> = {
  "Instrument Sans": "var(--font-instrument)",
  Manrope: "var(--font-manrope)",
};
const KEY = "helicon-dev-fonts-v2";

function load(face: string) {
  const entry = FACES.find((f) => f.name === face);
  if (!entry?.axes) return;
  const id = `dev-font-${face.replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${face.replace(/\s+/g, "+")}:${entry.axes}&display=swap`;
  document.head.appendChild(link);
}

function apply(role: "heading" | "body", face: string) {
  load(face);
  const value = LOCAL[face] ?? `"${face}"`;
  document.documentElement.style.setProperty(`--font-${role}`, value);
}

function readSaved(): { heading: string; body: string } {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as { heading?: string; body?: string } | null;
    return { heading: saved?.heading ?? DEFAULTS.heading, body: saved?.body ?? DEFAULTS.body };
  } catch {
    return { ...DEFAULTS };
  }
}

export function FontPicker() {
  const [open, setOpen] = useState(false);
  const [fonts, setFonts] = useState<{ heading: string; body: string }>({ ...DEFAULTS });

  // Restores the last choice after hydration; this panel only exists in development.
  useEffect(() => {
    const saved = readSaved();
    apply("heading", saved.heading);
    apply("body", saved.body);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFonts(saved);
  }, []);

  function choose(role: "heading" | "body", face: string) {
    apply(role, face);
    const next = { ...fonts, [role]: face };
    setFonts(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
  }

  function reset() {
    apply("heading", DEFAULTS.heading);
    apply("body", DEFAULTS.body);
    setFonts({ ...DEFAULTS });
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* storage unavailable */
    }
  }

  const select =
    "h-9 w-full rounded-lg bg-bg px-2.5 text-[13.5px] text-fg shadow-[0_0_0_1px_var(--border-strong)] outline-none focus-visible:shadow-[0_0_0_2px_var(--accent)]";

  return (
    <div className="fixed right-4 bottom-4 z-50 font-[system-ui,sans-serif]">
      {open ? (
        <div
          role="dialog"
          aria-label="Font picker (development only)"
          className="w-72 rounded-2xl bg-raised p-4 text-fg shadow-[0_0_0_1px_var(--border-strong),0_16px_40px_-12px_rgb(0_0_0/0.35)]"
        >
          <div className="flex items-center gap-2">
            <TextAa aria-hidden="true" weight="bold" className="size-4 text-accent-text" />
            <p className="text-[13px] font-semibold">Font picker</p>
            <span className="rounded-md bg-warn-bg px-1.5 py-0.5 text-[10.5px] font-medium text-warn">dev only</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close font picker"
              className="ml-auto inline-flex size-7 items-center justify-center rounded-md text-subtle hover:bg-sunken hover:text-fg"
            >
              <X aria-hidden="true" weight="bold" className="size-3.5" />
            </button>
          </div>

          <label className="mt-4 block text-[12px] font-medium text-muted" htmlFor="dev-font-heading">
            Heading font
          </label>
          <select
            id="dev-font-heading"
            value={fonts.heading}
            onChange={(e) => choose("heading", e.target.value)}
            className={`${select} mt-1.5`}
          >
            {FACES.map((f) => (
              <option key={f.name}>{f.name}</option>
            ))}
          </select>

          <label className="mt-3 block text-[12px] font-medium text-muted" htmlFor="dev-font-body">
            Base font
          </label>
          <select
            id="dev-font-body"
            value={fonts.body}
            onChange={(e) => choose("body", e.target.value)}
            className={`${select} mt-1.5`}
          >
            {FACES.map((f) => (
              <option key={f.name}>{f.name}</option>
            ))}
          </select>

          <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
            <p className="text-[11.5px] text-subtle">App demos keep Inter.</p>
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium text-muted hover:bg-sunken hover:text-fg"
            >
              <ArrowCounterClockwise aria-hidden="true" weight="bold" className="size-3.5" />
              Reset
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-raised pr-3.5 pl-3 text-[13px] font-medium text-fg shadow-[0_0_0_1px_var(--border-strong),0_8px_24px_-8px_rgb(0_0_0/0.3)] hover:bg-sunken"
        >
          <TextAa aria-hidden="true" weight="bold" className="size-4 text-accent-text" />
          Fonts
          <span className="max-w-32 truncate text-subtle">
            {fonts.heading === fonts.body ? fonts.heading : `${fonts.heading} / ${fonts.body}`}
          </span>
        </button>
      )}
    </div>
  );
}
