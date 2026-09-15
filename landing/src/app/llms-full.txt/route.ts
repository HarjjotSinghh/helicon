import { llmsFullTxt } from "@/lib/ai-docs";

export const dynamic = "force-static";

export function GET() {
  return new Response(llmsFullTxt(), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "index, follow" },
  });
}
