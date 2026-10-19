import {
  AppWindow,
  ArrowUpRight,
  Browsers,
  ChartBar,
  ChatsCircle,
  Command,
  Database,
  DownloadSimple,
  FolderSimple,
  GearSix,
  GitDiff,
  HardDrives,
  House,
  Key,
  Lightning,
  Plus,
  Question,
  Receipt,
  Scales,
  ShieldCheck,
  Sparkle,
  SquaresFour,
  TerminalWindow,
} from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { DemoApp } from "@/demo/demo-app";
import { installerPath } from "@/lib/downloads";
import { localePath, type Locale } from "@/lib/i18n";
import type { HomeCopy } from "@/lib/i18n-copy";
import { RELEASES_URL, REPO_URL } from "@/lib/site";
import { AppTour, type TourShot } from "./app-tour";
import { CtaRow } from "./cta-row";
import { DemoVideo } from "./demo-video";
import { LanguageSwitcher } from "./language-switcher";
import { MobileNav } from "./mobile-nav";
import { GitHubLogo } from "./os-logos";
import { ThemeToggle } from "./theme-toggle";
import { TrackedLink } from "./tracked-link";
import { CellGrid, Logo, Rule, SectionHeading, bandX, buttonClass } from "./ui";

const FACT_ICONS = [Scales, Receipt, Key, Database];
const FEATURE_ICONS = [FolderSimple, GitDiff, ShieldCheck, ChartBar, Command, Browsers];
const NODE_ICONS = [AppWindow, HardDrives, TerminalWindow];

/**
 * The home page in another language. It carries the same claims as the English home, in the same
 * order, but only the sections that stand on their own: the comparison table and the long-form
 * links stay on the English site, which the footer points to. Static, so it has no OS detection
 * and offers every installer.
 */
