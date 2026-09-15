import {
  DownloadSimple,
  GithubLogo,
  Lightning,
  MonitorPlay,
  Question,
  SquaresFour,
  TerminalWindow,
} from "@phosphor-icons/react/ssr";
import { REPO_URL } from "@/lib/site";
import type { PageCopy } from "@/lib/copy";
import { MobileNav } from "./mobile-nav";
import { ThemeToggle } from "./theme-toggle";
import { Logo, Rule, buttonClass } from "./ui";

const links = [
  { href: "#demo", label: "Demo", icon: MonitorPlay },
  { href: "#features", label: "Features", icon: SquaresFour },
  { href: "#how", label: "How it works", icon: Lightning },
  { href: "#install", label: "Install", icon: TerminalWindow },
  { href: "#faq", label: "FAQ", icon: Question },
];

export function SiteHeader({ copy }: { copy: PageCopy }) {
  return (
    <header className="sticky top-0 z-40 bg-bg/85 pt-[env(safe-area-inset-top)] backdrop-blur-md backdrop-saturate-150 supports-[not(backdrop-filter:blur(1px))]:bg-bg">
      <div className="relative flex h-14 items-center gap-2 px-3 sm:h-16 sm:gap-4 sm:px-8 lg:px-12">
        <a
          href="#top"
          className="-mx-1 flex min-h-11 items-center gap-2 rounded-lg px-1 py-1 text-fg sm:-mx-1.5 sm:gap-2.5 sm:px-1.5"
          aria-label="Helicon home"
        >
          <Logo size={28} />
          <span className="hidden font-headline text-[18px] font-semibold min-[420px]:inline">Helicon</span>
        </a>

        <nav aria-label="Primary" className="ml-6 hidden items-center gap-1 lg:flex">
          {links.map(({ href, label, icon: Icon }) => (
            <a
              key={href}
              href={href}
              className="flex h-9 items-center gap-2 rounded-lg px-3 text-[14px] font-medium text-muted transition-colors hover:bg-sunken hover:text-fg"
            >
              <Icon aria-hidden="true" className="size-4 text-subtle" />
              {label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
          <ThemeToggle />
          <a
            href={REPO_URL} target="_blank" rel="noopener noreferrer"
            className={buttonClass("ghost", "icon", "hidden sm:inline-flex")}
            aria-label="Helicon on GitHub"
            title="Helicon on GitHub"
          >
            <GithubLogo weight="bold" aria-hidden="true" />
          </a>
          <a href={copy.headerHref} className={buttonClass("primary", "sm", "ml-1 min-h-11 px-3 sm:ml-1.5")}>
            <DownloadSimple weight="bold" aria-hidden="true" />
            {copy.headerCta}
          </a>
          <MobileNav
            links={[
              ...links.map(({ href, label }) => ({ href, label })),
              { href: REPO_URL, label: "GitHub" },
            ]}
          />
        </div>
      </div>
      <Rule />
    </header>
  );
}
