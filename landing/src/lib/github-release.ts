import { cache } from "react";
import { RELEASES_URL, REPO_URL } from "./site";

export type InstallerKind = "windows" | "macos";

export type ReleaseAsset = {
  version: string;
  name: string;
  url: string;
  size: number;
};

export type LatestRelease = {
  version: string;
  tag: string;
  notesUrl: string;
  assets: Array<{ name: string; size: number; browser_download_url: string }>;
};

type GithubRelease = {
  tag_name?: string;
  html_url?: string;
  assets?: LatestRelease["assets"];
};

const repoPath = REPO_URL.replace("https://github.com/", "");

function matchAsset(kind: InstallerKind, name: string) {
  if (kind === "windows") return /setup\.exe$/i.test(name) && !/\.sig$/i.test(name);
  return /\.dmg$/i.test(name) && !/\.sig$/i.test(name);
}

async function githubHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "helicon.sh",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/** One GitHub fetch per request. Cached for a minute so a new tag shows up without a redeploy. */
export const latestRelease = cache(async (): Promise<LatestRelease | null> => {
  try {
    const res = await fetch(`https://api.github.com/repos/${repoPath}/releases/latest`, {
      headers: await githubHeaders(),
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as GithubRelease;
    const tag = body.tag_name ?? "";
    const version = tag.replace(/^v/, "");
    if (!version) return null;
    return {
      version,
      tag,
      notesUrl: body.html_url || RELEASES_URL,
      assets: body.assets ?? [],
    };
  } catch {
    return null;
  }
});

/**
 * The repository's star count, refreshed every five minutes. GitHub has no push feed for this, so a poll on the
 * server is as live as it gets without a websocket nobody would notice. Null when GitHub is unreachable or
 * rate-limits us, and every caller then renders the link with no count rather than a zero.
 */
export const repoStars = cache(async (): Promise<number | null> => {
  try {
    const res = await fetch(`https://api.github.com/repos/${repoPath}`, {
      headers: await githubHeaders(),
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { stargazers_count?: number };
    return typeof body.stargazers_count === "number" ? body.stargazers_count : null;
  } catch {
    return null;
  }
});

/** GitHub's own rounding: 1200 reads as 1.2k, the way the star button shows it. */
export function formatStars(count: number): string {
  return count >= 1000 ? `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(count);
}

export async function latestInstaller(kind: InstallerKind): Promise<ReleaseAsset | null> {
  const release = await latestRelease();
  if (!release) return null;
  const asset = release.assets.find((item) => matchAsset(kind, item.name));
  if (!asset) return null;
  return {
    version: release.version,
    name: asset.name,
    url: asset.browser_download_url,
    size: asset.size,
  };
}