export function LocaleHome({
  locale,
  copy,
  version,
  notesUrl,
  stars,
}: {
  locale: Locale;
  copy: HomeCopy;
  version: string | null;
  notesUrl: string;
  stars: number | null;
}) {
  const nav = [
    { href: "#tour", label: copy.nav.tour },
    { href: "#features", label: copy.nav.features },
    { href: "#how", label: copy.nav.how },
    { href: "#install", label: copy.nav.install },
    { href: "#faq", label: copy.nav.faq },
  ];
  const src = `home_${locale}`;
  const downloads = [
    { label: copy.hero.download.windows, href: installerPath("windows", src), kind: "primary" as const },
    { label: copy.hero.download.macos, href: installerPath("macos", src), kind: "outline" as const },
  ];
  const view = (route: string, label: string, palette = false) => (
    <DemoApp route={route} palette={palette} label={label} />
  );
  const s = copy.tour.shots;
  const shots: TourShot[] = [
    { id: "thread", label: s.thread.label, title: s.thread.label, body: s.thread.body, icon: <ChatsCircle weight="duotone" />, view: view("#/t/api-paginate", s.thread.label) },
    { id: "usage", label: s.usage.label, title: s.usage.label, body: s.usage.body, icon: <ChartBar weight="duotone" />, view: view("#/usage", s.usage.label) },
    { id: "home", label: s.home.label, title: s.home.label, body: s.home.body, icon: <House weight="duotone" />, view: view("", s.home.label) },
    { id: "palette", label: s.palette.label, title: s.palette.label, body: s.palette.body, icon: <Command weight="duotone" />, view: view("#/t/readme-oneliner", s.palette.label, true) },
    { id: "settings", label: s.settings.label, title: s.settings.label, body: s.settings.body, icon: <GearSix weight="duotone" />, view: view("#/settings", s.settings.label) },
  ];

  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-btn px-4 py-2 font-medium text-btn-fg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {copy.ui.skip}
      </a>
      <div className="page-frame relative mx-auto min-h-dvh w-full max-w-[1200px] border-line bg-bg max-[360px]:border-x-0 min-[361px]:w-[calc(100%-1rem)] min-[361px]:border-x sm:w-[calc(100%-3rem)] pb-[env(safe-area-inset-bottom)]">
        <header className="sticky top-0 z-[210] isolate bg-bg/85 pt-[env(safe-area-inset-top)] backdrop-blur-md backdrop-saturate-150 supports-[not(backdrop-filter:blur(1px))]:bg-bg">
          <div className="relative flex h-14 items-center gap-3 px-4 sm:h-16 sm:gap-4 sm:px-8 lg:px-12">
            <a
              href={localePath(locale, "/")}
              className="-mx-1 flex min-h-11 items-center gap-2 rounded-lg px-1 py-1 text-fg sm:-mx-1.5 sm:gap-2.5 sm:px-1.5"
              aria-label={copy.ui.home}
            >
              <Logo size={28} />
              <span className="hidden font-headline text-[18px] font-semibold min-[420px]:inline">Helicon</span>
            </a>
            <nav aria-label={copy.ui.sections} className="ml-6 hidden items-center gap-1 lg:flex max-xl:ml-2 max-xl:gap-0">
              {nav.map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  className="flex h-9 items-center rounded-lg px-3 text-[14px] font-medium whitespace-nowrap text-muted transition-colors hover:bg-sunken hover:text-fg max-xl:px-2.5"
                >
                  {label}
                </a>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-1.5">
              <LanguageSwitcher current={locale} path="/" label={copy.ui.language} />
              <ThemeToggle className="max-sm:hidden" labels={copy.ui.theme} />
              <TrackedLink
                href={REPO_URL}
                placement="header"
                eventLabel="GitHub"
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass("ghost", "icon", "max-sm:hidden")}
                aria-label={copy.ui.github}
                title={copy.ui.github}
              >
                <GitHubLogo aria-hidden="true" />
              </TrackedLink>
              <MobileNav
                links={[...nav, { href: REPO_URL, label: "GitHub" }]}
                labels={{ open: copy.ui.openMenu, close: copy.ui.closeMenu, panel: copy.ui.sections }}
              />
            </div>
          </div>
          <Rule />
        </header>

        <main id="main" className="relative z-0">
          <div id="top">
            <div className={`${bandX} py-12 sm:py-16`}>
              <TrackedLink
                href={notesUrl || RELEASES_URL}
                placement="hero_badge"
                eventLabel="Read the release notes"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-full bg-surface p-1 pr-3 text-[13px] font-medium whitespace-nowrap text-muted shadow-soft transition-colors hover:text-fg"
              >
                <span className="inline-flex items-center gap-1 rounded-full bg-tint px-2 py-0.5 text-accent-text">
                  <Sparkle weight="fill" aria-hidden="true" className="size-3.5" />
                  {version ? `v${version}` : "Latest"}
                </span>
                {copy.hero.releaseNotes}
                <ArrowUpRight aria-hidden="true" className="size-3.5" />
              </TrackedLink>

              <h1 className="mt-7 max-w-[16em] font-headline text-[clamp(2rem,4.8vw,3.75rem)] leading-[1.12] font-semibold tracking-[-0.01em] text-balance text-fg">
                {copy.hero.headline}
              </h1>

              <div className="mt-8 grid gap-7 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-12">
                <div>
                  <p className="text-[clamp(1.0625rem,0.8rem+0.7vw,1.25rem)] leading-snug font-semibold text-balance text-fg">
                    {copy.hero.lead}
                  </p>
                  <p className="mt-2 max-w-[52ch] text-[15px] leading-[1.7] text-muted sm:text-[17px]">{copy.hero.body}</p>
                </div>
                <div>
                  <CtaRow placement={`hero_${locale}`} ctas={downloads} stars={stars} />
                  <p className="mt-3 text-[13px] leading-snug text-muted">
                    <TrackedLink
                      href="/try"
                      placement={`hero_try_${locale}`}
                      eventLabel="Try it in your browser"
                      className="font-medium text-accent-text underline-offset-4 hover:underline"
                    >
                      {copy.hero.tryInBrowser}
                    </TrackedLink>
                    <span aria-hidden="true"> · </span>
                    {copy.hero.unofficial}
                  </p>
                </div>
              </div>
            </div>

            <Rule />

            <div id="demo">
              <DemoVideo
                src="/demo/launch.mp4"
                poster={{ light: "/demo/launch-poster-light.jpg", dark: "/demo/launch-poster-dark.jpg" }}
                label={copy.videoLabel}
                labels={copy.ui.player}
              />
            </div>

            <Rule />

            <CellGrid className="min-[420px]:grid-cols-2 lg:grid-cols-4">
              {copy.hero.facts.map(({ title, body }, i) => {
                const Icon = FACT_ICONS[i];
                return (
                  <div key={title} className="flex items-start gap-3 bg-bg px-5 py-6 sm:px-8">
                    <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-tint text-accent-text">
                      <Icon aria-hidden="true" className="size-[18px]" weight="duotone" />
                    </span>
                    <span>
                      <span className="block text-[15px] font-semibold text-fg">{title}</span>
                      <span className="block text-[14px] text-subtle">{body}</span>
                    </span>
                  </div>
                );
              })}
            </CellGrid>
          </div>

          <Rule />

          <AppTour shots={shots} title={copy.tour.title} intro={copy.tour.intro} tabsLabel={copy.tour.tabs} />

          <Rule />

          <section id="features" aria-labelledby="features-title">
            <div data-reveal="rise" className={`${bandX} py-14 sm:py-20`}>
              <SectionHeading id="features-title" icon={<SquaresFour weight="duotone" />} title={copy.features.title}>
                {copy.features.intro}
              </SectionHeading>
            </div>
            <Rule />
            <CellGrid className="sm:grid-cols-2 lg:grid-cols-3">
              {copy.features.items.map(({ title, body }, i) => {
                const Icon = FEATURE_ICONS[i];
                return (
                  <article key={title} data-reveal className="bg-bg p-6 sm:p-8">
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="inline-flex size-9 items-center justify-center rounded-[10px] bg-tint text-accent-text"
                      >
                        <Icon weight="duotone" className="size-[18px]" />
                      </span>
                      <h3 className="font-headline text-[19px] leading-tight font-semibold text-fg">{title}</h3>
                    </div>
                    <p className="mt-3 max-w-[48ch] text-[15px] leading-[1.7] text-muted">{body}</p>
                  </article>
                );
              })}
            </CellGrid>
          </section>

          <Rule />

          <section id="how" aria-labelledby="how-title">
            <CellGrid className="lg:grid-cols-2">
              <div className="bg-bg px-5 py-14 sm:px-8 sm:py-20 lg:px-12">
                <SectionHeading id="how-title" icon={<Lightning weight="duotone" />} title={copy.how.title} />
                <p className="mt-5 max-w-[56ch] text-[15px] leading-[1.75] text-muted sm:text-[17px]">{copy.how.body}</p>
              </div>
              <div className="flex flex-col justify-center bg-[color-mix(in_oklab,var(--bg-sidebar)_40%,var(--bg))] px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
                <ol data-stagger="105" data-base="160" className="flex flex-col gap-3">
                  {copy.how.nodes.map(({ title, detail }, i) => {
                    const Icon = NODE_ICONS[i];
                    return (
                      <li
                        key={title}
                        data-reveal="scale"
                        className="flex items-center gap-4 rounded-2xl bg-surface px-4 py-3.5 shadow-soft"
                      >
                        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-tint text-accent-text">
                          <Icon aria-hidden="true" weight="duotone" className="size-5" />
                        </span>
                        <span>
                          <span className={i === 2 ? "block font-mono text-[14px] font-semibold text-fg" : "block text-[15px] font-semibold text-fg"}>
                            {title}
                          </span>
                          <span className="block text-[13.5px] text-subtle">{detail}</span>
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </CellGrid>
          </section>

          <Rule />

          <section id="install" aria-labelledby="install-title">
            <div data-reveal="rise" className={`${bandX} py-14 sm:py-20`}>
              <SectionHeading id="install-title" icon={<DownloadSimple weight="duotone" />} title={copy.install.title}>
                {copy.install.intro}
              </SectionHeading>
              <CtaRow placement={`install_${locale}`} ctas={downloads} className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap" />
              <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[14.5px]">
                <li>
                  <Link href="/install/linux" hrefLang="en" className="font-medium text-accent-text underline-offset-4 hover:underline">
                    {copy.hero.download.linux}
                  </Link>
                </li>
                <li>
                  <Link href="/install/vscode" hrefLang="en" className="font-medium text-accent-text underline-offset-4 hover:underline">
                    {copy.install.vscode}
                  </Link>
                </li>
                <li>
                  <Link href="/install" hrefLang="en" className="font-medium text-accent-text underline-offset-4 hover:underline">
                    {copy.install.allOptions}
                  </Link>
                </li>
              </ul>
            </div>
          </section>

          <Rule />

          <section id="faq" aria-labelledby="faq-title">
            <CellGrid className="xl:grid-cols-[minmax(0,440px)_1fr]">
              <div className="bg-bg px-5 py-14 sm:px-8 sm:py-20 lg:px-12">
                <div className="xl:sticky xl:top-28">
                  <SectionHeading id="faq-title" icon={<Question weight="duotone" />} title={copy.faq.title}>
                    {copy.faq.intro}
                  </SectionHeading>
                </div>
              </div>
              <div className="divide-y divide-line bg-bg px-5 py-6 sm:px-8 lg:px-12 xl:py-14">
                {copy.faq.items.map(([q, a], i) => (
                  <details key={q} open={i === 0} className="group py-1">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-4 text-[15px] font-medium text-fg sm:text-[17px] [&::-webkit-details-marker]:hidden">
                      <h3 className="transition-colors group-hover:text-accent-text">{q}</h3>
                      <span
                        aria-hidden="true"
                        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-sunken text-muted transition-transform duration-300 group-open:rotate-45 group-open:bg-tint group-open:text-accent-text"
                      >
                        <Plus weight="bold" className="size-4" />
                      </span>
                    </summary>
                    <p className="pb-5 max-w-[64ch] text-[15px] leading-[1.75] text-muted">{a}</p>
                  </details>
                ))}
              </div>
            </CellGrid>
          </section>

          <Rule />

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
                className="mx-auto mt-7 max-w-[20ch] font-headline text-[clamp(1.875rem,4vw,3rem)] leading-[1.15] font-semibold text-balance text-fg"
              >
                {copy.closing.title}
              </h2>
              <p className="mx-auto mt-4 max-w-[48ch] text-[15px] leading-relaxed text-muted sm:text-[17px]">{copy.closing.body}</p>
              <div className="mt-8 flex justify-center">
                <CtaRow
                  placement={`closing_${locale}`}
                  ctas={[downloads[0], { label: copy.hero.viewSource, href: REPO_URL, kind: "outline", external: true }]}
                  stars={stars}
                  className="flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:w-auto sm:flex-row sm:flex-wrap sm:justify-center"
                />
              </div>
            </div>
          </section>

          <Rule />
        </main>

        <footer className="grid gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[1fr_auto] lg:px-12">
          <div>
            <div className="flex items-center gap-2.5">
              <Logo size={26} />
              <span className="font-headline text-[15px] font-semibold text-fg sm:text-[17px]">Helicon</span>
            </div>
            <p className="mt-4 max-w-[44ch] text-[14px] leading-relaxed text-subtle">{copy.footer.trademark}</p>
            <p className="mt-3 max-w-[44ch] text-[14px] leading-relaxed text-subtle">{copy.footer.englishNote}</p>
            <div className="mt-6 flex items-center gap-3 sm:hidden">
              <ThemeToggle labels={copy.ui.theme} />
            </div>
          </div>
          <div className="flex flex-col items-start gap-1">
            <LanguageSwitcher current={locale} path="/" label={copy.ui.language} align="left" className="-ml-2.5 mb-2" />
            {[
              { href: "/guides", label: copy.footer.guides },
              { href: "/faq", label: copy.footer.faq },
              { href: "/changelog", label: copy.footer.changelog },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                hrefLang="en"
                className={buttonClass("ghost", "sm", "-ml-3 h-10 font-normal sm:h-8")}
              >
                {label}
              </Link>
            ))}
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass("ghost", "sm", "-ml-3 h-10 gap-2 font-normal sm:h-8")}
            >
              <GitHubLogo aria-hidden="true" />
              GitHub
            </a>
          </div>
        </footer>
      </div>
    </>
  );
}
