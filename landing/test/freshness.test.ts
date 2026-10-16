import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { ALL_PAGES, SECTIONS, pagesInSection } from "@/lib/seo/catalog";
import { HOME_UPDATED, formatDate, newestDate, sectionUpdated } from "@/lib/seo/freshness";
import { sectionGraph } from "@/lib/seo/schema";

type Json = Record<string, any>;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** The files whose words make up the home page. Wiring changes to src/app/page.tsx do not count. */
const HOME_CONTENT = [
  "src/components/hero.tsx",
  "src/components/features.tsx",
  "src/components/app-tour.tsx",
  "src/components/architecture.tsx",
  "src/components/compare.tsx",
  "src/components/faq.tsx",
  "src/components/install.tsx",
  "src/lib/copy.ts",
];

function git(args: string[]): string | null {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

describe("last updated dates", () => {
  it("every content page carries a real ISO day", () => {
    for (const page of ALL_PAGES) expect(page.updated, page.slug).toMatch(ISO_DAY);
  });

  it("a hub is as new as its newest page", () => {
    for (const section of SECTIONS) {
      const pages = pagesInSection(section.id);
      const updated = sectionUpdated(pages);
      expect(updated, section.slug).toBe(newestDate(pages.map((page) => page.updated)));
      const page = (sectionGraph(section, pages, "0.22.1")["@graph"] as Json[]).find(
        (node) => node["@type"] === "CollectionPage",
      );
      expect(page?.dateModified, section.slug).toBe(updated);
    }
  });

  it("formats dates and timestamps the same way in every time zone", () => {
    expect(formatDate("2026-10-16")).toBe("16 October 2026");
    expect(formatDate("2026-10-16T23:30:00Z")).toBe("16 October 2026");
  });

  // Skipped in shallow CI checkouts, where git cannot see when the copy last changed.
  const shallow = git(["rev-parse", "--is-shallow-repository"]);
  it.skipIf(shallow !== "false")("the home date is not older than the last change to the home copy", () => {
    const changed = git(["log", "-1", "--format=%cs", "--", ...HOME_CONTENT]);
    expect(changed).toMatch(ISO_DAY);
    expect(HOME_UPDATED >= changed!).toBe(true);
  });
});
