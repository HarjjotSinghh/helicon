import { ogAlt, ogSize, renderOgImage } from "@/lib/og-image";
import { latestRelease } from "@/lib/github-release";

export const alt = ogAlt;
export const size = ogSize;
export const contentType = "image/png";
export const revalidate = 60;

export default async function Image() {
  const release = await latestRelease();
  return renderOgImage(release?.version ?? null);
}
