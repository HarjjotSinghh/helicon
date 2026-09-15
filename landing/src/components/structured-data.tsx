import { AUTHOR, DESCRIPTION, FAQS, REPO_URL, SITE_NAME, SITE_URL } from "@/lib/site";

/** schema.org data for search and answer engines: the app, its FAQ, and the site itself. */
export function StructuredData({ version }: { version: string | null }) {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: DESCRIPTION,
        inLanguage: "en",
        publisher: { "@id": `${SITE_URL}/#author` },
      },
      {
        "@type": "Person",
        "@id": `${SITE_URL}/#author`,
        name: AUTHOR.name,
        url: AUTHOR.url,
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#app`,
        name: SITE_NAME,
        description: DESCRIPTION,
        url: SITE_URL,
        image: `${SITE_URL}/opengraph-image`,
        applicationCategory: "DeveloperApplication",
        applicationSubCategory: "AI coding agent interface",
        operatingSystem: "Windows, macOS, Linux",
        softwareVersion: version ?? undefined,
        license: "https://opensource.org/licenses/MIT",
        isAccessibleForFree: true,
        downloadUrl: `${SITE_URL}/download/windows`,
        installUrl: `${SITE_URL}/#install`,
        codeRepository: REPO_URL,
        softwareRequirements: "The muse CLI, logged in; Node.js is bundled",
        featureList: [
          "Projects and sessions grouped by working directory, git worktrees included",
          "Inline diffs in the thread",
          "Every agent approval surfaced, never bypassed",
          "Cost at API rates per thread, day and model",
          "Command palette, slash commands, model and reasoning-effort picker",
          "Tauri desktop app and web app on the same UI",
        ],
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        author: { "@id": `${SITE_URL}/#author` },
        sameAs: [REPO_URL],
      },
      {
        "@type": "FAQPage",
        "@id": `${SITE_URL}/#faq`,
        mainEntity: FAQS.map(([q, a]) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: a },
        })),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // Static data from lib/site; "<" is escaped so the JSON can never close the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, "\\u003c") }}
    />
  );
}
