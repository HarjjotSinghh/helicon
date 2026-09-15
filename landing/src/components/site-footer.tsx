import {
  ArrowUpRight,
  BookOpen,
  Bug,
  DownloadSimple,
  Heart,
  Question,
} from "@phosphor-icons/react/ssr";
import { ISSUES_URL, RELEASES_URL, REPO_URL } from "@/lib/site";
import { closingCta, type PageCopy } from "@/lib/copy";
import { GitHubLogo } from "./os-logos";
import { Logo, buttonClass } from "./ui";
import { ThemeToggle } from "./theme-toggle";
import { CtaRow } from "./cta-row";

export function ClosingCta({ copy }: { copy: PageCopy }) {
  const primary = closingCta(copy);
  return (
    <section aria-labelledby="cta-title">
      <div className="relative isolate overflow-hidden px-6 py-20 text-center sm:px-12 sm:py-28">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 -bottom-40 -z-10 mx-auto h-80 max-w-3xl rounded-full blur-3xl"
          style={{ background: "radial-gradient(closest-side, var(--glow), transparent)" }}
        />
        <div className="mx-auto w-fit">
          <Logo size={56} className="rounded-[14px] shadow-soft" />
        </div>
        <h2
          id="cta-title"
          className="mx-auto mt-7 max-w-[20ch] font-headline text-[clamp(2rem,4.4vw,3.25rem)] leading-[1.05] font-semibold tracking-[-0.02em] text-fg"
        >
          {copy.closingTitle}
        </h2>
        <p className="mx-auto mt-4 max-w-[48ch] text-[15px] leading-relaxed text-muted sm:text-[17px]">
          {copy.closingBody}
        </p>
        <div className="mt-8 flex justify-center">
          <CtaRow ctas={[primary, { label: "View source", href: REPO_URL, kind: "outline", external: true }]} className="flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:w-auto sm:flex-row sm:flex-wrap sm:justify-center" />
        </div>
      </div>
    </section>
  );
}

const groups = [
  {
    title: "Project",
    links: [
      { href: REPO_URL, label: "Source", icon: GitHubLogo, external: true },
      { href: RELEASES_URL, label: "Releases", icon: DownloadSimple, external: true },
      { href: ISSUES_URL, label: "Report an issue", icon: Bug, external: true },
    ],
  },
  {
    title: "On this page",
    links: [
      { href: "#features", label: "Features", icon: BookOpen, external: false },
      { href: "#install", label: "Install", icon: DownloadSimple, external: false },
      { href: "#faq", label: "FAQ", icon: Question, external: false },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer>
      <div className="grid gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1fr_auto] lg:px-12">
        <div className="max-w-[52ch]">
          <div className="flex items-center gap-2.5">
            <Logo size={26} />
            <span className="font-headline text-[15px] font-semibold text-fg sm:text-[17px]">Helicon</span>
          </div>
          <p className="mt-4 text-[14px] leading-relaxed text-subtle">
            An unofficial, community-built project. Not made, sponsored or endorsed by Meta. Muse Code is
            Meta&apos;s. MIT licensed.
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-subtle">
            Made with{" "}
            <Heart aria-label="care" weight="fill" className="inline size-3.5 align-[-2px] text-del-fg" /> by{" "}
            <a
              href="https://harjotrana.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-muted underline decoration-line-strong underline-offset-4 transition-colors hover:text-fg hover:decoration-current"
            >
              Harjot Singh Rana
            </a>{" "}
            and contributors.
          </p>
          <div className="mt-6 flex items-center gap-3 sm:hidden">
            <span className="text-[13px] font-semibold text-fg">Theme</span>
            <ThemeToggle />
          </div>
        </div>

        <div className="flex flex-wrap gap-12">
          {groups.map((g) => (
            <nav key={g.title} aria-label={g.title} data-reveal>
              <h2 className="text-[13px] font-semibold text-fg">{g.title}</h2>
              <ul className="mt-3 space-y-1">
                {g.links.map(({ href, label, icon: Icon, external }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target={external ? "_blank" : undefined}
                      rel={external ? "noopener noreferrer" : undefined}
                      className={buttonClass("ghost", "sm", "-ml-3 h-10 gap-2 font-normal sm:h-8")}
                    >
                      <Icon aria-hidden="true" className="text-subtle" />
                      {label}
                      {external ? (
                        <ArrowUpRight
                          aria-hidden="true"
                          className="!size-3 text-subtle transition-transform duration-200 ease-out [@media(hover:hover)]:group-hover/btn:translate-x-0.5 [@media(hover:hover)]:group-hover/btn:-translate-y-0.5"
                        />
                      ) : null}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      {/*
        Oversized wordmark: sized to the frame width with container units, cut through the middle
        by the footer edge, and faded from transparent at the top to solid at the cut.
      */}
      <svg aria-hidden="true" width="0" height="0" className="absolute">
        <filter id="wordmark-outline" colorInterpolationFilters="sRGB">
          {/* Grow the letters by 1px, keep only the new edge: a clean outline outside each glyph. */}
          {/* Firm up the glyph mask first, so no renderer can leave faint seams where contours overlap. */}
          <feComponentTransfer in="SourceAlpha" result="solid">
            <feFuncA type="linear" slope="3" intercept="-0.5" />
          </feComponentTransfer>
          <feMorphology in="SourceGraphic" operator="dilate" radius="1" result="grown" />
          <feComposite in="grown" in2="solid" operator="out" result="ring" />
          <feColorMatrix in="ring" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.3 0" result="outline" />
          <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.15 0" result="fill" />
          <feMerge>
            <feMergeNode in="fill" />
            <feMergeNode in="outline" />
          </feMerge>
        </filter>
      </svg>
      <div aria-hidden="true" className="@container overflow-hidden px-5 select-none sm:px-8 lg:px-12">
        <div data-reveal="wordmark" data-delay="130" className="wordmark-fade h-[14.3cqw] overflow-hidden">
          <p className="translate-y-[-4.27cqw] text-center font-headline text-[30.5cqw] leading-none font-semibold tracking-[-0.04em] whitespace-nowrap lowercase">
            Helicon
          </p>
        </div>
      </div>
    </footer>
  );
}
