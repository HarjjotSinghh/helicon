import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DESKTOP_OS, MUSE_CODE_TESTED, factsBody } from "@/lib/facts";
import { COMPARE_CHECKED, COMPARE_PAGES } from "@/lib/seo/content/compare";
import { FEATURE_PAGES } from "@/lib/seo/content/features";

describe("tested figures", () => {
  it("names the Muse Code release the daemon is built against", () => {
    const daemon = JSON.parse(readFileSync(new URL("../../packages/daemon/package.json", import.meta.url), "utf8"));
    expect(daemon.dependencies["@muse-code/sdk"]).toBe(`^${MUSE_CODE_TESTED.version}`);
  });

  it("puts the same figures in the facts", () => {
    const facts = factsBody(null);
    expect(facts.tested.muse_code_version).toBe(MUSE_CODE_TESTED.version);
    expect(facts.tested.desktop_os).toEqual([...DESKTOP_OS]);
    for (const os of ["windows", "macos", "linux"] as const) expect(facts.platforms[os].supported).toBe(true);
  });

  it("closes every feature page with the tested note", () => {
    for (const page of FEATURE_PAGES) {
      const last = page.blocks.at(-1);
      expect(last?.kind, page.slug).toBe("note");
      expect(last && "text" in last ? last.text : "", page.slug).toContain(`Muse Code](https://dev.meta.ai/products/muse-code/) ${MUSE_CODE_TESTED.version} on Windows, macOS and Linux`);
    }
  });
});

describe("compare sources", () => {
  it("links a source and the check date on every row", () => {
    expect(COMPARE_CHECKED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const page of COMPARE_PAGES) {
      const table = page.blocks.find((block) => block.kind === "table");
      expect(table && table.kind === "table" ? table.head.at(-1) : "", page.slug).toBe("Checked");
      const rows = table && table.kind === "table" ? table.rows : [];
      for (const row of rows) {
        expect(row, page.slug).toHaveLength(4);
        // A row either links the page that backs it or leaves Checked empty.
        expect(row[3], `${page.slug}: ${row[0]}`).toMatch(/^(\[\d{1,2} \w+ \d{4}\]\(https:\/\/[^)\s]+\))?$/);
      }
      if (["compare/cline", "compare/warp", "compare/cursor"].includes(page.slug)) {
        expect(rows.some((row) => row[3] !== ""), page.slug).toBe(true);
      }
    }
  });
});
