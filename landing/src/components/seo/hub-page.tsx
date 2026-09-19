import { ArrowRight } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AnswerBlock, Breadcrumbs, PageCta } from "./doc-page";
import { DocShell } from "./doc-shell";
import { IconTile } from "./icons";
import { Rule, bandX, cn } from "../ui";
import { pagesInSection, sectionBySlug } from "@/lib/seo/catalog";
import { jsonLd, sectionGraph } from "@/lib/seo/schema";
import { latestRelease } from "@/lib/github-release";
import type { SeoPage } from "@/lib/seo/types";

export function PageCards({ pages }: { pages: SeoPage[] }) {
  return (
    <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {pages.map((page) => (
        <li key={page.slug} className="rounded-xl shadow-[inset_0_0_0_1px_var(--border)]">
          <Link
            href={`/${page.slug}`}
            className="group flex h-full flex-col gap-3 rounded-xl p-5 transition-colors hover:bg-sunken sm:p-6"
          >
            <span className="flex items-center gap-3">
              <IconTile name={page.icon} />
              <span className="flex items-center gap-1.5 font-headline text-[17px] font-semibold text-fg">
                {page.label}
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 text-subtle transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </span>
            </span>
            <span className="text-[14px] leading-relaxed text-muted">{page.description}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export async function SectionHubRoute({ slug }: { slug: string }) {
  const section = sectionBySlug(slug);
  if (!section) notFound();
  const pages = pagesInSection(section.id);
  const release = await latestRelease();
  const version = release?.version ?? null;

  return (
    <DocShell version={version} jsonLdString={jsonLd(sectionGraph(section, pages, version))}>
      <div className={cn(bandX, "py-10 sm:py-14")}>
        <Breadcrumbs trail={[{ name: section.label, slug: section.slug }]} />
        <IconTile name={section.icon} lead className="mt-6" />
        <h1 className="mt-4 max-w-[20ch] font-headline text-[clamp(2rem,4.6vw,3.25rem)] leading-[1.05] font-semibold tracking-[-0.02em] text-fg">
          {section.h1}
        </h1>
        <AnswerBlock>{section.answer}</AnswerBlock>
        <p className="mt-5 max-w-[62ch] text-[15.5px] leading-[1.7] text-muted sm:text-[16.5px]">{section.intro}</p>
        <PageCards pages={pages} />
        <PageCta
          title="Same Muse Code. Same subscription. Better interface."
          body="Free and MIT licensed. Signed Windows installer, universal macOS DMG, and a web build against a daemon you run."
        />
      </div>
      <Rule />
    </DocShell>
  );
}
