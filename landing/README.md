# Helicon landing page

Next.js 16 (App Router) + Tailwind v4. Deploy on Vercel with **Root Directory = `landing`**.

```sh
npm install
npm run dev     # http://localhost:3000
npm run build
```

## Search, social and AI discovery

Set **`NEXT_PUBLIC_SITE_URL`** (for example `https://helicon.dev`) in the Vercel project once the domain is
live. Every absolute URL below is built from it; without it, Vercel's production URL is used.

- Metadata, canonical URL, Open Graph and Twitter cards: `src/app/layout.tsx`
- Social image (1200x630, generated at build): `src/app/opengraph-image.tsx`, `src/app/twitter-image.tsx`, drawn in `src/lib/og-image.tsx`
- `robots.txt` (search and AI crawlers allowed), `sitemap.xml`, `manifest.webmanifest`: `src/app/robots.ts`, `sitemap.ts`, `manifest.ts`
- schema.org JSON-LD (WebSite, SoftwareApplication, FAQPage): `src/components/structured-data.tsx`
- For AI agents and answer engines, generated from `src/lib/site.ts` so they match the page:
  - `/llms.txt` (llmstxt.org index), `/llms-full.txt` (the whole page as Markdown), `/agents.md` (install guide and facts for agents)
  - Content lives in `src/lib/ai-docs.ts`

## Installer downloads

`/download/windows` and `/download/macos` resolve the latest GitHub Release asset and 302 to it.

Optional env:

- **`NEXT_PUBLIC_POSTHOG_KEY`** / **`POSTHOG_KEY`** / **`NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`** — Helicon-only PostHog project. Client SDK captures pageviews, autocapture, heatmaps, session replay, `download_click`, `github_click`, `demo_play`, `copy_command`, `install_os_tab`, `faq_toggle`. `/download/*` records `installer_download` (installer OS vs visitor OS, src, asset, version). No-op if unset. Not the desktop app.
- **`NEXT_PUBLIC_POSTHOG_HOST`** — defaults to `https://us.i.posthog.com`
- **`GITHUB_TOKEN`** — optional, raises GitHub API rate limits for latest-release lookups

## Recorded walkthrough

Hero video is `public/demo/a1.mp4` (muted, looping on desktop). GitHub README uses `docs/assets/demo.gif` because repository MP4s do not play inline.

## Live product demos

Below the recording, the app windows are the real Helicon UI, not screenshots:

- `src/product/` is a copy of `packages/ui/src`, and `src/app/product-theme.css` is generated from
  `apps/web/src/theme.css`. Refresh both after product UI changes: `node scripts/sync-product-ui.mjs`.
  Do not edit them by hand; the sync script applies the few landing-specific patches.
- `src/demo/client.ts` is an in-memory `HeliconClient` with sample projects, threads, usage and models.
  It plays turns back as MSP events, so sending a message or answering an approval works in the browser.
- `src/demo/demo-app.tsx` mounts the product shell with a real `HeliconController`, scales it to fit,
  and keeps overlays inside the demo window.

## Sources

- Type: Mona Sans (landing), Inter, Newsreader and JetBrains Mono (product faces for the demos).
- Icons: Phosphor on the landing page; the demos keep the product's Lucide icons.
- Button styling adapted from shadcn/ui Button (MIT).
- `legacy/` keeps the previous static page for reference.
