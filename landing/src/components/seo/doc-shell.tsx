import type { ReactNode } from "react";
import { SiteHeader, docLinks } from "../site-header";
import { PlatformHeaderCta } from "./platform-cta";
import { SiteFooter } from "../site-footer";
import { getPageCopy } from "@/lib/copy";

/**
 * The frame every generated page shares. It uses the default (non Windows) copy so the page can
 * be statically generated: the visitor specific pitch belongs on the home page, which is dynamic.
 */


export function DocShell({
  children,
  jsonLdString,
}: {
  children: ReactNode;
  version: string | null;
  jsonLdString: string;
}) {
  const copy = getPageCopy("other");
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-btn px-4 py-2 font-medium text-btn-fg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <div className="page-frame relative mx-auto min-h-dvh w-full max-w-[1200px] border-line bg-bg max-[360px]:border-x-0 min-[361px]:w-[calc(100%-1rem)] min-[361px]:border-x sm:w-[calc(100%-3rem)] pb-[env(safe-area-inset-bottom)]">
        <SiteHeader copy={copy} nav={docLinks} homeHref="/" cta={<PlatformHeaderCta />} />
        <main id="main" className="relative z-0">
          {children}
        </main>
        <SiteFooter />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString }} />
    </>
  );
}
