import type { Metadata } from "next";
import { AnswerBlock, Breadcrumbs, FaqList, PageCta, RelatedGrid } from "@/components/seo/doc-page";
import { DocShell } from "@/components/seo/doc-shell";
import { Rule, bandX, cn } from "@/components/ui";
import { FAQ_PAGE_META, faqGroups } from "@/lib/seo/faq";
import { ogImagePath } from "@/lib/seo/metadata";
import { coreNodes, jsonLd, IDS } from "@/lib/seo/schema";
import { latestRelease } from "@/lib/github-release";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { pageBySlug } from "@/lib/seo/catalog";

const image = {
  url: ogImagePath(FAQ_PAGE_META.h1, FAQ_PAGE_META.description, "FAQ"),
  width: 1200,
  height: 630,
  alt: FAQ_PAGE_META.description,
};

export const metadata: Metadata = {
  title: FAQ_PAGE_META.title,
  description: FAQ_PAGE_META.description,
  keywords: FAQ_PAGE_META.keywords,
  alternates: {
    canonical: "/faq",
    types: { "text/markdown": [{ url: "/faq.md", title: "FAQ (Markdown)" }] },
  },
  openGraph: {
    type: "website",
    url: "/faq",
    siteName: SITE_NAME,
    title: FAQ_PAGE_META.title,
    description: FAQ_PAGE_META.description,
    images: [image],
  },
  twitter: { card: "summary_large_image", title: FAQ_PAGE_META.title, description: FAQ_PAGE_META.description, images: [image] },
};

export default async function Page() {
  const groups = faqGroups();
  const release = await latestRelease();
  const version = release?.version ?? null;
  const url = `${SITE_URL}/faq`;

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      ...coreNodes(version),
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "FAQ", item: url },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#page`,
        url,
        name: FAQ_PAGE_META.title,
        description: FAQ_PAGE_META.answer,
        inLanguage: "en",
        isPartOf: { "@id": IDS.website },
        about: { "@id": IDS.app },
        dateModified: FAQ_PAGE_META.updated,
        breadcrumb: { "@id": `${url}#breadcrumb` },
        speakable: { "@type": "SpeakableSpecification", cssSelector: ["[data-answer]"] },
        mainEntity: groups.flatMap((group) =>
          group.faqs.map((faq) => ({
            "@type": "Question",
            name: faq.q,
            acceptedAnswer: { "@type": "Answer", text: faq.a },
          })),
        ),
      },
    ],
  };

  const related = ["muse-code-gui", "muse-code-desktop-app", "pricing", "install/windows"]
    .map((slug) => pageBySlug(slug))
    .filter((page): page is NonNullable<typeof page> => Boolean(page));

  return (
    <DocShell version={version} jsonLdString={jsonLd(graph)}>
      <div className={cn(bandX, "py-10 sm:py-14")}>
        <Breadcrumbs trail={[{ name: "FAQ", slug: "faq" }]} />
        <h1 className="mt-6 max-w-[20ch] font-headline text-[clamp(2rem,4.6vw,3.25rem)] leading-[1.05] font-semibold tracking-[-0.02em] text-fg">
          {FAQ_PAGE_META.h1}
        </h1>
        <AnswerBlock>{FAQ_PAGE_META.answer}</AnswerBlock>
        <p className="mt-5 text-[13px] text-subtle">
          <a href="/faq.md" className="underline decoration-line-strong underline-offset-4 hover:text-fg">
            Markdown version
          </a>
        </p>
        {groups.map((group) => (
          <FaqList
            key={group.title}
            faqs={group.faqs}
            heading={group.title}
            id={`faq-${group.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`}
          />
        ))}
        <RelatedGrid pages={related} title="Start here" />
        <PageCta
          title="Still deciding?"
          body="It is free, MIT licensed, and it runs on the Muse Code subscription you already have. The worst case is that you uninstall it and your CLI is untouched."
        />
      </div>
      <Rule />
    </DocShell>
  );
}
