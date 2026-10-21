/**
 * Every Phosphor icon file carries all six weights (thin, light, regular, bold, fill, duotone) in a
 * Map, and the bundler cannot tell which ones IconBase will ask for at runtime. The product draws
 * bold by default (ControllerProvider) and a few fill and regular icons, so the other three weights
 * were about half of the icon code in the bundle. This drops them at build time.
 *
 * An icon asked for a dropped weight renders an empty svg, so test/phosphorWeights.test.ts fails if
 * the source asks for one. To use another weight, add it to KEPT_WEIGHTS.
 */
export const KEPT_WEIGHTS = ["bold", "fill", "regular"] as const;

const DEFS = /@phosphor-icons\/react\/dist\/defs\/[^/]+\.es\.js$/;
const ENTRY = /\[\s*"(thin|light|regular|bold|fill|duotone)",/g;

/** The weights Map with only the kept entries, or the code unchanged if it isn't the shape we know. */
export function dropWeights(code: string, keep: readonly string[] = KEPT_WEIGHTS): string {
  const open = code.indexOf("new Map([");
  const close = code.lastIndexOf("]);");
  if (open < 0 || close < open) return code;
  const entries = [...code.slice(open, close).matchAll(ENTRY)].map((m) => ({
    weight: m[1] as string,
    start: open + m.index,
  }));
  if (entries.length !== 6) return code;
  const kept = entries
    .map((e, i) => ({ ...e, end: entries[i + 1]?.start ?? close }))
    .filter((e) => keep.includes(e.weight))
    .map((e) => code.slice(e.start, e.end).replace(/[\s,]+$/, ""));
  if (kept.length !== keep.length) return code;
  return code.slice(0, entries[0]!.start) + kept.join(",\n  ") + "\n" + code.slice(close);
}

export function phosphorWeights() {
  return {
    name: "helicon-phosphor-weights",
    enforce: "pre" as const,
    transform(code: string, id: string) {
      return DEFS.test(id) ? { code: dropWeights(code), map: null } : null;
    },
  };
}
