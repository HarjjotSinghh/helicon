import { openApiDocument } from "@/lib/api/openapi";
import { toYaml } from "@/lib/api/yaml";

/** The same document as /openapi.json, for the tools that expect YAML at the conventional path. */

export const revalidate = 3600;

export async function GET() {
  return new Response(toYaml(openApiDocument()), {
    headers: {
      "Content-Type": "application/yaml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      "Access-Control-Allow-Origin": "*",
      "X-Robots-Tag": "index, follow",
    },
  });
}
