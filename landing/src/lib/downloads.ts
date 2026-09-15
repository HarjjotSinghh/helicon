import type { OsId } from "./site";

/** Same-origin installer URLs. The route 302s to the latest GitHub asset and records the hit. */
export function installerPath(os: Extract<OsId, "windows" | "macos">, src: string) {
  const params = new URLSearchParams({ src });
  return `/download/${os}?${params}`;
}
