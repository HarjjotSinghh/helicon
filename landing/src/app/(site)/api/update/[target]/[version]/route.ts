import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { track } from "@/lib/analytics";
import { latestRelease } from "@/lib/github-release";
import { RELEASES_URL } from "@/lib/site";

export const runtime = "nodejs";

/**
 * What the updater actually puts in `{{target}}`: the bare platform, from `updater_os()` in
 * tauri-plugin-updater. The arch-suffixed names are latest.json's keys rather than the target, and
 * only reach here from a hand-written check, so both spellings are allowed and a stray path is
 * still not counted as a platform.
 */
const TARGETS = new Set([
  "windows",
  "darwin",
  "linux",
  "windows-x86_64",
  "darwin-aarch64",
  "darwin-x86_64",
  "linux-x86_64",
]);

/** The platform on its own, so one OS is one bucket whichever spelling the check arrived with. */
function platformOf(target: string): string {
  const base = target.split("-")[0];
  return base === "windows" || base === "darwin" || base === "linux" ? base : "other";
}

const MANIFEST_URL = `${RELEASES_URL}/download/latest.json`;

/**
 * An install is one hashed IP for one week. The salt rotates with the week, so two weeks of logs cannot be joined to
 * follow a machine, and nothing that identifies anyone is stored. It counts installs, not people: several machines
 * behind one address read as one, and a changing address reads as several. A floor, which is what it is for.
 */
function installHash(request: Request, target: string): string {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const week = new Date();
  week.setUTCDate(week.getUTCDate() - week.getUTCDay());
  const salt = process.env.UPDATE_COUNT_SALT ?? "helicon";
  return `install-${createHash("sha256").update(`${salt}|${week.toISOString().slice(0, 10)}|${ip}|${target}`).digest("hex").slice(0, 32)}`;
}

/**
 * The desktop app's update manifest, served from here rather than straight off GitHub so a weekly count of installs
 * falls out of a request the app already had to make. The manifest itself is GitHub's, passed through untouched, and
 * the app falls back to the GitHub URL when this is unreachable.
 */
export async function GET(request: Request, context: { params: Promise<{ target: string; version: string }> }) {
  const { target, version } = await context.params;
  const release = await latestRelease();

  void track(
    "update_check",
    {
      target: TARGETS.has(target) ? target : "other",
      platform: platformOf(target),
      current_version: /^\d+\.\d+\.\d+$/.test(version) ? version : "other",
      latest_version: release?.version ?? null,
    },
    installHash(request, target),
    request,
  ).catch(() => undefined);

  const manifest = await fetch(MANIFEST_URL, { next: { revalidate: 300 } }).catch(() => null);
  if (!manifest?.ok) {
    // Nothing to answer with: the app tries GitHub next, so a bad minute here costs an update check, not an update.
    return new NextResponse(null, { status: 503 });
  }
  return new NextResponse(await manifest.text(), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "public, max-age=300" },
  });
}
