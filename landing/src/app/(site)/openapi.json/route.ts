import { openApiDocument } from "@/lib/api/openapi";

/**
 * The OpenAPI description of the public API, at the path tools look for first. The YAML twin is at
 * /api/openapi.yaml. Both are generated from lib/api/openapi.ts, so they cannot disagree.
 */

export const revalidate = 3600;

export async function GET() {
  return Response.json(openApiDocument(), {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      "Access-Control-Allow-Origin": "*",
      "X-Robots-Tag": "index, follow",
    },
  });
}
