import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tryHtml } from "./src/demo/tryPage";
import { phosphorWeights } from "./src/vite/phosphorWeights";

// The web app compiles the shared UI straight from source, so edits hot-reload without a package build.
const uiEntry = fileURLToPath(new URL("../../packages/ui/src/index.ts", import.meta.url));

/**
 * `npm run build:try` builds the demo for helicon.sh/try: served from /try/, with its own head and a
 * written guide to the demo, so the page reads as the demo rather than as the app.
 */
const tryPage = {
  name: "helicon-try-page",
  transformIndexHtml(html: string) {
    return process.env.VITE_TRY ? tryHtml(html) : html;
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss(), tryPage, phosphorWeights()],
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
