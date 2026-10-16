import { describe, expect, it } from "vitest";
import { coreNodes } from "@/lib/seo/schema";
import { CONTACT } from "@/lib/site";

/**
 * The Organization node is what an answer engine reads to decide whether a publisher is real. It
 * has to carry both a contactPoint and a postal address, and both have to be true.
 */

type Json = Record<string, any>;

const organization = coreNodes("0.14.2").find((node) => (node as Json)["@type"] === "Organization") as Json;

describe("the Organization node", () => {
  it("is the first publisher-type node, so parsers that take the first one get the complete one", () => {
    const first = coreNodes("0.14.2").find((node) => ["Organization", "Person"].includes((node as Json)["@type"])) as Json;
    expect(first["@type"]).toBe("Organization");
  });

  it("has name, url, an absolute logo, a description and sameAs profiles", () => {
    expect(organization.name).toBe("Helicon");
    expect(organization.url).toBe("https://helicon.sh/");
    expect(organization.logo).toMatch(/^https:\/\/helicon\.sh\/.+\.png$/);
    expect(organization.description).toBeTruthy();
    expect(organization.sameAs).toEqual(
      expect.arrayContaining([
        "https://github.com/HarjjotSinghh/helicon",
        "https://x.com/harjjotsinghh",
        "https://www.linkedin.com/in/harjjotsinghh/",
        "https://alternativeto.net/software/helicon/about/",
      ]),
    );
  });

  it("exists, with the publisher identifier every page refers to", () => {
    expect(organization).toBeTruthy();
    expect(organization["@id"]).toBe("https://helicon.sh/#publisher");
  });

  it("carries a PostalAddress with a country", () => {
    expect(organization.address["@type"]).toBe("PostalAddress");
    expect(organization.address.addressCountry).toBe(CONTACT.address.country);
    expect(organization.address.addressLocality).toBe(CONTACT.address.locality);
    expect(organization.address.addressRegion).toBe(CONTACT.address.region);
  });

  it("carries contact points with a type and an email", () => {
    const points = organization.contactPoint as Json[];
    expect(points.length).toBeGreaterThanOrEqual(1);
    for (const point of points) {
      expect(point["@type"]).toBe("ContactPoint");
      expect(point.contactType).toBeTruthy();
      expect(point.email).toBe(CONTACT.email);
      expect(point.areaServed).toBeTruthy();
    }
    expect(points.map((p) => p.contactType)).toContain("customer support");
    expect(points.map((p) => p.contactType)).toContain("security");
  });

  it("repeats the email on the organization itself, where some parsers look first", () => {
    expect(organization.email).toBe(CONTACT.email);
  });
});
