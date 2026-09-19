import { describe, expect, it } from "vitest";
import { homeMarkdown } from "@/lib/ai-docs";
import { notFoundMarkdown, pageToMarkdown } from "@/lib/seo/markdown";
import { pageBySlug } from "@/lib/seo/catalog";

/** What a caller that asked for Markdown actually receives, on the home page and on a dead path. */

describe("homeMarkdown", () => {
  const body = homeMarkdown("0.14.2");

  it("opens with front matter naming the canonical URL", () => {
    expect(body.startsWith("---\n")).toBe(true);
    expect(body).toContain("url: https://helicon.sh/");
    expect(body).toContain("license: MIT");
  });

  it("is a page rather than a stub", () => {
    expect(body.length).toBeGreaterThan(2000);
    expect(body).toContain("# Helicon");
    expect(body).toContain("## Install");
    expect(body).toContain("## Frequently asked questions");
  });

  it("carries the version it was given, and copes without one", () => {
    expect(body).toContain("v0.14.2");
    expect(homeMarkdown(null)).toContain("see the latest GitHub release");
  });

  it("links the machine-readable surfaces and the disclaimer", () => {
    expect(body).toContain("https://helicon.sh/openapi.json");
    expect(body).toContain("https://helicon.sh/llms.txt");
    expect(body).toContain("not made, sponsored or endorsed by Meta");
  });
});

describe("notFoundMarkdown", () => {
  const body = notFoundMarkdown("/__ora-404-probe-955hms9d");

  it("explains the error in well over twenty characters", () => {
    const explanation = body.split("# 404: page not found")[1] ?? "";
    expect(explanation.trim().length).toBeGreaterThan(20);
    expect(body).toContain("There is no page at https://helicon.sh/__ora-404-probe-955hms9d");
  });

  it("links somewhere useful rather than dead-ending", () => {
    expect(body).toContain("https://helicon.sh/llms.txt");
    expect(body).toContain("https://helicon.sh/sitemap.xml");
    expect(body).toContain("https://helicon.sh/developers");
  });

  it("says its own status, so the body is readable without the headers", () => {
    expect(body).toContain("status: 404");
  });

  it("normalises a path given without a leading slash", () => {
    expect(notFoundMarkdown("nope")).toContain("https://helicon.sh/nope");
  });
});

describe("pageToMarkdown", () => {
  it("mirrors the new company pages", () => {
    for (const slug of ["about", "contact", "developers"]) {
      const page = pageBySlug(slug);
      expect(page, slug).toBeTruthy();
      const body = pageToMarkdown(page!);
      expect(body).toContain(`url: https://helicon.sh/${slug}`);
      expect(body.length).toBeGreaterThan(1000);
    }
  });
});
