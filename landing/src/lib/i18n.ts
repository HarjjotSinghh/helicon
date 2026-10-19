import { SITE_URL } from "./site";

/**
 * The site's languages. English lives at the root; every other language is a path prefix
 * (/ko, /ja, /pt-br) and exists only for pages that are actually translated, so no English copy
 * is ever served under a locale path.
 */
export const LOCALES = ["ko", "ja", "pt-br"] as const;
export type Locale = (typeof LOCALES)[number];
export type SiteLocale = "en" | Locale;

export const LOCALE_INFO: Record<SiteLocale, { hreflang: string; og: string; name: string; prefix: string }> = {
  en: { hreflang: "en", og: "en_US", name: "English", prefix: "" },
  ko: { hreflang: "ko", og: "ko_KR", name: "한국어", prefix: "/ko" },
  ja: { hreflang: "ja", og: "ja_JP", name: "日本語", prefix: "/ja" },
  "pt-br": { hreflang: "pt-BR", og: "pt_BR", name: "Português (Brasil)", prefix: "/pt-br" },
};

/**
 * English paths that have translations, with the date the translations last changed. A path is
 * added here only when its translated copy ships: the metadata, the sitemap and the language
 * switcher all read this one map, so the hreflang sets they emit always agree.
 */
const TRANSLATED: Record<string, { locales: readonly Locale[]; updated: string }> = {
  "/": { locales: LOCALES, updated: "2026-10-19" },
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** The locales `path` (an English path, like "/" or "/pricing") is translated into. */
export function translatedLocales(path: string): readonly Locale[] {
  return TRANSLATED[path]?.locales ?? [];
}

export function translationUpdated(path: string): string | null {
  return TRANSLATED[path]?.updated ?? null;
}

export function localePath(locale: SiteLocale, path: string): string {
  const prefix = LOCALE_INFO[locale].prefix;
  if (!prefix) return path;
  return path === "/" ? prefix : `${prefix}${path}`;
}

/** Absolute URL. The English home is the bare origin, matching its canonical byte for byte. */
export function localeUrl(locale: SiteLocale, path: string): string {
  const local = localePath(locale, path);
  return local === "/" ? SITE_URL : `${SITE_URL}${local}`;
}

/**
 * hreflang alternates for `path`: English, every translation, and x-default (English). Every
 * version of the page lists the same set, itself included, so the links are reciprocal.
 */
export function languageAlternates(path: string): Record<string, string> {
  const locales = translatedLocales(path);
  if (!locales.length) return {};
  const languages: Record<string, string> = { en: localeUrl("en", path) };
  for (const locale of locales) languages[LOCALE_INFO[locale].hreflang] = localeUrl(locale, path);
  languages["x-default"] = localeUrl("en", path);
  return languages;
}

/**
 * The translation a visitor's browser asks for, if there is one. This is a hint for a dismissible
 * banner only: nothing ever redirects on it. Reads the list in order and stops at English, so
 * someone who ranks English first is never offered anything.
 */
export function preferredLocale(languages: readonly string[]): Locale | null {
  for (const tag of languages) {
    const primary = tag.toLowerCase().split(/[-_]/)[0];
    if (primary === "en") return null;
    if (primary === "ko") return "ko";
    if (primary === "ja") return "ja";
    // The Portuguese copy is Brazilian, but it reads fine in Portugal too.
    if (primary === "pt") return "pt-br";
  }
  return null;
}
