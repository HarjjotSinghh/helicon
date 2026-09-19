import { FAQS } from "../site";
import { ALL_PAGES, sectionById } from "./catalog";
import type { Faq } from "./types";

/**
 * Every question the site answers, in one place. The home page FAQ comes first because those are
 * the questions people ask before installing anything; the rest are collected from the generated
 * pages, deduplicated by question text, and grouped by the section they came from.
 */

export type FaqGroup = { title: string; slug: string | null; faqs: Faq[] };

const SECTION_ORDER = ["page", "install", "compare", "features", "guides", "use-cases", "glossary"] as const;

export function faqGroups(): FaqGroup[] {
  const seen = new Set<string>();
  const groups: FaqGroup[] = [];

  const general: Faq[] = [];
  for (const [q, a] of FAQS) {
    const key = q.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    general.push({ q, a });
  }
  groups.push({ title: "Before you install", slug: null, faqs: general });

  for (const id of SECTION_ORDER) {
    const faqs: Faq[] = [];
    for (const page of ALL_PAGES) {
      if (page.section !== id) continue;
      for (const faq of page.faqs ?? []) {
        const key = faq.q.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        faqs.push(faq);
      }
    }
    if (!faqs.length) continue;
    const section = sectionById(id);
    groups.push({
      title: section?.label ?? "About Helicon",
      slug: section?.slug ?? null,
      faqs,
    });
  }

  return groups;
}

export function allFaqs(): Faq[] {
  return faqGroups().flatMap((group) => group.faqs);
}

export const FAQ_PAGE_META = {
  slug: "faq",
  title: "Muse Code GUI FAQ: every question, answered",
  h1: "Frequently asked questions",
  description:
    "Every question about running Muse Code through a desktop or web GUI: licensing, credentials, Windows and WSL2, cost, approvals, remote daemons and what Helicon is not.",
  answer:
    "Helicon is a free, MIT licensed, unofficial desktop and web client for Meta's Muse Code CLI. It needs a muse CLI that is installed and signed in, stores no credentials, adds no billing, never bypasses an approval, and keeps every thread on your own machine.",
  keywords: [
    "muse code gui faq",
    "is helicon official",
    "does muse code have a desktop app",
    "muse code gui safe",
    "muse code client questions",
  ],
  updated: "2026-09-19",
};
