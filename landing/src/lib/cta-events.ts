import { ISSUES_URL, RELEASES_URL, REPO_URL } from "./site";

export type CtaEvent = "download_click" | "github_click";

export function classifyCta(href: string): {
  event: CtaEvent | null;
  properties: Record<string, string>;
} {
  const url = href.trim();
  const download = url.match(/\/download\/(windows|macos)/i);
  if (download) {
    return {
      event: "download_click",
      properties: { target_os: download[1].toLowerCase(), href: url },
    };
  }
  if (url.startsWith("#install")) {
    return {
      event: "download_click",
      properties: { target_os: "undecided", href: url },
    };
  }
  if (url === ISSUES_URL || url.includes("/issues")) {
    return { event: "github_click", properties: { destination: "issues", href: url } };
  }
  if (url === RELEASES_URL || url.includes("/releases")) {
    return { event: "github_click", properties: { destination: "releases", href: url } };
  }
  if (url === REPO_URL || url.startsWith(`${REPO_URL}/`)) {
    return { event: "github_click", properties: { destination: "repo", href: url } };
  }
  return { event: null, properties: { href: url } };
}
