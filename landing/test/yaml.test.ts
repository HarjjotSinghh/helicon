import { describe, expect, it } from "vitest";
import { toYaml } from "@/lib/api/yaml";

/**
 * The YAML writer only has to handle JSON-shaped data, but it has to handle it exactly: OpenAPI is
 * full of keys and values that change meaning when they are left unquoted.
 */

describe("toYaml", () => {
  it("writes a mapping, quoting every key and scalar", () => {
    expect(toYaml({ a: 1, b: "two" })).toBe('"a": 1\n"b": "two"\n');
  });

  it("keeps booleans, numbers and null as YAML scalars", () => {
    expect(toYaml({ t: true, n: null, f: 1.5 })).toBe('"t": true\n"n": null\n"f": 1.5\n');
  });

  it("indents nested mappings and sequences", () => {
    expect(toYaml({ outer: { inner: ["a", "b"] } })).toBe('"outer":\n  "inner":\n    - "a"\n    - "b"\n');
  });

  it("writes a sequence of mappings as a block", () => {
    expect(toYaml([{ a: 1 }, { b: 2 }])).toBe('-\n  "a": 1\n-\n  "b": 2\n');
  });

  it("writes empty containers inline, where a block would be invalid", () => {
    expect(toYaml({ a: {}, b: [] })).toBe('"a": {}\n"b": []\n');
  });

  it("does not let a value that starts with # become a comment", () => {
    expect(toYaml({ $ref: "#/components/schemas/Error" })).toBe('"$ref": "#/components/schemas/Error"\n');
  });

  it("does not let the key 'on' become a boolean", () => {
    expect(toYaml({ on: "yes" })).toBe('"on": "yes"\n');
  });

  it("escapes newlines rather than breaking the scalar", () => {
    expect(toYaml({ text: "one\ntwo" })).toBe('"text": "one\\ntwo"\n');
  });
});
