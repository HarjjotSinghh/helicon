import {
  DownloadSimple,
  GithubLogo,
  Lightning,
  Question,
  SquaresFour,
  TerminalWindow,
} from "@phosphor-icons/react/ssr";
import { REPO_URL } from "@/lib/site";
import type { PageCopy } from "@/lib/copy";
import { ThemeToggle } from "./theme-toggle";
import { Logo, Rule, buttonClass } from "./ui";

const links = [
  { href: "#features", label: "Features", icon: SquaresFour },
  { href: "#how", label: "How it works", icon: Lightning },
  { href: "#install", label: "Install", icon: TerminalWindow },
  { href: "#faq", label: "FAQ", icon: Question },
];

export function SiteHeader({ copy }: { copy: PageCopy }) {
  return (
    <header className="sticky top-0 z-40 bg-bg/85 backdrop-blur-md backdrop-saturate-150 supports-[not(backdrop-filter:blur(1px))]:bg-bg">
      <div className="flex h-16 items-center gap-4 px-5 sm:px-8 lg:px-12">
        <a
          href="#top"
          className="-mx-1.5 flex items-center gap-2.5 rounded-lg px-1.5 py-1 text-fg"
          aria-label="Helicon home"
        >
          <Logo size={28} />
          <span className="font-headline text-[18px] font-semibold">Helicon</span>
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

        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          <a
            href={REPO_URL} target="_blank" rel="noopener noreferrer"
            className={buttonClass("ghost", "icon")}
            aria-label="Helicon on GitHub"
            title="Helicon on GitHub"
          >
            <GithubLogo weight="bold" aria-hidden="true" />
          </a>
          <a href={copy.headerHref} className={buttonClass("primary", "sm", "ml-1.5")}>
            <DownloadSimple weight="bold" aria-hidden="true" />
            {copy.headerCta}
          </a>
        </div>
      </div>
      <Rule />
    </header>
  );
}
