import { latestRelease, recentReleases } from "@/lib/github-release";
import { apiError, apiHeaders, statusForCode } from "@/lib/api/contract";
import { handleApi } from "@/lib/api/router";

/**
 * The public JSON API. One handler for every path under /api/v1, because the interesting part is
 * the routing table in lib/api/router.ts, and because a single entry point is the only way to give
 * an unknown path and an unsupported method the same JSON error shape that a known path gets.
 *
 * Read only, anonymous and CORS open: an agent should be able to call this from anywhere without
 * asking anyone for a key.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function respond(request: Request, method: string, params: Promise<{ path?: string[] }>) {
  const { path } = await params;
  const url = new URL(request.url);
  const result = await handleApi(
    { method, segments: path ?? [], searchParams: url.searchParams },
    { latestRelease, recentReleases },
  );
  return Response.json(result.body, {
    status: result.status,
    headers: apiHeaders(result.maxAge),
  });
}

export async function GET(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  return respond(request, "GET", context.params);
}

/** Preflight. Nothing here needs credentials, so the answer is always the same. */
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: apiHeaders(3600) });
}

/**
 * Anything that would change state. Next would answer these with an empty 405, and an agent
 * reading an empty body has to guess; this says what happened and what to do instead.
 */
function readOnly() {
  const body = apiError(
    "method_not_allowed",
    "This API is read only.",
    "Use GET. Every endpoint is listed at /api/v1, and described at /openapi.json.",
  );
  return Response.json(body, {
    status: statusForCode("method_not_allowed"),
    headers: { ...apiHeaders(0), Allow: "GET, HEAD, OPTIONS" },
  });
}

export async function POST() {
  return readOnly();
}

export async function PUT() {
  return readOnly();
}

export async function PATCH() {
  return readOnly();
}

export async function DELETE() {
  return readOnly();
}
