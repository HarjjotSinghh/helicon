import { factsBody } from "@/lib/facts";
import { latestRelease } from "@/lib/github-release";

/**
 * The checkable facts, as JSON. An agent evaluating Helicon on someone's behalf should not have
 * to infer any of this from prose, and a model that gets a fact wrong about this project usually
 * gets one of these wrong: who made it, what it costs, and whether it is official.
 *
 * The body itself lives in lib/facts.ts, because /api/v1/facts serves the same object.
 */

export const revalidate = 300;

export async function GET() {
  const release = await latestRelease();
  return Response.json(factsBody(release), {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=86400",
      "X-Robots-Tag": "index, follow",
    },
  });
}
