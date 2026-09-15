import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Inter, JetBrains_Mono, Manrope, Newsreader } from "next/font/google";
import { FontPicker } from "@/components/font-picker";
import { AUTHOR, DESCRIPTION, SITE_NAME, SITE_URL, TAGLINE, TITLE } from "@/lib/site";
import "./globals.css";

// Landing typefaces: Instrument Sans for headings, Manrope for everything else.
const instrumentSans = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], display: "swap" });

// The product's own faces, used by the live app demos.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: `%s | ${SITE_NAME}` },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: AUTHOR.name, url: AUTHOR.url }],
  creator: AUTHOR.name,
  publisher: AUTHOR.name,
  category: "Developer tools",
  keywords: [
    "Helicon",
    "Muse Code",
    "muse CLI",
    "Muse Code GUI",
    "Muse Code desktop app",
    "AI coding agent GUI",
    "coding agent desktop app",
    "agent approvals",
    "inline diffs",
    "Tauri app",
    "WSL2",
    "open source",
    "MIT",
  ],
  alternates: {
    canonical: "/",
    types: { "text/plain": [{ url: "/llms.txt", title: "llms.txt" }], "text/markdown": [{ url: "/agents.md", title: "AGENTS.md" }] },
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
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  formatDetection: { telephone: false, email: false, address: false },
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${instrumentSans.variable} ${manrope.variable} ${inter.variable} ${newsreader.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {children}
        {process.env.NODE_ENV === "development" ? <FontPicker /> : null}
      </body>
    </html>
  );
}
