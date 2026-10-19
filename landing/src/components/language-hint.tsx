"use client";

import { Translate, X } from "@phosphor-icons/react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { trackEvent } from "@/lib/client-analytics";
import { LOCALE_INFO, localePath, preferredLocale, translatedLocales, type Locale } from "@/lib/i18n";
import type { HomeCopy } from "@/lib/i18n-copy";
import { bandX, buttonClass } from "./ui";

export const HINT_DISMISSED_KEY = "helicon.language-hint.dismissed";

/**
 * Offers the translated page to a visitor whose browser asks for that language. It only ever
 * offers: nothing redirects, the English page stays cacheable, and one dismissal (or any pick in
 * the language switcher) silences it for good. navigator.languages is the same list the browser
 * sends as Accept-Language, read on the client so the server response never varies on it.
 */
const subscribeNever = () => () => {};

function offeredLocale(path: string): Locale | null {
  try {
    if (localStorage.getItem(HINT_DISMISSED_KEY)) return null;
  } catch {}
  const wanted = preferredLocale(navigator.languages?.length ? navigator.languages : [navigator.language]);
  return wanted && translatedLocales(path).includes(wanted) ? wanted : null;
}

export function LanguageHint({
  path,
  hints,
}: {
  path: string;
  /** Only the hint strings, so the English page does not ship the whole translated copy. */
  hints: Record<Locale, HomeCopy["hint"]>;
}) {
  // Read once on the client; the server always renders nothing, so the page stays cacheable.
  const offered = useSyncExternalStore(subscribeNever, () => offeredLocale(path), () => null);
  const [dismissed, setDismissed] = useState(false);
  const locale = dismissed ? null : offered;

  useEffect(() => {
    if (offered) trackEvent("language_hint_shown", { locale: offered, path });
  }, [offered, path]);

  if (!locale) return null;
  const hint = hints[locale];
  const info = LOCALE_INFO[locale];

  function dismiss(action: "accept" | "dismiss") {
    try {
      localStorage.setItem(HINT_DISMISSED_KEY, "1");
    } catch {}
    trackEvent("language_hint", { locale, action, path });
    if (action === "dismiss") setDismissed(true);
  }

  return (
    <div lang={info.hreflang} className={`${bandX} flex items-center gap-3 border-b border-line bg-tint/60 py-2.5 text-[14px] text-fg`}>
      <Translate aria-hidden="true" className="size-4 shrink-0 text-accent-text" />
      <p className="min-w-0 flex-1">
        {hint.text}{" "}
        <a
          href={localePath(locale, path)}
          hrefLang={info.hreflang}
          onClick={() => dismiss("accept")}
          className="font-medium text-accent-text underline underline-offset-4"
        >
          {hint.action}
        </a>
      </p>
      <button
        type="button"
        aria-label={hint.dismiss}
        title={hint.dismiss}
        onClick={() => dismiss("dismiss")}
        className={buttonClass("ghost", "icon", "size-8 shrink-0")}
      >
        <X aria-hidden="true" weight="bold" />
      </button>
    </div>
  );
}
