import { agentsMd } from "@/lib/ai-docs";
import { latestRelease } from "@/lib/github-release";

export const revalidate = 60;

export async function GET() {
  const release = await latestRelease();
  return new Response(agentsMd(release?.version ?? null), {
    headers: { "Content-Type": "text/markdown; charset=utf-8", "X-Robots-Tag": "index, follow" },
  });
}
