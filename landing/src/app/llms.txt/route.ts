import { llmsTxt } from "@/lib/ai-docs";
import { latestRelease } from "@/lib/github-release";

export const revalidate = 60;

export async function GET() {
  const release = await latestRelease();
  return new Response(llmsTxt(release?.version ?? null), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "index, follow" },
  });
}
