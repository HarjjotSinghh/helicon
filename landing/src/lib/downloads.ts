import { MAC_ARCH_PARAM, type MacArch } from "./mac-arch";
import type { OsId } from "./site";

/**
 * Same-origin installer URLs. The route 302s to the latest GitHub asset and records the hit.
 * Without `arch` a Mac gets the universal DMG; the route falls back to it when a release has no per-chip build.
 */
export function installerPath(os: Extract<OsId, "windows" | "macos">, src: string, arch?: MacArch) {
  const params = new URLSearchParams({ src });
  if (os === "macos" && arch) params.set(MAC_ARCH_PARAM, arch);
  return `/download/${os}?${params}`;
}
