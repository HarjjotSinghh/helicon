import { ArrowUpRight, Key, Receipt, Scales, Database, Sparkle, Monitor } from "@phosphor-icons/react/ssr";
import { RELEASES_URL } from "@/lib/site";
import type { PageCopy } from "@/lib/copy";
import { DemoVideo } from "./demo-video";
import { CtaRow } from "./cta-row";
import { TrackedLink } from "./tracked-link";
import { CellGrid, Rule, bandX } from "./ui";

const facts = [
  { icon: Scales, title: "MIT licensed", body: "Free, no paid tier" },
  { icon: Receipt, title: "No second bill", body: "Runs on your Muse plan" },
  { icon: Key, title: "Your own login", body: "Credentials stay in muse" },
  { icon: Database, title: "Local state", body: "SQLite on your machine" },
];

const windowsFacts = [
  { icon: Monitor, title: "Signed for Windows", body: "Installer with auto-update" },
  { icon: Receipt, title: "No second bill", body: "Runs on your Muse plan" },
  { icon: Key, title: "Your own login", body: "Credentials stay in muse" },
  { icon: Database, title: "WSL2 handled", body: "Sidecar + path translation" },
];

export function Hero({ copy, version, notesUrl }: { copy: PageCopy; version: string | null; notesUrl: string }) {
  const shown = copy.audience === "windows" ? windowsFacts : facts;
  const badge = version ? `v${version}` : "Latest";
  return (
    <div id="top">
      <div className={`${bandX} pt-14 pb-12 sm:pt-20 sm:pb-16 lg:pt-24`}>
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
            {badge}
          </span>
          Read the release notes
          <ArrowUpRight
            aria-hidden="true"
            className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </TrackedLink>

        <h1
          className="mt-7 font-headline text-[clamp(2.6rem,6.6vw,5.25rem)] leading-[1] font-semibold tracking-[-0.02em] text-fg max-[359px]:text-[2.2rem]"
        >
          {copy.headlineContinue ? (
            <>
              <span className="block">{copy.headline}</span>
              <span className="block">{copy.headlineContinue}</span>
            </>
          ) : (
            copy.headline
          )}
        </h1>

        <div
          className="mt-8 grid gap-7 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-12"
        >
          <div>
            <p data-hero-lead className="text-[clamp(1.0625rem,0.8rem+0.7vw,1.25rem)] leading-snug font-semibold text-balance text-fg">
              {copy.lead}
            </p>
            <p className="mt-2 max-w-[52ch] text-[15px] leading-[1.6] text-muted sm:text-[17px]">
              {copy.body}
            </p>
          </div>
          <CtaRow placement="hero" ctas={copy.ctas} />
        </div>
      </div>

      <Rule />

      <div id="demo">
        <DemoVideo
          src="/demo/a1.mp4"
          poster="/demo/a1.jpg"
          label="Helicon walkthrough: open a CLI thread, send a fix, then usage and settings"
        />
      </div>

      <Rule />

      <CellGrid className="min-[420px]:grid-cols-2 lg:grid-cols-4">
        {shown.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex items-start gap-3 bg-bg px-5 py-6 sm:px-8">
            <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-tint text-accent-text">
              <Icon aria-hidden="true" className="size-[18px]" weight="duotone" />
            </span>
            <span>
              <span className="block text-[15px] font-semibold text-fg">{title}</span>
              <span className="block text-[14px] text-subtle">{body}</span>
            </span>
          </div>
        ))}
      </CellGrid>
    </div>
  );
}
