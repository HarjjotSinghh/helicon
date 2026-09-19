import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Everyone may crawl, AI search and answer engines included: the page is meant to be found and
 * quoted. The named list is not redundant with the wildcard. Several of these crawlers only read
 * the block that names them, and a few operators check for their own agent before trusting the
 * wildcard, so naming them is the difference between being crawlable and being cited.
 */

const AI_AGENTS = [
  // OpenAI
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  // Anthropic
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "anthropic-ai",
  // Perplexity
  "PerplexityBot",
  "Perplexity-User",
  // Google
  "Google-Extended",
  "Googlebot",
  "Googlebot-Image",
  "GoogleOther",
  // Microsoft and Bing
  "Bingbot",
  "BingPreview",
  "msnbot",
  // Apple
  "Applebot",
  "Applebot-Extended",
  // Meta
  "meta-externalagent",
  "FacebookBot",
  // Others that index for answer engines
  "DuckDuckBot",
  "YandexBot",
  "Baiduspider",
  "Amazonbot",
  "Bytespider",
  "CCBot",
  "cohere-ai",
  "Diffbot",
  "MistralAI-User",
  "Timpibot",
  "omgili",
  "PetalBot",
  "SeznamBot",
  "YouBot",
  "Kagibot",
  "Firecrawl",
  "AI2Bot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // /api/v1 and the OpenAPI document are meant to be found: they are the machine-readable
      // half of this site. Only the image renderer and the updater endpoint are noise.
      {
        userAgent: "*",
        allow: ["/", "/api/v1/", "/api/openapi.yaml", "/openapi.json"],
        disallow: ["/api/og", "/api/update/", "/download/"],
      },
      { userAgent: AI_AGENTS, allow: "/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL.replace(/^https?:\/\//, ""),
  };
}
