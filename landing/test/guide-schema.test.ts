import { describe, expect, it } from "vitest";
import { pagesInSection } from "@/lib/seo/catalog";
import { pageGraph } from "@/lib/seo/schema";

/** Every guide gets a TechArticle that points at the shared author and publisher nodes. */

type Json = Record<string, any>;

const guides = pagesInSection("guides");

describe("TechArticle on guides", () => {
  it("covers every guide in the catalog", () => {
    expect(guides.length).toBeGreaterThan(0);
  });

  for (const guide of guides) {
    it(`${guide.slug} carries a TechArticle with its own headline, dates and shared author`, () => {
      const trail = [
        { name: "Guides", slug: "guides" },
        { name: guide.label, slug: guide.slug },
      ];
      const graph = pageGraph(guide, null, trail) as Json;
      const nodes = graph["@graph"] as Json[];
      const article = nodes.find((node) => node["@type"] === "TechArticle") as Json;

      expect(article).toBeTruthy();
      expect(article.headline).toBe(guide.h1);
      expect(article.description).toBe(guide.answer);
      expect(article.url).toBe(`https://helicon.sh/${guide.slug}`);
      expect(article.mainEntityOfPage).toEqual({ "@id": `https://helicon.sh/${guide.slug}#page` });
      expect(article.datePublished).toBe(guide.updated);
      expect(article.dateModified).toBe(guide.updated);
      expect(article.author).toEqual({ "@id": "https://helicon.sh/#author" });
      expect(article.publisher).toEqual({ "@id": "https://helicon.sh/#publisher" });

      const ids = nodes.map((node) => node["@id"]);
      expect(ids).toContain("https://helicon.sh/#author");
      expect(ids).toContain("https://helicon.sh/#publisher");
    });
  }
});
