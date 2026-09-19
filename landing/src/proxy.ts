import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ANON_COOKIE, VISITOR_OS_HEADER, parseVisitorOs } from "@/lib/os";
import { SITE_URL } from "@/lib/site";

/**
 * Paths that already serve their own plain-text or Markdown document. They must not be rewritten
 * into the Markdown mirror, or /agents.md would start answering with a mirror of a page.
 */
const OWN_TEXT_ROUTES = new Set(["/agents.md", "/llms.txt", "/llms-full.txt"]);

/** True when the caller would rather have Markdown than HTML. */
function prefersMarkdown(accept: string | null) {
  if (!accept) return false;
  const wantsMarkdown = /text\/markdown/i.test(accept);
  if (!wantsMarkdown) return false;
  // An HTML-first browser sends text/html before anything else; only rewrite when it does not.
  return !/text\/html/i.test(accept);
}

export function proxy(request: NextRequest) {
  const url = request.nextUrl;

  // `<path>.md` and an explicit `Accept: text/markdown` both resolve to the Markdown mirror.
  if (!OWN_TEXT_ROUTES.has(url.pathname)) {
    if (url.pathname.endsWith(".md")) {
      const target = url.pathname.slice(0, -3);
      return NextResponse.rewrite(new URL(`/md${target}`, request.url));
    }
    if (url.pathname !== "/" && !url.pathname.startsWith("/md/") && prefersMarkdown(request.headers.get("accept"))) {
      return NextResponse.rewrite(new URL(`/md${url.pathname.replace(/\/$/, "")}`, request.url));
    }
  }

  const platform = request.headers.get("sec-ch-ua-platform")?.replaceAll('"', "");
  const mobileHeader = request.headers.get("sec-ch-ua-mobile");
  const os = parseVisitorOs(request.headers.get("user-agent") ?? "", {
    platform: platform ?? undefined,
    mobile: mobileHeader === "?1" ? true : mobileHeader === "?0" ? false : undefined,
  });
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(VISITOR_OS_HEADER, os);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Vary", "User-Agent, Sec-CH-UA-Platform, Sec-CH-UA-Mobile, Accept");

  // Point every HTML page at its own machine-readable twin, the way an Atom feed used to be
  // advertised. Agents that honour Link headers can take the Markdown without a second guess.
  // Paths that already are a document (anything with an extension) and the API get nothing.
  const clean = url.pathname.replace(/\/$/, "");
  const isDocument = /\.[a-z0-9]+$/i.test(clean) || clean.startsWith("/api") || clean.startsWith("/download");
  if (url.pathname === "/") {
    response.headers.set(
      "Link",
      `<${SITE_URL}/llms.txt>; rel="alternate"; type="text/plain", <${SITE_URL}/llms-full.txt>; rel="alternate"; type="text/plain"`,
    );
  } else if (!isDocument) {
    response.headers.set("Link", `<${SITE_URL}${clean}.md>; rel="alternate"; type="text/markdown"`);
  }
  response.headers.set("Accept-CH", "Sec-CH-UA-Platform, Sec-CH-UA-Mobile");

  const anon = request.cookies.get(ANON_COOKIE)?.value ?? crypto.randomUUID();
  response.cookies.set(ANON_COOKIE, anon, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets/|.*\\.(?:png|svg|ico|txt|xml|webmanifest)$).*)"],
};
