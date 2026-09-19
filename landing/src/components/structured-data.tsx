import { FAQS, SITE_URL, TITLE } from "@/lib/site";
import { SECTIONS } from "@/lib/seo/catalog";
import { IDS, coreNodes, jsonLd } from "@/lib/seo/schema";

/**
 * schema.org data for the home page. The shared nodes (the site, the publisher, the author and
 * the application itself) come from lib/seo/schema so every page on the site describes the same
 * entity with the same identifiers, which is what lets a graph be merged rather than guessed at.
 */
export function StructuredData({ version }: { version: string | null }) {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      ...coreNodes(version),
      {
        "@type": "WebPage",
        "@id": `${SITE_URL}/#webpage`,
        url: `${SITE_URL}/`,
        name: TITLE,
        description:
          "Helicon is a free, open-source desktop and web app for Meta's Muse Code CLI: projects, sessions, inline diffs, approvals and cost in one window, on your existing subscription.",
        inLanguage: "en",
        isPartOf: { "@id": IDS.website },
        about: { "@id": IDS.app },
        primaryImageOfPage: `${SITE_URL}/opengraph-image`,
        speakable: { "@type": "SpeakableSpecification", cssSelector: ["h1", "[data-answer]"] },
        mainEntity: { "@id": IDS.app },
        significantLink: SECTIONS.map((section) => `${SITE_URL}/${section.slug}`),
        hasPart: [
          `${SITE_URL}/muse-code-gui`,
          `${SITE_URL}/muse-code-desktop-app`,
          `${SITE_URL}/pricing`,
          `${SITE_URL}/faq`,
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${SITE_URL}/#faq`,
        url: `${SITE_URL}/faq`,
        mainEntity: FAQS.map(([q, a]) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: a },
        })),
      },
      {
        "@type": "SiteNavigationElement",
        "@id": `${SITE_URL}/#nav`,
        name: SECTIONS.map((section) => section.label),
        url: SECTIONS.map((section) => `${SITE_URL}/${section.slug}`),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // Static data; "<" is escaped so the JSON can never close the script tag.
      dangerouslySetInnerHTML={{ __html: jsonLd(graph) }}
    />
  );
}
