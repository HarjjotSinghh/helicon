import { describe, expect, it } from "vitest";
import robots from "../src/app/robots";

describe("robots", () => {
  const rules = [robots().rules].flat();

  it("repeats the disallow lines in every named group", () => {
    for (const rule of rules) {
      const disallow = [rule.disallow ?? []].flat();
      expect(disallow).toEqual(expect.arrayContaining(["/api/update/", "/download/"]));
    }
  });

  it("lets link preview bots fetch the og image and nobody else", () => {
    for (const rule of rules) {
      const agents = [rule.userAgent].flat();
      const blocked = [rule.disallow ?? []].flat().includes("/api/og");
      expect(blocked).toBe(!agents.includes("Twitterbot"));
    }
  });
});
