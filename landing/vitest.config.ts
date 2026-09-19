import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Unit tests for the parts of this site that are pure data: the API router, the OpenAPI document,
 * the Markdown negotiation rules and the schema.org graph. Nothing here starts a server; the live
 * endpoints are checked separately by scripts/agent-check.mjs against a running build.
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    // Every assertion is about the canonical origin. Without this, a developer's .env.local, which
    // points NEXT_PUBLIC_SITE_URL at localhost for `next dev`, would rewrite every expected URL.
    env: { NEXT_PUBLIC_SITE_URL: "https://helicon.sh" },
  },
});
