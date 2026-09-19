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

export type ReleaseSummary = {
  version: string;
  tag: string;
  name: string;
  publishedAt: string;
  notesUrl: string;
  /** The release notes body, as GitHub stores it. May be empty. */
  body: string;
  prerelease: boolean;
};

/**
 * Recent releases, for the changelog page. A changelog is the cheapest honest freshness signal a
 * site can have: it changes when the product changes, and it is the page people link to.
 */
export const recentReleases = cache(async (limit = 20): Promise<ReleaseSummary[]> => {
  try {
    const res = await fetch(`https://api.github.com/repos/${repoPath}/releases?per_page=${limit}`, {
      headers: await githubHeaders(),
      next: { revalidate: 900 },
    });
    if (!res.ok) return [];
    const body = (await res.json()) as Array<{
      tag_name?: string;
      name?: string;
      published_at?: string;
      html_url?: string;
      body?: string;
      prerelease?: boolean;
      draft?: boolean;
    }>;
    return body
      .filter((item) => !item.draft && item.tag_name)
      .map((item) => {
        const tag = item.tag_name ?? "";
        return {
          version: tag.replace(/^v/, ""),
          tag,
          name: item.name?.trim() || tag,
          publishedAt: item.published_at ?? "",
          notesUrl: item.html_url || RELEASES_URL,
          body: (item.body ?? "").trim(),
          prerelease: Boolean(item.prerelease),
        };
      });
  } catch {
    return [];
  }
});

export type Change = {
  /** The commit subject, with the conventional-commit prefix and the PR suffix removed. */
  text: string;
  /** Pull request number, when the subject carries one. */
  pr: number | null;
  /** Issue numbers the body says this closes. */
  closes: number[];
  sha: string;
};

export type ChangeGroups = {
  added: Change[];
  fixed: Change[];
  changed: Change[];
  removed: Change[];
};

export type ReleaseNotes = ReleaseSummary & { changes: ChangeGroups; commitCount: number };

/**
 * Which section of a changelog a commit belongs in. Conventional-commit prefixes win when they
 * are there; this repository mostly writes prose subjects, so the verb decides the rest. Release
 * commits, merges and pure chores are dropped: nobody reading a changelog wants "bump deps".
 */
function classify(subject: string): keyof ChangeGroups | null {
  const s = subject.trim();
  if (/^Release\s+v?\d/i.test(s)) return null;
  if (/^Merge (pull request|branch|remote)/i.test(s)) return null;
  // Bots. Their commits are real but nobody reads a changelog for them.
  if (/^\[?(ImgBot|dependabot|renovate)\]?/i.test(s)) return null;

  const conventional = /^(\w+)(\([^)]*\))?!?:\s*/.exec(s);
  if (conventional) {
    const type = conventional[1].toLowerCase();
    if (type === "feat") return "added";
    if (type === "fix") return "fixed";
    if (type === "revert") return "removed";
    if (type === "perf" || type === "refactor" || type === "style") return "changed";
    if (["chore", "docs", "test", "build", "ci", "deps"].includes(type)) return null;
    return "changed";
  }

  if (/^(add|ship|introduce|bring|give|support|allow|let)\b/i.test(s)) return "added";
  if (/^(fix|stop|correct|repair|prevent|unbreak|handle|guard|restore|resolve)\b/i.test(s)) return "fixed";
  if (/^(remove|drop|delete|retire|strip)\b/i.test(s)) return "removed";
  return "changed";
}

/**
 * Strips the conventional prefix, every trailing PR reference and the full stop, then restores
 * the capital that the prefix was carrying. `fix: stop the view freezing (#32) (#41)` becomes
 * `Stop the view freezing`.
 */
function cleanSubject(subject: string) {
  const text = subject
    .replace(/^(\w+)(\([^)]*\))?!?:\s*/, "")
    .replace(/\s*\((?:#\d+(?:,\s*)?)+\)\s*$/g, "")
    .replace(/\s*\((?:#\d+(?:,\s*)?)+\)\s*$/g, "")
    .replace(/\.$/, "")
    .trim();
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}

function parseCommit(message: string, sha: string): { group: keyof ChangeGroups | null; change: Change } {
  const [subject, ...rest] = message.split("\n");
  const body = rest.join("\n");
  const prMatch = [...subject.matchAll(/#(\d+)/g)];
  const closes = [...body.matchAll(/(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi)].map((m) => Number(m[1]));
  return {
    group: classify(subject),
    change: {
      text: cleanSubject(subject),
      pr: prMatch.length ? Number(prMatch[prMatch.length - 1][1]) : null,
      closes: [...new Set(closes)],
      sha,
    },
  };
}

/**
 * Releases with the commits that went into each one. The release bodies in this repository are
 * the same installation boilerplate every time, so the changelog has to be built from the
 * commits instead.
 *
 * Commits are fetched in pages and bucketed by date rather than compared tag by tag: a compare
 * call per release would be one request per version, and this site talks to GitHub unauthenticated
 * unless GITHUB_TOKEN is set. Four requests, cached for a day, covers the whole page.
 */
export const releaseNotes = cache(async (limit = 12): Promise<ReleaseNotes[]> => {
  const releases = (await recentReleases(limit + 1)).filter((r) => r.publishedAt);
  if (!releases.length) return [];

  const commits: Array<{ sha: string; date: string; message: string }> = [];
  try {
    for (let page = 1; page <= 3; page++) {
      const res = await fetch(`https://api.github.com/repos/${repoPath}/commits?per_page=100&page=${page}`, {
        headers: await githubHeaders(),
        next: { revalidate: 86400 },
      });
      if (!res.ok) break;
      const body = (await res.json()) as Array<{
        sha: string;
        commit?: { message?: string; committer?: { date?: string } };
      }>;
      if (!body.length) break;
      for (const c of body) {
        commits.push({
          sha: c.sha,
          date: c.commit?.committer?.date ?? "",
          message: c.commit?.message ?? "",
        });
      }
      if (body.length < 100) break;
    }
  } catch {
    // An empty commit list degrades to releases with no detail, which is what the page had before.
  }

  // Oldest release first makes the "everything since the previous tag" window trivial to express.
  const ordered = [...releases].sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));

  return ordered
    .map((release, i) => {
      const since = ordered[i - 1]?.publishedAt ?? "";
      const window = commits.filter((c) => c.date && c.date <= release.publishedAt && c.date > since);
      const changes: ChangeGroups = { added: [], fixed: [], changed: [], removed: [] };
      const seen = new Set<string>();
      for (const c of window) {
        const { group, change } = parseCommit(c.message, c.sha);
        if (!group || !change.text) continue;
        const key = change.text.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        changes[group].push(change);
      }
      return { ...release, changes, commitCount: window.length };
    })
    .reverse()
    .slice(0, limit);
});
