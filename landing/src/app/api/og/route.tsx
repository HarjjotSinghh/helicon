import { renderOgImage } from "@/lib/og-image";
import { latestRelease } from "@/lib/github-release";

/**
 * One social image endpoint for every generated page. Metadata points at it with the page's own
 * title, so each page has its own card without a per route image file.
 */
export const runtime = "nodejs";
export const revalidate = 86400;

function clamp(value: string | null, max: number) {
  if (!value) return undefined;
  const text = value.replace(/\s+/g, " ").trim();
  if (!text) return undefined;
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const release = await latestRelease();
  return renderOgImage(release?.version ?? null, {
    title: clamp(params.get("title"), 110),
    subtitle: clamp(params.get("subtitle"), 150),
    eyebrow: clamp(params.get("eyebrow"), 40),
  });
}
