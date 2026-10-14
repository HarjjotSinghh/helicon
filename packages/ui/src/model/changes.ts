/**
 * Which of a thread's file changes the user has settled. A kept or undone file stays out of the "files changed" card
 * until the thread edits it again: each entry is `<sessionId>|<changes seen>|<path>`, and the file shows again once it
 * has more changes than the entry counted.
 */
const SEP = "|";
const KEEP_LIMIT = 500;

export function settledEntry(sessionId: string, count: number, path: string): string {
  return [sessionId, String(count), path].join(SEP);
}

/** True when `path` is settled for this many changes or more. */
export function isSettled(entries: readonly string[], sessionId: string, path: string, count: number): boolean {
  return entries.some((entry) => {
    const first = entry.indexOf(SEP);
    const second = entry.indexOf(SEP, first + 1);
    if (first < 0 || second < 0 || entry.slice(0, first) !== sessionId || entry.slice(second + 1) !== path) {
      return false;
    }
    return Number(entry.slice(first + 1, second)) >= count;
  });
}

/** `entries` plus these settled files, replacing older entries for the same file; the oldest go past a few hundred. */
export function withSettled(
  entries: readonly string[],
  sessionId: string,
  files: readonly { path: string; count: number }[],
): string[] {
  const paths = new Set(files.map((file) => file.path));
  const kept = entries.filter((entry) => {
    const first = entry.indexOf(SEP);
    const second = entry.indexOf(SEP, first + 1);
    return !(first >= 0 && second >= 0 && entry.slice(0, first) === sessionId && paths.has(entry.slice(second + 1)));
  });
  return [...kept, ...files.map((file) => settledEntry(sessionId, file.count, file.path))].slice(-KEEP_LIMIT);
}
