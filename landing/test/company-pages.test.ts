import { describe, expect, it } from "vitest";
import { ALL_PAGES, pageBySlug, relatedPages } from "@/lib/seo/catalog";
import { blocksToMarkdown } from "@/lib/seo/markdown";
import { llmsTxt, agentsMd } from "@/lib/ai-docs";
import { CONTACT } from "@/lib/site";

/**
 * The trust anchors. An agent checks that /about and /contact exist and say something real before
 * it recommends a product, so "the page exists" is not enough: it has to have substance, and it
 * has to be reachable from the indexes.
 */

const TRUST_PAGES = ["about", "contact", "developers"];

describe("about, contact and developers", () => {
  it.each(TRUST_PAGES)("%s exists with well over 500 characters of prose", (slug) => {
    const page = pageBySlug(slug);
    expect(page).toBeTruthy();
    const body = blocksToMarkdown(page!.blocks);
    expect(body.length).toBeGreaterThan(500);
    expect(page!.answer.length).toBeGreaterThan(120);
    expect(page!.description.length).toBeGreaterThan(100);
  });

  it.each(TRUST_PAGES)("%s only names related pages that exist", (slug) => {
    const page = pageBySlug(slug)!;
    for (const related of page.related ?? []) {
      expect(pageBySlug(related), `${slug} -> ${related}`).toBeTruthy();
    }
    expect(relatedPages(page).length).toBeGreaterThan(0);
  });

  it("puts the real contact details on the contact page", () => {
    const body = blocksToMarkdown(pageBySlug("contact")!.blocks);
    expect(body).toContain(CONTACT.email);
    expect(body).toContain(CONTACT.address.locality);
    expect(body).toContain(CONTACT.security);
  });

  it("documents the API on the developers page", () => {
    const body = blocksToMarkdown(pageBySlug("developers")!.blocks);
    expect(body).toContain("https://helicon.sh/api/v1");
    expect(body).toContain("/openapi.json");
    expect(body).toContain("curl");
    expect(body).toContain("invalid_parameter");
  });

  it("has no duplicate slugs anywhere in the catalog", () => {
    const slugs = ALL_PAGES.map((page) => page.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("the indexes point at all of it", () => {
  it("names the API and the company pages in llms.txt", () => {
    const body = llmsTxt("0.14.2");
    for (const path of ["/developers", "/openapi.json", "/api/v1", "/about", "/contact"]) {
      expect(body, path).toContain(`https://helicon.sh${path}`);
    }
  });

  it("tells agents in agents.md that the home page negotiates Markdown", () => {
    const body = agentsMd(null);
    expect(body).toContain("https://helicon.sh/openapi.json");
    expect(body).toContain("Accept: text/markdown");
  });
});
