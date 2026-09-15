import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ANON_COOKIE, VISITOR_OS_HEADER, parseVisitorOs } from "@/lib/os";

export function proxy(request: NextRequest) {
  const platform = request.headers.get("sec-ch-ua-platform")?.replaceAll('"', "");
  const mobileHeader = request.headers.get("sec-ch-ua-mobile");
  const os = parseVisitorOs(request.headers.get("user-agent") ?? "", {
    platform: platform ?? undefined,
    mobile: mobileHeader === "?1" ? true : mobileHeader === "?0" ? false : undefined,
  });
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(VISITOR_OS_HEADER, os);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Vary", "User-Agent, Sec-CH-UA-Platform, Sec-CH-UA-Mobile");
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
