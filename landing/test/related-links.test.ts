import { describe, expect, it } from "vitest";
import { pagesInSection, relatedPages } from "@/lib/seo/catalog";

/**
 * Sibling links for the sections that used to leave pages with one inlink. Each page links out to
 * six pages, never itself, and every compare or use-case page is reached from more than its hub.
 */

const FILLED = ["compare", "use-cases", "glossary"] as const;

describe("related rows", () => {
  for (const section of FILLED) {
    it(`fills to six links, never itself, in ${section}`, () => {
      for (const page of pagesInSection(section)) {
        const slugs = relatedPages(page).map((p) => p.slug);
        expect(slugs).toHaveLength(6);
        expect(slugs).not.toContain(page.slug);
        expect(new Set(slugs).size).toBe(slugs.length);
      }
    });
  }

  for (const section of ["compare", "use-cases"] as const) {
    it(`links every ${section} page from at least two other pages`, () => {
      const pages = pagesInSection(section);
      for (const target of pages) {
        const sources = pages.filter((page) => page.slug !== target.slug && relatedPages(page).some((p) => p.slug === target.slug));
        expect(sources.length, target.slug).toBeGreaterThanOrEqual(2);
      }
    });
  }
});
