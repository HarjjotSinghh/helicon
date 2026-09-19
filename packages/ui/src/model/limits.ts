/**
 * Published context windows, standing in when Muse's own catalog declares none. Today every
 * `model/list` row comes back with `contextLimit: null`, and the provider reports token counts
 * but never the window, so `session/contextUsage` carries no `windowTokens` either. Without a
 * stand-in the composer's context ring has no denominator and hides itself entirely.
 *
 * Meta's published window, tokens: 1,048,576 for the Muse Spark family
 * (ai.developer.meta.com/docs/models, mirrored by models.dev). A catalog limit always wins over
 * this table, which only fills the gap; callers must mark the window estimated when it comes
 * from here.
 */

const WINDOWS: Record<string, number> = {
  "muse-spark-1.1": 1_048_576,
  "muse-spark-1.2": 1_048_576,
  "muse-spark-1.3": 1_048_576,
  "muse-spark-1.1-contributor": 1_048_576,
  "muse-spark-1.2-contributor": 1_048_576,
  "muse-spark-1.3-contributor": 1_048_576,
};

/** The published window for a model id, or null when none is known. Unknown minor versions fall back by family. */
export function listedContextLimit(modelId: string | null): number | null {
  if (!modelId) {
    return null;
  }
  const exact = WINDOWS[modelId];
  if (exact) {
    return exact;
  }
  const contributor = /contributor/i.test(modelId);
  const family = Object.keys(WINDOWS).find(
    (id) => /contributor/i.test(id) === contributor && modelId.startsWith(id.replace("-contributor", "").slice(0, 11)),
  );
  return family ? (WINDOWS[family] as number) : null;
}
