import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Inter, JetBrains_Mono, Manrope, Newsreader } from "next/font/google";
import type { ReactNode } from "react";
import { DownloadNextSteps } from "@/components/download-next-steps";
import { DownloadStarted } from "@/components/download-started";
import { FontPicker } from "@/components/font-picker";
import { GoogleAnalytics } from "@/components/analytics-scripts";
import { AUTHOR, SITE_NAME, SITE_OTHER_META, SITE_URL } from "@/lib/site";

/*
 * The <html> document both root layouts render: the English site in app/(site) and the translated
 * pages in app/[locale]. They are separate root layouts only so that each can set its own
 * <html lang>; everything else about the document is shared from here.
 */

// Landing typefaces: Instrument Sans for headings, Manrope for everything else.
const instrumentSans = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], display: "swap" });

/*
 * The product's own faces, used by the live app demos, which exist only on the home page.
 * They are declared here because the CSS variables are global, but `preload: false` keeps them
 * out of every page's <head>: together they are ~200 KB, and preloading them on a text page
 * costs the answer paragraph its LCP on a throttled connection for fonts nothing there uses.
 * The browser still fetches them the moment a demo actually asks for them.
 */
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap", preload: false });
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
  preload: false,
});
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

/** The machine-readable twins every page advertises. Pages that set `alternates` repeat these, since Next replaces the key. */
export const ALTERNATE_TYPES = {
  "text/plain": [{ url: "/llms.txt", title: "llms.txt" }],
  "text/markdown": [{ url: "/agents.md", title: "AGENTS.md" }],
  "application/json": [{ url: "/facts.json", title: "Checkable facts about Helicon" }],
  "application/rss+xml": [{ url: "/rss.xml", title: "Helicon releases (RSS)" }],
  "application/atom+xml": [{ url: "/atom.xml", title: "Helicon releases (Atom)" }],
};

/** The parts of the metadata that do not depend on the page's language. */
export const baseMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  authors: [{ name: AUTHOR.name, url: AUTHOR.url }],
  creator: AUTHOR.name,
  publisher: AUTHOR.name,
  category: "Developer tools",
  // Search Console and Webmaster Tools verification. Set the env vars once per property; an
  // unset var leaves the tag out entirely rather than emitting an empty one.
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    yandex: process.env.YANDEX_VERIFICATION,
    other: {
      ...(process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : {}),
      ...(process.env.NAVER_SITE_VERIFICATION ? { "naver-site-verification": process.env.NAVER_SITE_VERIFICATION } : {}),
      // SaaSHub ownership check for the Helicon listing. The code is public by design.
      "saashub-verification": "oyn14flr07jw",
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  formatDetection: { telephone: false, email: false, address: false },
  other: SITE_OTHER_META,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfcfe" },
    { media: "(prefers-color-scheme: dark)", color: "#18191b" },
  ],
  viewportFit: "cover",
};

// Runs before first paint: a saved choice wins, otherwise the system theme.
const themeScript = `(function(){var d=document.documentElement,t=null;try{t=localStorage.getItem("helicon-theme")}catch(e){}if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}d.setAttribute("data-theme",t)})()`;

export function DocumentShell({ lang, children }: { lang: string; children: ReactNode }) {
  return (
    <html
      lang={lang}
      data-theme="light"
      suppressHydrationWarning
      className={`${instrumentSans.variable} ${manrope.variable} ${inter.variable} ${newsreader.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {children}
        <DownloadStarted
          steps={{ windows: <DownloadNextSteps os="windows" />, macos: <DownloadNextSteps os="macos" /> }}
        />
        <GoogleAnalytics />
        {process.env.NODE_ENV === "development" ? <FontPicker /> : null}
      </body>
    </html>
  );
}
