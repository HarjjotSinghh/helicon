import { describe, expect, it } from "vitest";
import { HOME_MARKDOWN_SLUG, markdownRewriteTarget, prefersMarkdown } from "@/lib/markdown-negotiation";

/**
 * acceptmarkdown.com in one place: which requests get Markdown, and which must not. The home page
 * is the case that matters most, because it is the only URL an agent is guaranteed to have.
 */

const MARKDOWN = "text/markdown";
const BROWSER = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";

describe("prefersMarkdown", () => {
  it("is true only when the caller asked for Markdown and not for HTML", () => {
    expect(prefersMarkdown(MARKDOWN)).toBe(true);
    expect(prefersMarkdown("text/markdown, text/plain;q=0.5")).toBe(true);
    expect(prefersMarkdown("TEXT/MARKDOWN")).toBe(true);
    expect(prefersMarkdown(BROWSER)).toBe(false);
    expect(prefersMarkdown("text/html, text/markdown")).toBe(false);
    expect(prefersMarkdown(null)).toBe(false);
    expect(prefersMarkdown("*/*")).toBe(false);
  });
});

describe("markdownRewriteTarget", () => {
  it("sends the home page to its own mirror", () => {
    expect(markdownRewriteTarget("/", MARKDOWN)).toBe(`/md/${HOME_MARKDOWN_SLUG}`);
    expect(markdownRewriteTarget("/index.md", null)).toBe(`/md/${HOME_MARKDOWN_SLUG}`);
  });

  it("leaves the home page as HTML for a browser", () => {
    expect(markdownRewriteTarget("/", BROWSER)).toBe(null);
    expect(markdownRewriteTarget("/", null)).toBe(null);
  });

  it("mirrors any page, nested or not, by header or by suffix", () => {
    expect(markdownRewriteTarget("/pricing", MARKDOWN)).toBe("/md/pricing");
    expect(markdownRewriteTarget("/pricing.md", null)).toBe("/md/pricing");
    expect(markdownRewriteTarget("/compare/cursor", MARKDOWN)).toBe("/md/compare/cursor");
    expect(markdownRewriteTarget("/compare/cursor.md", BROWSER)).toBe("/md/compare/cursor");
    expect(markdownRewriteTarget("/guides/", MARKDOWN)).toBe("/md/guides");
  });

  it("sends a path that does not exist to the mirror, which answers a Markdown 404", () => {
    expect(markdownRewriteTarget("/__ora-404-probe-955hms9d", MARKDOWN)).toBe("/md/__ora-404-probe-955hms9d");
  });

  it("never rewrites a document that already serves its own text", () => {
    for (const path of ["/llms.txt", "/llms-full.txt", "/agents.md"]) {
      expect(markdownRewriteTarget(path, MARKDOWN)).toBe(null);
    }
  });

  it("never rewrites the API, the OpenAPI document or a download", () => {
    for (const path of ["/api/v1", "/api/v1/status", "/api/openapi.yaml", "/openapi.json", "/download/macos"]) {
      expect(markdownRewriteTarget(path, MARKDOWN)).toBe(null);
    }
  });

  it("does not rewrite the mirror onto itself", () => {
    expect(markdownRewriteTarget("/md/pricing", MARKDOWN)).toBe(null);
  });
});
