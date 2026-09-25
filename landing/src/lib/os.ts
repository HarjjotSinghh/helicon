/** Visitor OS for copy and installer routing. Linux and phones use the default (mac-like) pitch. */

export type VisitorOs = "windows" | "macos" | "linux" | "other";
export type Audience = "windows" | "macos" | "default";

export const VISITOR_OS_HEADER = "x-helicon-os";
export const ANON_COOKIE = "helicon-anon";
/** Set by visiting any page with ?internal=1: the maintainer's own browser, left out of every count. */
export const INTERNAL_COOKIE = "helicon-internal";

export function parseVisitorOs(ua: string, hints?: { platform?: string; mobile?: boolean }): VisitorOs {
  const platform = (hints?.platform ?? "").toLowerCase();
  if (platform.includes("win")) return "windows";
  if ((platform.includes("mac") || platform.includes("darwin")) && !hints?.mobile) return "macos";
  if (platform.includes("linux") && !platform.includes("android")) return "linux";

  if (/Windows/i.test(ua)) return "windows";
  // iPadOS 13+ sends Macintosh; phones and tablets are not installer targets.
  if (/iPhone|iPod|Android/i.test(ua)) return "other";
  if (/iPad/i.test(ua) || (/Macintosh/i.test(ua) && /Mobile/i.test(ua))) return "other";
  if (/Mac OS X|Macintosh/i.test(ua)) return "macos";
  if (/Linux|X11/i.test(ua) && !/Android/i.test(ua)) return "linux";
  return "other";
}

export function audienceFromOs(os: VisitorOs): Audience {
  if (os === "windows") return "windows";
  if (os === "macos") return "macos";
  return "default";
}

export function isVisitorOs(value: string | undefined | null): value is VisitorOs {
  return value === "windows" || value === "macos" || value === "linux" || value === "other";
}
