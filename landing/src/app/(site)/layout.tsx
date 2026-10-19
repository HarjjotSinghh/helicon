import type { Metadata } from "next";
import { ALTERNATE_TYPES, DocumentShell, baseMetadata } from "@/components/document-shell";
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
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: `${TAGLINE} Free and MIT licensed.`,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <DocumentShell lang="en">{children}</DocumentShell>;
}
