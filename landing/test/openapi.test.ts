import { describe, expect, it } from "vitest";
import { openApiDocument } from "@/lib/api/openapi";
import { toYaml } from "@/lib/api/yaml";
import { API_BASE_PATH, ERROR_CODES } from "@/lib/api/contract";

/**
 * The OpenAPI document is what turns the API into callable functions for an LLM, so these are the
 * properties a function-calling generator actually needs: a unique operationId everywhere, a
 * description on every operation, typed parameters, response schemas, and no dangling $ref.
 */

type Json = Record<string, any>;

const doc = openApiDocument() as Json;

function operations(): { path: string; method: string; op: Json }[] {
  const out: { path: string; method: string; op: Json }[] = [];
  for (const [path, item] of Object.entries(doc.paths as Json)) {
    for (const [method, op] of Object.entries(item as Json)) {
      out.push({ path, method, op: op as Json });
    }
  }
  return out;
}

function refs(value: unknown, found: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const item of value) refs(item, found);
    return found;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value as Json)) {
      if (key === "$ref" && typeof item === "string") found.push(item);
      else refs(item, found);
    }
  }
  return found;
}

describe("openApiDocument", () => {
  it("is an OpenAPI 3.1 document with a server and a licence", () => {
    expect(doc.openapi).toBe("3.1.0");
    expect(doc.info.title).toContain("Helicon");
    expect(doc.info.license.identifier).toBe("MIT");
    expect(doc.servers[0].url).toBe("https://helicon.sh");
    expect(doc.info.contact.email).toBe("me@harjotrana.com");
  });

  it("documents at least twelve operations, all under the versioned base path", () => {
    const ops = operations();
    expect(ops.length).toBeGreaterThanOrEqual(12);
    for (const { path } of ops) expect(path.startsWith(API_BASE_PATH)).toBe(true);
  });

  it("gives every operation a unique operationId", () => {
    const ids = operations().map(({ op }) => op.operationId);
    expect(ids.every((id) => typeof id === "string" && id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every operation a summary, a description and a tag", () => {
    for (const { path, op } of operations()) {
      expect(op.summary, `${path} summary`).toBeTruthy();
      expect(String(op.description ?? "").length, `${path} description`).toBeGreaterThan(20);
      expect(op.tags?.length, `${path} tags`).toBeGreaterThan(0);
    }
  });

  it("types every parameter and describes it", () => {
    for (const { path, op } of operations()) {
      for (const param of (op.parameters ?? []) as Json[]) {
        expect(param.name, `${path} parameter name`).toBeTruthy();
        expect(["path", "query"], `${path} parameter in`).toContain(param.in);
        expect(param.description, `${path} ${param.name} description`).toBeTruthy();
        expect(param.schema?.type, `${path} ${param.name} type`).toBeTruthy();
      }
      // A path parameter is required by the specification; a query parameter must say either way.
      for (const param of (op.parameters ?? []) as Json[]) {
        if (param.in === "path") expect(param.required).toBe(true);
        else expect(typeof param.required).toBe("boolean");
      }
    }
  });

  it("gives every operation a 200 with a JSON schema and the four error responses", () => {
    for (const { path, op } of operations()) {
      const ok = op.responses["200"];
      expect(ok?.content?.["application/json"]?.schema, `${path} 200 schema`).toBeTruthy();
      for (const status of ["400", "404", "405", "503"]) {
        expect(op.responses[status]?.content?.["application/json"]?.schema, `${path} ${status}`).toBeTruthy();
      }
    }
  });

  it("resolves every $ref against components.schemas", () => {
    const names = new Set(Object.keys(doc.components.schemas as Json));
    const used = refs(doc);
    expect(used.length).toBeGreaterThan(0);
    for (const ref of used) {
      expect(ref.startsWith("#/components/schemas/"), ref).toBe(true);
      expect(names.has(ref.replace("#/components/schemas/", "")), ref).toBe(true);
    }
  });

  it("enumerates the error codes the router can actually return", () => {
    const codes = doc.components.schemas.Error.properties.error.properties.code.enum;
    expect(codes).toEqual([...ERROR_CODES]);
  });

  it("serialises to YAML that parses back to the same document", () => {
    const yaml = toYaml(doc);
    expect(yaml.startsWith('"openapi": "3.1.0"')).toBe(true);
    expect(yaml).toContain('"operationId": "getApiIndex"');
    // Quoting every scalar means the shape survives keys like "on" and values that start with "#".
    expect(yaml).toContain('"$ref": "#/components/schemas/Error"');
  });
});
