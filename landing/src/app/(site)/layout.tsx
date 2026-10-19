import type { Metadata } from "next";
import { ALTERNATE_TYPES, DocumentShell, baseMetadata } from "@/components/document-shell";
import { ogAlt, ogSize } from "@/lib/og-image";
import { DESCRIPTION, SITE_KEYWORDS, SITE_NAME, SITE_URL, TAGLINE, TITLE } from "@/lib/site";
import "../globals.css";

export { viewport } from "@/components/document-shell";

export const metadata: Metadata = {
  ...baseMetadata,
  title: { default: TITLE, template: `%s | ${SITE_NAME}` },
  description: DESCRIPTION,
  keywords: SITE_KEYWORDS,
  alternates: {
    // Next normalises this to the bare origin; the sitemap's home entry matches it exactly.
    canonical: SITE_URL,
    types: ALTERNATE_TYPES,
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: TITLE,
    description: `${TAGLINE} A free, open-source desktop and web app for the muse CLI.`,
    locale: "en_US",
    // app/opengraph-image.tsx renders this card, but with two root layouts Next does not attach it
    // to the home page on its own, so it is named here. Pages with their own card override it.
    images: [{ url: "/opengraph-image", ...ogSize, alt: ogAlt }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: `${TAGLINE} Free and MIT licensed.`,
    images: [{ url: "/opengraph-image", alt: ogAlt }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <DocumentShell lang="en">{children}</DocumentShell>;
}
