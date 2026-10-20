import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { KEPT_WEIGHTS, dropWeights } from "../src/vite/phosphorWeights.js";

// The shape Phosphor 2.1 ships in dist/defs/<Icon>.es.js.
const entry = (w: string) =>
  `  [\n    "${w}",\n    /* @__PURE__ */ a.createElement(a.Fragment, null, /* @__PURE__ */ a.createElement("path", { d: "M${w}" }))\n  ]`;
const DEFS = `import * as a from "react";\nconst e = /* @__PURE__ */ new Map([\n${["bold", "duotone", "fill", "light", "regular", "thin"].map(entry).join(",\n")}\n]);\nexport {\n  e as default\n};\n`;

describe("dropWeights", () => {
  it("keeps only the kept weights, as a valid Map", () => {
    const out = dropWeights(DEFS);
    const m = new Function("a", out.replace(/^import.*\n/, "").replace(/export \{[\s\S]*$/, "return e;"))({
      Fragment: "f",
      createElement: (_t: unknown, _p: unknown, child?: { d?: string }) => child ?? _p,
    }) as Map<string, unknown>;
    assert.deepEqual([...m.keys()].sort(), [...KEPT_WEIGHTS].sort());
    assert.doesNotMatch(out, /Mthin|Mlight|Mduotone/);
  });

  it("leaves code it does not recognise alone", () => {
    const odd = "export default new Map([]);";
    assert.equal(dropWeights(odd), odd);
  });
});

describe("icon weights in the source", () => {
  it("asks only for weights the build keeps", () => {
    // Compiled to dist-test/test, four levels below the repo root.
    const root = fileURLToPath(new URL("../../../../", import.meta.url));
    const dirs = [join(root, "packages/ui/src"), join(root, "apps/web/src")];
    const used = new Set<string>();
    const walk = (dir: string): void => {
      for (const d of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, d.name);
        if (d.isDirectory()) walk(p);
        else if (/\.tsx?$/.test(d.name))
          for (const m of readFileSync(p, "utf8").matchAll(/weight[=:]\s*\{?\s*"(thin|light|regular|bold|fill|duotone)"/g))
            used.add(m[1]!);
      }
    };
    dirs.forEach(walk);
    assert.ok(used.size > 0);
    for (const w of used) assert.ok((KEPT_WEIGHTS as readonly string[]).includes(w), `weight "${w}" is dropped at build`);
  });
});
