import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Code, House, MagnifyingGlass, Question } from "@phosphor-icons/react/ssr";
import { SiteHeader, docLinks } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getPageCopy } from "@/lib/copy";
import { SITE_URL } from "@/lib/site";
import { buttonClass } from "@/components/ui";

/**
 * The 404 page, for callers that wanted HTML. Anything that asked for Markdown never reaches here:
 * proxy.ts sends it to the Markdown mirror, which answers 404 with a Markdown body that says the
 * same things. Both versions link the indexes, because a dead end that names the way out costs a
 * person one click and an agent one request.
 */

export const metadata: Metadata = {
  title: "Page not found",
  description: "That path does not exist on helicon.sh. Every page is listed in the sitemap and in llms.txt.",
  robots: { index: false, follow: true },
};

const ROUTES = [
  { href: "/", label: "Home", body: "What Helicon is, with a live demo of the app.", icon: House },
  { href: "/guides", label: "Guides", body: "One task per page, with the steps and the failure modes.", icon: BookOpen },
  { href: "/faq", label: "FAQ", body: "Every question this site answers, on one page.", icon: Question },
  { href: "/developers", label: "Developers", body: "The public JSON API, the OpenAPI spec and the Markdown mirrors.", icon: Code },
  { href: "/llms.txt", label: "llms.txt", body: "The index of every page, written for machines.", icon: MagnifyingGlass },
];

export default function NotFound() {
  const copy = getPageCopy("other");
  return (
    <div className="page-frame relative mx-auto min-h-dvh w-full max-w-[1200px] border-line bg-bg max-[360px]:border-x-0 min-[361px]:w-[calc(100%-1rem)] min-[361px]:border-x sm:w-[calc(100%-3rem)] pb-[env(safe-area-inset-bottom)]">
      <SiteHeader copy={copy} nav={docLinks} homeHref="/" />
      <main id="main" className="relative z-0 px-6 py-20 sm:px-12 sm:py-28">
        <p className="font-mono text-[13px] tracking-[0.08em] text-subtle uppercase">Error 404</p>
        <h1 className="mt-4 max-w-[18ch] font-headline text-[clamp(2rem,4.4vw,3.25rem)] leading-[1.05] font-semibold tracking-[-0.02em] text-fg">
          That page does not exist
        </h1>
        <p className="mt-5 max-w-[60ch] text-[15px] leading-relaxed text-muted sm:text-[17px]">
          Nothing was removed: this site has never published that path. The link that brought you here is
          probably old, or has a typo in it. Everything that does exist is listed in the{" "}
          <a className="underline underline-offset-4" href="/sitemap.xml">
            sitemap
          </a>{" "}
          and in{" "}
          <a className="underline underline-offset-4" href="/llms.txt">
            llms.txt
          </a>
          .
        </p>

        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ROUTES.map(({ href, label, body, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex h-full flex-col gap-2 rounded-xl border border-line bg-sunken/40 p-4 transition-colors hover:bg-sunken"
              >
                <span className="flex items-center gap-2 text-[15px] font-semibold text-fg">
                  <Icon aria-hidden="true" className="size-4 text-subtle" />
                  {label}
                </span>
                <span className="text-[14px] leading-relaxed text-muted">{body}</span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/" className={buttonClass("primary", "md")}>
            Back to the home page
          </Link>
          <Link href="/contact" className={buttonClass("outline", "md")}>
            Tell us about the broken link
          </Link>
        </div>

        <p className="mt-10 max-w-[60ch] text-[14px] leading-relaxed text-subtle">
          Asking for Markdown? Send <code>Accept: text/markdown</code> to any path on {SITE_URL}, or append{" "}
          <code>.md</code> to it. A path that does not exist answers 404 with a Markdown body rather than this page.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
