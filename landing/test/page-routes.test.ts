import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ALL_PAGES } from "@/lib/seo/catalog";

/**
 * Section pages are served by dynamic routes, but top level pages each need their own
 * app/<slug>/page.tsx. Without one the page is in the sitemap and the Markdown mirror while its
 * HTML URL returns 404.
 */

const TOP_LEVEL = ALL_PAGES.filter((page) => page.section === "page").map((page) => page.slug);

describe("top level pages", () => {
  it.each(TOP_LEVEL)("%s has a route file", (slug) => {
    expect(existsSync(join(__dirname, "..", "src", "app", slug, "page.tsx"))).toBe(true);
  });
});
