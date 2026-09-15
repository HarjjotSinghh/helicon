import { agentsMd } from "@/lib/ai-docs";

export const dynamic = "force-static";

export function GET() {
  return new Response(agentsMd(), {
    headers: { "Content-Type": "text/markdown; charset=utf-8", "X-Robots-Tag": "index, follow" },
  });
}
