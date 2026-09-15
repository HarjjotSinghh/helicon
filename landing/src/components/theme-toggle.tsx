"use client";

import { Desktop, Moon, Sun, type Icon } from "@phosphor-icons/react";
import { useRef, useSyncExternalStore, type KeyboardEvent } from "react";
import { readThemePref, setThemePref, subscribeThemePref, type ThemePref } from "@/lib/theme";
import { cn } from "./ui";

const OPTIONS: { value: ThemePref; label: string; icon: Icon }[] = [
  { value: "system", label: "System theme", icon: Desktop },
  { value: "light", label: "Light theme", icon: Sun },
  { value: "dark", label: "Dark theme", icon: Moon },
];

/** System, light or dark. The choice is saved; system is the default. */
export function ThemeToggle({ className }: { className?: string } = {}) {
  // The server cannot know the saved choice, so it renders "system" and the client corrects it.
  const pref = useSyncExternalStore(subscribeThemePref, readThemePref, () => "system" as ThemePref);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    const dir = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!dir) return;
    event.preventDefault();
    const next = (OPTIONS.findIndex((o) => o.value === pref) + dir + OPTIONS.length) % OPTIONS.length;
    setThemePref(OPTIONS[next].value);
    buttons.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      onKeyDown={onKey}
      className={cn(
        "flex items-center gap-0.5 rounded-[10px] bg-sunken p-0.5 shadow-[inset_0_0_0_1px_var(--border)]",
        className,
      )}
    >
      {OPTIONS.map(({ value, label, icon: Glyph }, i) => {
        const checked = pref === value;
        return (
          <button
            key={value}
            ref={(el) => {
              buttons.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={label}
            title={label}
            tabIndex={checked ? 0 : -1}
            onClick={() => setThemePref(value)}
            suppressHydrationWarning
            className={cn(
              "inline-flex size-9 items-center justify-center rounded-lg transition-[background-color,color,box-shadow] duration-150 sm:size-7",
              checked ? "bg-surface text-fg shadow-soft" : "text-subtle hover:text-fg",
            )}
          >
            <Glyph weight={checked ? "fill" : "regular"} className="size-4" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
