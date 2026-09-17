import { mkdirSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { EndpointRecord } from "@helicon/daemon";

export type { EndpointRecord };

/** One row of Muse's model-catalog cache, in the shape `model/list` reads. */
export interface CatalogRow {
  model_id: string;
  display_label: string;
  provider_id: string;
  profile_id: string;
  visibility: string;
  release_date: string | null;
  display_order: number | null;
  is_current: boolean;
  is_default: boolean;
  roles: string[];
  context_limit: number;
  output_limit: number;
  description: string | null;
  cost: unknown;
  reasoning_effort_variants: string[];
  supports_video: boolean;
}

// Muse 1.3.0 redirects every model call through endpoint_transport and then serves model/list from
// its provider/profile catalog cache, so an isolated home carries both.
const PROVIDER_ID = "meta";
const PROFILE_ID = "tbh";
const MODEL_FETCH_TIMEOUT_MS = 10_000;
const CONTRIBUTOR_FREE_DESCRIPTION = "Free tier: prompts and completions may be used to train future Meta models.";

function catalogRowFor(modelId: string): CatalogRow {
  return {
    model_id: modelId,
    display_label: modelId,
    provider_id: PROVIDER_ID,
    profile_id: PROFILE_ID,
    visibility: "visible",
    release_date: null,
    display_order: null,
    is_current: false,
    is_default: false,
    roles: [],
    context_limit: 1_000_000,
    output_limit: 128_000,
    description: modelId.includes("contributor") ? CONTRIBUTOR_FREE_DESCRIPTION : null,
    cost: null,
    reasoning_effort_variants: [],
    supports_video: false,
  };
}

/** What Helicon offers when an endpoint has no model list of its own; the caller marks one default. */
export function bundledModelRows(): CatalogRow[] {
  return ["muse-spark-1.3", "muse-spark-1.2", "muse-spark-1.3-contributor-free"].map(catalogRowFor);
}

/** Rows with exactly one default: the chosen model once it is among them, else the first row. */
export function normalizeCatalogRows(rows: CatalogRow[], defaultModel: string | null): CatalogRow[] {
  const merged =
    defaultModel && !rows.some((row) => row.model_id === defaultModel) ? [...rows, catalogRowFor(defaultModel)] : rows;
  const wanted = defaultModel ?? merged[0]?.model_id ?? null;
  const at = merged.findIndex((row) => row.model_id === wanted);
  return merged.map((row, index) => ({ ...row, is_default: index === at }));
}

function parseCatalog(modelsJson: string): CatalogRow[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(modelsJson);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.filter((row): row is CatalogRow => {
    const record = typeof row === "object" && row !== null ? (row as Record<string, unknown>) : null;
    return record !== null && typeof record["model_id"] === "string";
  });
}

/** The model ids in a stored catalog, in row order. */
export function catalogModelIds(modelsJson: string): string[] {
  return parseCatalog(modelsJson).map((row) => row.model_id);
}

/** The rows an endpoint's home serves: the stored catalog, with exactly one default marked. */
export function endpointCatalog(endpoint: Pick<EndpointRecord, "modelsJson" | "defaultModel">): CatalogRow[] {
  return normalizeCatalogRows(parseCatalog(endpoint.modelsJson), endpoint.defaultModel);
}

/**
 * Writes the isolated Muse home for an endpoint: settings that redirect every model call, plus a
 * freshly dated catalog cache so `model/list` answers from it. The gateway serves no catalog of its
 * own, so without the cache Muse would fall back to whatever it last cached — or nothing.
 */
export function writeEndpointHome(root: string, endpoint: EndpointRecord): { configHome: string; dataHome: string } {
  const configHome = join(root, "config");
  const dataHome = join(root, "data");
  const stored = parseCatalog(endpoint.modelsJson);
  const rows = normalizeCatalogRows(stored.length > 0 ? stored : bundledModelRows(), endpoint.defaultModel);
  const settingsDir = join(configHome, "muse");
  const cacheDir = join(dataHome, "muse", "model-catalog");
  mkdirSync(settingsDir, { recursive: true });
  mkdirSync(cacheDir, { recursive: true });
  const settingsPath = join(settingsDir, "settings.json");
  const cachePath = join(
    cacheDir,
    `${Buffer.from(PROVIDER_ID, "utf8").toString("hex")}__p${Buffer.from(PROFILE_ID, "utf8").toString("hex")}.json`,
  );
  writeFileSync(settingsPath, JSON.stringify({ schema_version: 1, endpoint_transport: { base_url: endpoint.baseUrl } }));
  writeFileSync(
    cachePath,
    JSON.stringify({ schema_version: 1, provider_id: PROVIDER_ID, profile_id: PROFILE_ID, source: "provider_catalog", rows }),
  );
  // A fresh mtime is what makes Muse treat the cache as current instead of refetching.
  const now = new Date();
  utimesSync(settingsPath, now, now);
  utimesSync(cachePath, now, now);
  return { configHome, dataHome };
}

/** The endpoint's model list in catalog form, or null when it cannot be fetched or parsed. */
export async function fetchEndpointModels(
  baseUrl: string,
  apiKey: string | null,
  fetchImpl: typeof fetch = fetch,
): Promise<CatalogRow[] | null> {
  try {
    const response = await fetchImpl(`${baseUrl.trim().replace(/\/+$/, "")}/models`, {
      headers: apiKey ? { authorization: `Bearer ${apiKey}` } : undefined,
      signal: AbortSignal.timeout(MODEL_FETCH_TIMEOUT_MS),
    });
    if (!response.ok) {
      return null;
    }
    const body = (await response.json()) as { data?: unknown };
    if (!Array.isArray(body.data)) {
      return null;
    }
    return body.data
      .map((entry) => (typeof entry === "object" && entry !== null ? (entry as Record<string, unknown>)["id"] : null))
      .filter((id): id is string => typeof id === "string" && id.toLowerCase().startsWith("muse"))
      .map(catalogRowFor);
  } catch {
    return null;
  }
}
