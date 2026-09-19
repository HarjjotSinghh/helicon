import { ArrowRight, CaretRight, FileText, ListBullets } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { Blocks, Inline, Steps, headingId, headingsOf } from "./blocks";
import { DocShell } from "./doc-shell";
import { Rule, bandX, buttonClass, cn } from "../ui";
import { relatedPages, sectionById } from "@/lib/seo/catalog";
import type { Faq, SeoPage } from "@/lib/seo/types";
import { installerPath } from "@/lib/downloads";
import { REPO_URL } from "@/lib/site";

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function Breadcrumbs({ trail }: { trail: { name: string; slug: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-[13px] text-subtle">
        <li>
          <Link href="/" className="rounded transition-colors hover:text-fg">
            Helicon
          </Link>
        </li>
        {trail.map((crumb, i) => {
          const last = i === trail.length - 1;
          return (
            <li key={crumb.slug} className="flex items-center gap-1.5">
              <CaretRight aria-hidden="true" className="size-3 text-subtle/70" />
              {last ? (
                <span aria-current="page" className="text-muted">
                  {crumb.name}
                </span>
              ) : (
                <Link href={`/${crumb.slug}`} className="rounded transition-colors hover:text-fg">
                  {crumb.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** The direct answer. Marked so the speakable schema and any extractor can find it. */
export function AnswerBlock({ children }: { children: string }) {
  return (
    <p
      data-answer
      className="mt-6 max-w-[64ch] border-l-2 border-accent-text/40 pl-5 text-[17px] leading-[1.65] font-medium text-fg sm:text-[19px]"
    >
      <Inline text={children} />
    </p>
  );
}

export function FaqList({
  faqs,
  heading = "Frequently asked questions",
  id = "page-faq",
}: {
  faqs: Faq[];
  heading?: string;
  id?: string;
}) {
  return (
    <section aria-labelledby={id} className="mt-14">
      <h2 id={id} className="scroll-mt-28 font-headline text-[clamp(1.375rem,2.6vw,1.75rem)] font-semibold tracking-[-0.012em] text-fg">
        {heading}
      </h2>
      <div className="mt-5 divide-y divide-line border-y border-line">
        {faqs.map((faq) => (
          <details key={faq.q} name={id} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[15.5px] font-medium text-fg [&::-webkit-details-marker]:hidden sm:text-[16.5px]">
              <span className="transition-colors group-hover:text-accent-text">{faq.q}</span>
              <span
                aria-hidden="true"
                className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-sunken text-muted transition-transform duration-300 group-open:rotate-90"
              >
                <CaretRight weight="bold" className="size-3.5" />
              </span>
            </summary>
            <p className="mt-3 max-w-[66ch] text-[15.5px] leading-[1.7] text-muted sm:pr-12">
              <Inline text={faq.a} />
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function RelatedGrid({ pages, title = "Keep reading" }: { pages: { slug: string; label: string; description: string }[]; title?: string }) {
  if (!pages.length) return null;
  return (
    <section aria-labelledby="related" className="mt-14">
      <h2 id="related" className="font-headline text-[clamp(1.375rem,2.6vw,1.75rem)] font-semibold tracking-[-0.012em] text-fg">
        {title}
      </h2>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {pages.map((page) => (
          <li key={page.slug} className="rounded-xl shadow-[inset_0_0_0_1px_var(--border)]">
            <Link
              href={`/${page.slug}`}
              className="group flex h-full flex-col gap-1.5 rounded-xl p-4 transition-colors hover:bg-sunken sm:p-5"
            >
              <span className="flex items-center gap-1.5 text-[15px] font-medium text-fg">
                {page.label}
                <ArrowRight
                  aria-hidden="true"
                  className="size-3.5 text-subtle transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </span>
              <span className="text-[13.5px] leading-relaxed text-muted">{page.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PageCta({ title, body }: { title: string; body: string }) {
  return (
    <section aria-labelledby="page-cta" className="mt-16 rounded-2xl bg-sunken px-5 py-8 shadow-[inset_0_0_0_1px_var(--border)] sm:px-8 sm:py-10">
      <h2 id="page-cta" className="max-w-[24ch] font-headline text-[clamp(1.5rem,3vw,2rem)] leading-tight font-semibold tracking-[-0.015em] text-fg">
        {title}
      </h2>
      <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-muted sm:text-[16px]">{body}</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link href={installerPath("windows", "doc-cta")} className={buttonClass("primary", "md")}>
          Download for Windows
        </Link>
        <Link href="/install" className={buttonClass("outline", "md")}>
          All platforms
        </Link>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass("ghost", "md")}
        >
          View source
        </a>
      </div>
    </section>
  );
}

function Toc({ page }: { page: SeoPage }) {
  const headings = headingsOf(page.blocks);
  if (headings.length < 3) return null;
  return (
    <nav aria-labelledby="toc-title" className="xl:sticky xl:top-28">
      <h2 id="toc-title" className="flex items-center gap-2 text-[13px] font-semibold text-fg">
        <ListBullets aria-hidden="true" className="size-4 text-subtle" />
        On this page
      </h2>
      <ol className="mt-3 space-y-1.5 border-l border-line pl-4">
        {headings.map((heading) => (
          <li key={heading.text}>
            <a
              href={`#${headingId(heading.text)}`}
              className="block text-[13.5px] leading-snug text-muted transition-colors hover:text-fg"
            >
              {heading.text}
            </a>
          </li>
        ))}
        {page.faqs?.length ? (
          <li>
            <a href="#page-faq" className="block text-[13.5px] leading-snug text-muted transition-colors hover:text-fg">
              Frequently asked questions
            </a>
          </li>
        ) : null}
      </ol>
      <a
        href={`/${page.slug}.md`}
        className="mt-6 inline-flex items-center gap-1.5 text-[13px] text-subtle transition-colors hover:text-fg"
      >
        <FileText aria-hidden="true" className="size-4" />
        Read as Markdown
      </a>
    </nav>
  );
}

export function DocPage({
  page,
  version,
  trail,
  jsonLdString,
}: {
  page: SeoPage;
  version: string | null;
  trail: { name: string; slug: string }[];
  jsonLdString: string;
}) {
  const section = sectionById(page.section);
  const related = relatedPages(page);
  const hasToc = headingsOf(page.blocks).length >= 3;

  return (
    <DocShell jsonLdString={jsonLdString} version={version}>
      <article className={cn(bandX, "py-10 sm:py-14")}>
        <Breadcrumbs trail={trail} />
        {section ? (
          <p className="mt-6 text-[13px] font-semibold tracking-[0.08em] text-accent-text uppercase">
            {page.ogEyebrow ?? section.label}
          </p>
        ) : null}
        <h1 className="mt-2 max-w-[22ch] font-headline text-[clamp(2rem,4.6vw,3.25rem)] leading-[1.05] font-semibold tracking-[-0.02em] text-fg">
          {page.h1}
        </h1>
        <AnswerBlock>{page.answer}</AnswerBlock>
        <p className="mt-5 text-[13px] text-subtle">
          Last updated <time dateTime={page.updated}>{formatDate(page.updated)}</time>
          {" · "}
          <a href={`/${page.slug}.md`} className="underline decoration-line-strong underline-offset-4 hover:text-fg">
            Markdown version
          </a>
        </p>

        <div className={cn("mt-12", hasToc && "xl:grid xl:grid-cols-[minmax(0,1fr)_14rem] xl:gap-12")}>
          <div className="min-w-0">
            <Blocks blocks={page.blocks} />
            {page.howTo ? (
              <section aria-labelledby="howto" className="mt-12">
                <h2 id="howto" className="scroll-mt-28 font-headline text-[clamp(1.375rem,2.6vw,1.75rem)] font-semibold tracking-[-0.012em] text-fg">
                  {page.howTo.name}
                </h2>
                <Steps steps={page.howTo.steps} />
              </section>
            ) : null}
            {page.faqs?.length ? <FaqList faqs={page.faqs} /> : null}
            <RelatedGrid pages={related} />
            <PageCta
              title="Same Muse Code. Same subscription. Better interface."
              body="Free and MIT licensed. Signed Windows installer, universal macOS DMG, and a web build against a daemon you run."
            />
          </div>
          {hasToc ? <aside className="mt-12 hidden xl:mt-0 xl:block">{<Toc page={page} />}</aside> : null}
        </div>
      </article>
      <Rule />
    </DocShell>
  );
}
