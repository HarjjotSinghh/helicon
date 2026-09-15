import { REPO_URL } from "./site";

export type InstallerKind = "windows" | "macos";

export type ReleaseAsset = {
  version: string;
  name: string;
  url: string;
  size: number;
};

type GithubRelease = {
  tag_name?: string;
  assets?: Array<{
    name: string;
    size: number;
    browser_download_url: string;
  }>;
};

const repoPath = REPO_URL.replace("https://github.com/", "");

function matchAsset(kind: InstallerKind, name: string) {
  if (kind === "windows") return /setup\.exe$/i.test(name) && !/\.sig$/i.test(name);
  return /\.dmg$/i.test(name) && !/\.sig$/i.test(name);
}

export async function latestInstaller(kind: InstallerKind): Promise<ReleaseAsset | null> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "helicon.sh",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`https://api.github.com/repos/${repoPath}/releases/latest`, {
    headers,
    next: { revalidate: 300 },
  });
  if (!res.ok) return null;

  const body = (await res.json()) as GithubRelease;
  const asset = body.assets?.find((item) => matchAsset(kind, item.name));
  if (!asset) return null;

  return {
    version: (body.tag_name ?? "").replace(/^v/, ""),
    name: asset.name,
    url: asset.browser_download_url,
    size: asset.size,
  };
}
