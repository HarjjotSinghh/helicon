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
