"use client";

import { CaretDown, Check, Translate } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState } from "react";
import { trackEvent } from "@/lib/client-analytics";
import { LOCALE_INFO, localePath, translatedLocales, type SiteLocale } from "@/lib/i18n";
import { HINT_DISMISSED_KEY } from "./language-hint";
import { buttonClass, cn } from "./ui";

/**
 * Links to every language `path` is published in. Plain links with hreflang, so crawlers see the
 * same set the metadata declares. Picking a language also silences the browser-language hint,
 * since the visitor has now chosen for themselves.
 */
export function LanguageSwitcher({
  current,
  path,
  label,
  className,
  align = "right",
}: {
  current: SiteLocale;
  /** The English path of the page, like "/". */
  path: string;
  /** Accessible name, in the page's language. */
  label: string;
  className?: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const locales: SiteLocale[] = ["en", ...translatedLocales(path)];

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  if (locales.length < 2) return null;

  return (
    <div ref={root} className={cn("relative", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`${LOCALE_INFO[current].name} (${label})`}
        title={label}
        onClick={() => setOpen((value) => !value)}
        className={buttonClass("ghost", "sm", "gap-1.5 px-2.5 font-normal")}
      >
        <Translate aria-hidden="true" className="text-subtle" />
        <span className="text-[13.5px] max-sm:hidden lg:max-xl:hidden">{LOCALE_INFO[current].name}</span>
        <CaretDown aria-hidden="true" className={cn("!size-3 text-subtle transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <ul
          id={menuId}
          aria-label={label}
          className={cn(
            "absolute z-[220] mt-1.5 min-w-48 rounded-xl bg-surface p-1 shadow-soft ring-1 ring-line",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {locales.map((locale) => {
            const info = LOCALE_INFO[locale];
            const active = locale === current;
            return (
              <li key={locale}>
                <a
                  href={localePath(locale, path)}
                  hrefLang={info.hreflang}
                  lang={info.hreflang}
                  aria-current={active ? "page" : undefined}
                  onClick={() => {
                    try {
                      localStorage.setItem(HINT_DISMISSED_KEY, "1");
                    } catch {}
                    if (!active) trackEvent("language_switch", { from: current, to: locale, path });
                  }}
                  className="flex min-h-10 items-center justify-between gap-4 rounded-lg px-3 text-[14px] text-fg transition-colors hover:bg-sunken"
                >
                  {info.name}
                  {active ? <Check aria-hidden="true" weight="bold" className="size-3.5 text-accent-text" /> : null}
                </a>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
