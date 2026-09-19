import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { markdownRewriteTarget } from "@/lib/markdown-negotiation";
import { ANON_COOKIE, VISITOR_OS_HEADER, parseVisitorOs } from "@/lib/os";
import { SITE_URL } from "@/lib/site";

export function proxy(request: NextRequest) {
  const url = request.nextUrl;

  // `<path>.md` and an explicit `Accept: text/markdown` both resolve to the Markdown mirror, the
  // home page included: an agent handed nothing but helicon.sh still has to be able to ask that
  // URL for Markdown. The rules live in lib/markdown-negotiation.ts so that they can be tested.
  const markdownTarget = markdownRewriteTarget(url.pathname, request.headers.get("accept"));
  if (markdownTarget) return NextResponse.rewrite(new URL(markdownTarget, request.url));

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
  // append, never set: Next puts its font preloads in this same header on statically generated
  // pages, and replacing it costs several seconds of LCP on a throttled connection.
  if (url.pathname === "/") {
    response.headers.append("Link", `<${SITE_URL}/index.md>; rel="alternate"; type="text/markdown"`);
    response.headers.append("Link", `<${SITE_URL}/llms.txt>; rel="alternate"; type="text/plain"`);
    response.headers.append("Link", `<${SITE_URL}/llms-full.txt>; rel="alternate"; type="text/plain"`);
    response.headers.append("Link", `<${SITE_URL}/openapi.json>; rel="service-desc"; type="application/json"`);
  } else if (!isDocument) {
    response.headers.append("Link", `<${SITE_URL}${clean}.md>; rel="alternate"; type="text/markdown"`);
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
