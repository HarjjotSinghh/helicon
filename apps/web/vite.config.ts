import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The web app compiles the shared UI straight from source, so edits hot-reload without a package build.
const uiEntry = fileURLToPath(new URL("../../packages/ui/src/index.ts", import.meta.url));

/**
 * `npm run build:try` builds the demo for helicon.sh/try: served from /try/, with its own title and
 * description so the page reads as the demo rather than as the app.
 */
const tryPage = {
  name: "helicon-try-page",
  transformIndexHtml(html: string) {
    if (!process.env.VITE_TRY) {
      return html;
    }
    return html.replace(
      "<title>Helicon</title>",
      [
        "<title>Try Helicon in your browser: the Muse Code desktop app, on sample data</title>",
        '<meta name="description" content="Click around the real Helicon interface for Muse Code without installing anything: threads, approvals, diffs, usage and monitors, running on sample data." />',
        '<link rel="canonical" href="https://helicon.sh/try" />',
        // A link to /try shared on X or anywhere else gets a real card, not a bare URL.
        '<meta property="og:type" content="website" />',
        '<meta property="og:url" content="https://helicon.sh/try" />',
        '<meta property="og:title" content="Try Helicon in your browser" />',
        '<meta property="og:description" content="The real Helicon interface for Muse Code, running on sample data. Nothing to install." />',
        '<meta property="og:image" content="https://helicon.sh/brand/og-dark.png" />',
        '<meta name="twitter:card" content="summary_large_image" />',
        '<meta name="twitter:image" content="https://helicon.sh/brand/og-dark.png" />',
        `<script type="application/ld+json">${JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "Helicon demo",
          url: "https://helicon.sh/try",
          applicationCategory: "DeveloperApplication",
          operatingSystem: "Web",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        })}</script>`,
      ].join("\n    ").concat(""),
    ).replace(
      '<div id="root"></div>',
      // One heading for crawlers and for anyone without JavaScript; the app replaces #root's content.
      '<div id="root"><noscript><h1>Try Helicon in your browser</h1><p>The demo needs JavaScript. You can <a href="https://helicon.sh/#install">download Helicon</a> instead.</p></noscript></div>',
    );
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss(), tryPage],
  resolve: {
    alias: { "@helicon/ui": uiEntry },
    dedupe: ["react", "react-dom"],
  },
  server: {
    port: 5173,
    proxy: {
      // The string shorthand rewrites Host to the target, so the server sees the page's origin as
      // foreign and refuses every write. Keeping the Host makes the dev page same-origin, as in prod.
      "/api": { target: "http://127.0.0.1:3127", changeOrigin: false },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
});
