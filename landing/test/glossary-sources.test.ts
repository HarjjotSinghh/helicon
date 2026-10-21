import { describe, expect, it } from "vitest";
import { GLOSSARY_PAGES } from "@/lib/seo/content/glossary";

/**
 * Every glossary term that has an official document cites it, over https. Two terms have no
 * official source (an ADE and a TUI are generic terms), so they must carry none rather than a
 * stand-in link.
 */

const NO_SOURCE = ["glossary/ade", "glossary/tui"];

describe("glossary sources", () => {
  it("covers all 13 terms, 11 with a source", () => {
    expect(GLOSSARY_PAGES).toHaveLength(13);
    expect(GLOSSARY_PAGES.filter((page) => page.source)).toHaveLength(11);
  });

  for (const page of GLOSSARY_PAGES) {
    if (NO_SOURCE.includes(page.slug)) {
      it(`${page.slug} has no source`, () => {
        expect(page.source).toBeUndefined();
      });
      continue;
    }

    it(`${page.slug} cites an https source with a title`, () => {
      expect(page.source, page.slug).toBeDefined();
      expect(page.source!.title.trim().length, page.slug).toBeGreaterThan(0);
      const url = new URL(page.source!.url);
      expect(url.protocol, page.slug).toBe("https:");
      expect(page.source!.url, page.slug).not.toMatch(/\s/);
    });
  }
});
