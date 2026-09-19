"use client";

import { useSyncExternalStore } from "react";
import { parseVisitorOs, type VisitorOs } from "./os";

/**
 * The visitor's platform, resolved on the client only.
 *
 * Statically generated pages cannot know it at render time, so the server snapshot is null and
 * every caller has to have a sensible answer for "I do not know yet": that is what a crawler and
 * a reader without JavaScript will see, and it must not be a download button for the wrong
 * operating system.
 */
const noop = () => () => {};

function read(): VisitorOs {
  const uaData = (navigator as Navigator & { userAgentData?: { platform: string; mobile: boolean } }).userAgentData;
  return parseVisitorOs(
    navigator.userAgent,
    uaData ? { platform: uaData.platform, mobile: uaData.mobile } : undefined,
  );
}

export function useVisitorOs(): VisitorOs | null {
  return useSyncExternalStore(noop, read, () => null);
}
