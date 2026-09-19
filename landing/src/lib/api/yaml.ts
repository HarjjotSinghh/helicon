/**
 * A YAML writer for JSON-shaped data, used to serve the OpenAPI document at /api/openapi.yaml.
 *
 * It only has to handle what JSON.parse can produce, so it is small on purpose. Every scalar is
 * written as a JSON literal: YAML 1.2 is a superset of JSON, so a double-quoted JSON string is
 * always a valid YAML scalar, and quoting everything removes the whole class of bugs where a key
 * like "on" or a value like "#/components/schemas/Error" changes meaning when it is left bare.
 */

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function scalar(value: string | number | boolean | null): string {
  if (value === null) return "null";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "null";
  if (typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function isContainer(value: JsonValue): value is JsonValue[] | { [key: string]: JsonValue } {
  return typeof value === "object" && value !== null;
}

/** True for a container with nothing in it, which has to be written inline as [] or {}. */
function isEmpty(value: JsonValue[] | { [key: string]: JsonValue }): boolean {
  return Array.isArray(value) ? value.length === 0 : Object.keys(value).length === 0;
}

function write(value: JsonValue, indent: number, lines: string[]): void {
  const pad = "  ".repeat(indent);

  if (Array.isArray(value)) {
    for (const item of value) {
      if (isContainer(item) && !isEmpty(item)) {
        lines.push(`${pad}-`);
        write(item, indent + 1, lines);
      } else if (isContainer(item)) {
        lines.push(`${pad}- ${Array.isArray(item) ? "[]" : "{}"}`);
      } else {
        lines.push(`${pad}- ${scalar(item)}`);
      }
    }
    return;
  }

  for (const [key, item] of Object.entries(value as { [key: string]: JsonValue })) {
    if (item === undefined) continue;
    const name = JSON.stringify(key);
    if (isContainer(item) && !isEmpty(item)) {
      lines.push(`${pad}${name}:`);
      write(item, indent + 1, lines);
    } else if (isContainer(item)) {
      lines.push(`${pad}${name}: ${Array.isArray(item) ? "[]" : "{}"}`);
    } else {
      lines.push(`${pad}${name}: ${scalar(item)}`);
    }
  }
}

export function toYaml(value: unknown): string {
  const root = JSON.parse(JSON.stringify(value)) as JsonValue;
  if (!isContainer(root)) return `${scalar(root as string | number | boolean | null)}\n`;
  const lines: string[] = [];
  write(root, 0, lines);
  return `${lines.join("\n")}\n`;
}
