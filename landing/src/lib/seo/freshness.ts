import type { SeoPage } from "./types";

/**
 * When the home page content last changed: the newest commit touching the home section
 * components or lib/copy.ts. Bump it with any edit to that copy. test/freshness.test.ts fails if
 * git history shows a newer content change than this date.
 */
export const HOME_UPDATED = "2026-10-17";

/** Newest of a set of ISO dates. Dates compare correctly as strings in YYYY-MM-DD form. */
export function newestDate(dates: string[]): string | undefined {
  return dates.filter(Boolean).sort().at(-1);
}

/** A hub lists its pages, so it changes when any of them does. */
export function sectionUpdated(pages: SeoPage[]): string | undefined {
  return newestDate(pages.map((page) => page.updated));
}

/** "16 October 2026" for an ISO date or timestamp, always in UTC so the server and client agree. */
export function formatDate(iso: string) {
  const date = iso.length === 10 ? new Date(`${iso}T00:00:00Z`) : new Date(iso);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** The metadata tags that carry the date for crawlers that read meta rather than JSON-LD. */
export function modifiedMeta(iso: string | undefined): Record<string, string> {
  return iso ? { "article:modified_time": iso } : {};
}
