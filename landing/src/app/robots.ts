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

/**
 * Link preview fetchers. They read og:image, which points at /api/og, so they must be allowed to
 * fetch it or shared links lose their card image.
 */
const PREVIEW_AGENTS = [
  "Twitterbot",
  "LinkedInBot",
  "Slackbot",
  "Slackbot-LinkExpanding",
  "Discordbot",
  "TelegramBot",
  "WhatsApp",
  "facebookexternalhit",
];

// A crawler obeys only the most specific group that names it and ignores the wildcard, so every
// group has to repeat these.
const ALLOW = ["/", "/api/v1/", "/api/openapi.yaml", "/openapi.json"];
const NOISE = ["/api/update/", "/download/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // /api/v1 and the OpenAPI document are meant to be found: they are the machine-readable
      // half of this site. Only the image renderer, the updater endpoint and the installer
      // redirects are noise.
      { userAgent: "*", allow: ALLOW, disallow: ["/api/og", ...NOISE] },
      { userAgent: AI_AGENTS, allow: ALLOW, disallow: ["/api/og", ...NOISE] },
      { userAgent: PREVIEW_AGENTS, allow: [...ALLOW, "/api/og"], disallow: NOISE },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL.replace(/^https?:\/\//, ""),
  };
}
