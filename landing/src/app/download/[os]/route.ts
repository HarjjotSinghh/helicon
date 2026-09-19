import { NextResponse } from "next/server";
import { identityFromCookies, isBotRequest, track, visitorOsFromRequest } from "@/lib/analytics";
import { latestInstaller, type InstallerKind } from "@/lib/github-release";
import { RELEASES_URL } from "@/lib/site";

export const runtime = "nodejs";

function kindFromParam(value: string): InstallerKind | null {
  if (value === "windows" || value === "macos") return value;
  return null;
}

export async function GET(request: Request, context: { params: Promise<{ os: string }> }) {
  const { os } = await context.params;
  const kind = kindFromParam(os);
  const url = new URL(request.url);
  const src = url.searchParams.get("src") ?? "unknown";

  if (!kind) {
    return NextResponse.redirect(new URL("/#install", url.origin), 302);
  }

  const asset = await latestInstaller(kind);
  const { distinctId, sessionId } = identityFromCookies(request.headers.get("cookie"));

  // Crawlers follow these links from the site's own pages and never install anything, and each
  // arrives without a cookie, so counting them inflates downloads and the people behind them.
  // They still get the redirect: only the count refuses them.
  if (!isBotRequest(request)) {
    await track(
      "installer_download",
      {
        os: kind,
        installer_os: kind,
        visitor_os: visitorOsFromRequest(request),
        src,
        asset: asset?.name ?? null,
        version: asset?.version ?? null,
        referrer: request.headers.get("referer") ?? null,
        $current_url: url.toString(),
        ...(sessionId ? { $session_id: sessionId } : {}),
      },
      distinctId,
      request,
    );
  }

  if (!asset) {
    return NextResponse.redirect(RELEASES_URL, 302);
  }

  return NextResponse.redirect(asset.url, 302);
}
