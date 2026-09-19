import type { ReactNode } from "react";
import { BookOpen, Bug, DownloadSimple, Question, SquaresFour } from "@phosphor-icons/react/ssr";
import { SiteHeader, docLinks } from "../site-header";
import { SiteFooter } from "../site-footer";
import { GitHubLogo } from "../os-logos";
import { getPageCopy } from "@/lib/copy";
import { ISSUES_URL, RELEASES_URL, REPO_URL } from "@/lib/site";

/**
 * The frame every generated page shares. It uses the default (non Windows) copy so the page can
 * be statically generated: the visitor specific pitch belongs on the home page, which is dynamic.
 */

const footerNav = [
  {
    title: "Project",
    links: [
      { href: REPO_URL, label: "Source", icon: GitHubLogo, external: true },
      { href: RELEASES_URL, label: "Releases", icon: DownloadSimple, external: true },
      { href: ISSUES_URL, label: "Report an issue", icon: Bug, external: true },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "/muse-code-gui", label: "Muse Code GUI", icon: SquaresFour, external: false },
      { href: "/features", label: "Features", icon: BookOpen, external: false },
      { href: "/compare", label: "Compare", icon: BookOpen, external: false },
      { href: "/guides", label: "Guides", icon: BookOpen, external: false },
    ],
  },
  {
    title: "More",
    links: [
      { href: "/install", label: "Install", icon: DownloadSimple, external: false },
      { href: "/use-cases", label: "Use cases", icon: BookOpen, external: false },
      { href: "/glossary", label: "Glossary", icon: BookOpen, external: false },
      { href: "/faq", label: "FAQ", icon: Question, external: false },
      { href: "/pricing", label: "Pricing", icon: BookOpen, external: false },
      { href: "/privacy", label: "Privacy", icon: BookOpen, external: false },
      { href: "/terms", label: "Terms", icon: BookOpen, external: false },
    ],
  },
];

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
        <SiteHeader copy={copy} nav={docLinks} homeHref="/" />
        <main id="main" className="relative z-0">
          {children}
        </main>
        <SiteFooter nav={footerNav} />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString }} />
    </>
  );
}
