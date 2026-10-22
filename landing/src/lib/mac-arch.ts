/**
 * Which macOS DMG a Mac should get.
 *
 * A release carries up to three DMGs: the universal one (Apple Silicon and Intel, the default and the
 * one the updater's .app.tar.gz comes from) and, from the first release built with per-chip bundles,
 * Helicon_<version>_aarch64.dmg and Helicon_<version>_x64.dmg at about half the size.
 *
 * Only a browser that says so gets a per-chip build. Safari and Firefox cannot tell a Mac's chip, and
 * the user agent of an Apple Silicon Mac claims Intel, so a Mac user agent alone never selects x64.
 * Everything unsure resolves to the universal DMG, which runs on both.
 */

export type MacArch = "arm64" | "x64";

export const MAC_ARCHES: readonly MacArch[] = ["arm64", "x64"];

/** The query parameter on /download/macos that asks for one chip's build. */
export const MAC_ARCH_PARAM = "arch";

export const MAC_ARCH_LABEL: Record<MacArch, string> = {
  arm64: "Apple Silicon",
  x64: "Intel",
};

/** File name suffix of each build, as tauri names bundles: Helicon_0.23.0_aarch64.dmg, Helicon_0.23.0_x64.dmg. */
const ARCH_FILE: Record<MacArch, RegExp> = {
  arm64: /_aarch64\.dmg$/i,
  x64: /_x64\.dmg$/i,
};

const UNIVERSAL_FILE = /_universal\.dmg$/i;

type NamedAsset = { name: string };

/** A value from a query string or a hint: "arm64", "x64", or nothing we recognise. */
export function parseMacArchParam(value: string | null | undefined): MacArch | null {
  if (value === "arm64" || value === "x64") return value;
  return null;
}

/**
 * The chip from navigator.userAgentData.getHighEntropyValues(["architecture"]). Chromium answers "arm"
 * on Apple Silicon and "x86" on Intel; anything else (an empty string, a missing key, "arm" on a
 * non-Mac) is not an answer.
 */
export function macArchFromHints(hints: { architecture?: string | null; platform?: string | null } | null | undefined): MacArch | null {
  if (!hints) return null;
  if (hints.platform && !/mac/i.test(hints.platform)) return null;
  const arch = (hints.architecture ?? "").toLowerCase();
  if (arch === "arm") return "arm64";
  if (arch === "x86") return "x64";
  return null;
}

function isDmg(name: string) {
  return /\.dmg$/i.test(name) && !/\.sig$/i.test(name);
}

/** Does this release carry the build for this chip? */
export function hasMacArchAsset(assets: readonly NamedAsset[] | null | undefined, arch: MacArch): boolean {
  return !!assets?.some((asset) => isDmg(asset.name) && ARCH_FILE[arch].test(asset.name));
}

/** Both per-chip DMGs are there, so the page can offer explicit links without sending anyone to a 404. */
export function hasMacArchAssets(assets: readonly NamedAsset[] | null | undefined): boolean {
  return MAC_ARCHES.every((arch) => hasMacArchAsset(assets, arch));
}

/**
 * The DMG to hand out. The requested chip's build when the release has it, otherwise the universal
 * one, otherwise whatever DMG there is. A release made before per-chip builds existed therefore
 * answers every request with its universal DMG.
 */
export function pickMacAsset<T extends NamedAsset>(assets: readonly T[], arch: MacArch | null): T | null {
  const dmgs = assets.filter((asset) => isDmg(asset.name));
  if (arch) {
    const exact = dmgs.find((asset) => ARCH_FILE[arch].test(asset.name));
    if (exact) return exact;
  }
  return dmgs.find((asset) => UNIVERSAL_FILE.test(asset.name)) ?? dmgs[0] ?? null;
}

/** Which build a picked asset is, for the download event. */
export function macAssetKind(name: string): MacArch | "universal" | "other" {
  if (UNIVERSAL_FILE.test(name)) return "universal";
  if (ARCH_FILE.arm64.test(name)) return "arm64";
  if (ARCH_FILE.x64.test(name)) return "x64";
  return "other";
}

/**
 * The macOS download link with the chip added. Other links, and links that already name a chip, come
 * back unchanged. Relative links stay relative.
 */
export function withMacArch(href: string, origin: string, arch: MacArch | null): string {
  if (!arch) return href;
  try {
    const url = new URL(href, origin);
    if (url.origin !== origin || url.pathname !== "/download/macos") return href;
    if (parseMacArchParam(url.searchParams.get(MAC_ARCH_PARAM))) return href;
    url.searchParams.set(MAC_ARCH_PARAM, arch);
    return href.startsWith("/") ? `${url.pathname}${url.search}${url.hash}` : url.toString();
  } catch {
    return href;
  }
}

type UaDataLike = {
  platform?: string;
  getHighEntropyValues?: (hints: string[]) => Promise<{ architecture?: string; platform?: string }>;
};

/** Ask the browser for the chip. Null for every browser that cannot or will not say. */
export async function detectMacArch(nav: { userAgentData?: UaDataLike } | undefined): Promise<MacArch | null> {
  const uaData = nav?.userAgentData;
  if (!uaData || typeof uaData.getHighEntropyValues !== "function") return null;
  try {
    const values = await uaData.getHighEntropyValues(["architecture"]);
    return macArchFromHints({ architecture: values.architecture, platform: values.platform ?? uaData.platform });
  } catch {
    return null;
  }
}
