import type { MetadataRoute } from "next";
import { ALL_PAGES, SECTIONS } from "@/lib/seo/catalog";
import { SITE_URL } from "@/lib/site";
import { languageAlternates, localeUrl, translatedLocales, translationUpdated } from "@/lib/i18n";

/**
 * Every indexable URL. Priorities are relative to each other, not absolute claims: the home page
 * and the two head-term pillars first, then the hubs, then the pages that hang off them.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    // No trailing slash: Next normalises the home canonical to the bare origin, and the two have
    // to be byte identical or Search Console reports the pair as a canonical conflict.
    { url: SITE_URL, lastModified: now, changeFrequency: "weekly", priority: 1, alternates: { languages: languageAlternates("/") } },
    // Each translation lists the same hreflang set as the English page, so the cluster is
    // reciprocal, and is dated by when its copy last changed rather than by the build.
    ...translatedLocales("/").map((locale) => ({
      url: localeUrl(locale, "/"),
      lastModified: new Date(`${translationUpdated("/")}T00:00:00Z`),
      changeFrequency: "monthly" as const,
      priority: 0.8,
      alternates: { languages: languageAlternates("/") },
    })),
    { url: `${SITE_URL}/try`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
  ];

  for (const section of SECTIONS) {
    entries.push({
      url: `${SITE_URL}/${section.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  entries.push(
    { url: `${SITE_URL}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/changelog`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
  );

  for (const page of ALL_PAGES) {
    if (page.noindex) continue;
    const lastModified = new Date(`${page.updated}T00:00:00Z`);
    // The two head-term pillars and pricing sit above the rest of the generated pages.
    const priority = page.section === "page" ? 0.9 : page.section === "install" ? 0.8 : 0.7;
    entries.push({
      url: `${SITE_URL}/${page.slug}`,
      lastModified,
      changeFrequency: "monthly",
      priority,
    });
  }

  // Machine-readable surfaces. They are indexable on purpose: answer engines fetch them directly.
  entries.push(
    { url: `${SITE_URL}/llms.txt`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/llms-full.txt`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/agents.md`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/facts.json`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/openapi.json`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  );

  return entries;
}
