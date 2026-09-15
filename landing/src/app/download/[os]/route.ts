import { NextResponse } from "next/server";
import { track } from "@/lib/analytics";
import { latestInstaller, type InstallerKind } from "@/lib/github-release";
import { ANON_COOKIE } from "@/lib/os";
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
  const cookie = request.headers.get("cookie") ?? "";
  const distinct =
    cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${ANON_COOKIE}=`))
      ?.slice(ANON_COOKIE.length + 1) ?? "anonymous";

  await track(
    "installer_download",
    {
      os: kind,
      src,
      asset: asset?.name ?? null,
      version: asset?.version ?? null,
      referrer: request.headers.get("referer") ?? null,
      user_agent: request.headers.get("user-agent") ?? null,
    },
    distinct,
  );

  if (!asset) {
    return NextResponse.redirect(RELEASES_URL, 302);
  }

  return NextResponse.redirect(asset.url, 302);
}
