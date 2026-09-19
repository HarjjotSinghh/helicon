import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "../site";
import type { Section, SeoPage } from "./types";

/** The social card for a page, rendered by /api/og from the page's own title. */
export function ogImagePath(title: string, subtitle: string, eyebrow: string) {
  const query = new URLSearchParams({ title, subtitle, eyebrow });
  return `/api/og?${query.toString()}`;
}

export function ogImageUrl(title: string, subtitle: string, eyebrow: string) {
  return `${SITE_URL}${ogImagePath(title, subtitle, eyebrow)}`;
}

/**
 * Metadata for a generated page. Every page gets its own canonical, its own Open Graph pair, a
 * Markdown alternate so agents can ask for the machine readable version, and an explicit
 * article:modified_time so freshness is legible to crawlers that weight it.
 */
export function metadataFor(page: SeoPage): Metadata {
  const path = `/${page.slug}`;
  const image = {
    url: ogImagePath(page.h1, page.description, page.ogEyebrow ?? SITE_NAME),
    width: 1200,
    height: 630,
    alt: `${page.h1}. ${page.description}`,
  };
  return {
    title: page.title,
    description: page.description,
    keywords: page.keywords,
    alternates: {
      canonical: path,
      types: { "text/markdown": [{ url: `${path}.md`, title: `${page.title} (Markdown)` }] },
    },
    openGraph: {
      type: "article",
      url: path,
      siteName: SITE_NAME,
      title: page.title,
      description: page.description,
      locale: "en_US",
      modifiedTime: page.updated,
      publishedTime: page.updated,
      images: [image],
    },
    twitter: { card: "summary_large_image", title: page.title, description: page.description, images: [image] },
    other: {
      "article:modified_time": page.updated,
    },
  };
}

export function metadataForSection(section: Section): Metadata {
  const path = `/${section.slug}`;
  const image = {
    url: ogImagePath(section.h1, section.description, section.label),
    width: 1200,
    height: 630,
    alt: `${section.h1}. ${section.description}`,
  };
  return {
    title: section.title,
    description: section.description,
    keywords: section.keywords,
    alternates: {
      canonical: path,
      types: { "text/markdown": [{ url: `${path}.md`, title: `${section.title} (Markdown)` }] },
    },
    openGraph: {
      type: "website",
      url: path,
      siteName: SITE_NAME,
      title: section.title,
      description: section.description,
      locale: "en_US",
      images: [image],
    },
    twitter: { card: "summary_large_image", title: section.title, description: section.description, images: [image] },
  };
}

/** Absolute URL for a slug, used where Metadata's relative resolution is not available. */
export function absolute(slug: string) {
  return slug ? `${SITE_URL}/${slug}` : `${SITE_URL}/`;
}
