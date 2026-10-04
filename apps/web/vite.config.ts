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
      ].join("\n    "),
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
      "/api": "http://127.0.0.1:3127",
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
});
