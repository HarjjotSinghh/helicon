import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ALTERNATE_TYPES, baseMetadata } from "@/components/document-shell";
import { LocaleHome } from "@/components/locale-home";
import { latestRelease, repoStars } from "@/lib/github-release";
import { LOCALES, LOCALE_INFO, isLocale, languageAlternates, localeUrl, translationUpdated, type Locale } from "@/lib/i18n";
import { HOME_COPY } from "@/lib/i18n-copy";
import { IDS, coreNodes, jsonLd } from "@/lib/seo/schema";
import { modifiedMeta } from "@/lib/seo/freshness";
import { SITE_NAME, SITE_OTHER_META, SITE_URL } from "@/lib/site";

type Props = { params: Promise<{ locale: string }> };

async function localeFrom(params: Props["params"]): Promise<Locale> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return locale;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await localeFrom(params);
  const { meta } = HOME_COPY[locale];
  const url = localeUrl(locale, "/");
  return {
    ...baseMetadata,
    title: { absolute: meta.title },
    description: meta.description,
    alternates: { canonical: url, languages: languageAlternates("/"), types: ALTERNATE_TYPES },
    openGraph: {
      type: "website",
      url,
      siteName: SITE_NAME,
      title: meta.title,
      description: meta.ogDescription,
      locale: LOCALE_INFO[locale].og,
      alternateLocale: [LOCALE_INFO.en.og, ...LOCALES.filter((l) => l !== locale).map((l) => LOCALE_INFO[l].og)],
    },
    twitter: { card: "summary_large_image", title: meta.title, description: meta.ogDescription },
    other: { ...SITE_OTHER_META, ...modifiedMeta(translationUpdated("/") ?? undefined) },
  };
}

export default async function LocalePage({ params }: Props) {
  const locale = await localeFrom(params);
  const copy = HOME_COPY[locale];
  const [release, stars] = await Promise.all([latestRelease(), repoStars()]);
  const version = release?.version ?? null;
  const url = localeUrl(locale, "/");
  const lang = LOCALE_INFO[locale].hreflang;
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      ...coreNodes(version),
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: copy.meta.title,
        description: copy.meta.description,
        inLanguage: lang,
        isPartOf: { "@id": IDS.website },
        about: { "@id": IDS.app },
        mainEntity: { "@id": IDS.app },
        translationOfWork: { "@id": `${SITE_URL}/#webpage` },
        primaryImageOfPage: `${SITE_URL}/opengraph-image`,
        dateModified: translationUpdated("/"),
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        url: `${url}#faq`,
        inLanguage: lang,
        mainEntity: copy.faq.items.map(([q, a]) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: a },
        })),
      },
    ],
  };
  return (
    <>
      <LocaleHome locale={locale} copy={copy} version={version} notesUrl={release?.notesUrl ?? ""} stars={stars} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(graph) }} />
    </>
  );
}
