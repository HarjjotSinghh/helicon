/**
 * The HTML that `npm run build:try` puts around the demo at helicon.sh/try. The head carries the
 * page's own title, description and JSON-LD. The body carries a written guide to the demo inside
 * #root: crawlers and visitors without JavaScript read it, and the app replaces it on mount.
 *
 * landing/public/try/index.html is committed, so test/tryPage.test.ts checks that it still matches.
 */

/** When the guide below last changed. Bump it with any edit to TRY_GUIDE. */
export const TRY_UPDATED = "2026-10-17";

const TITLE = "Try Helicon in your browser: a Muse Code GUI demo";
const DESCRIPTION =
  "Click around the real Helicon interface for Muse Code without installing anything: threads, approvals, diffs, usage and monitors, running on sample data.";
const ANSWER =
  "The Helicon demo runs the real Helicon interface for Meta's Muse Code CLI in your browser, on sample data. The demo needs no install, no Muse Code account and no subscription. In the demo you can open threads, approve a tool call, read diffs, check usage and cost, and watch a background monitor. Nothing runs on your machine and no model is called.";

const tryJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://helicon.sh/#publisher",
      name: "Helicon",
      url: "https://helicon.sh/",
      logo: "https://helicon.sh/assets/logo-light.png",
      description:
        "Helicon is an unofficial, MIT licensed community project: a desktop and web client for Meta's Muse Code CLI. Not made, sponsored or endorsed by Meta.",
      sameAs: [
        "https://github.com/HarjjotSinghh/helicon",
        "https://x.com/harjjotsinghh",
        "https://www.linkedin.com/in/harjjotsinghh/",
        "https://alternativeto.net/software/helicon/about/",
      ],
    },
    {
      "@type": "WebPage",
      "@id": "https://helicon.sh/try#page",
      url: "https://helicon.sh/try",
      name: TITLE,
      description: ANSWER,
      inLanguage: "en",
      dateModified: TRY_UPDATED,
      publisher: { "@id": "https://helicon.sh/#publisher" },
      mainEntity: { "@id": "https://helicon.sh/try#app" },
    },
    {
      "@type": "WebApplication",
      "@id": "https://helicon.sh/try#app",
      name: "Helicon demo",
      url: "https://helicon.sh/try",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      publisher: { "@id": "https://helicon.sh/#publisher" },
    },
  ],
};

export const TRY_HEAD = [
  `<title>${TITLE}</title>`,
  `<meta name="description" content="${DESCRIPTION}" />`,
  '<link rel="canonical" href="https://helicon.sh/try" />',
  `<meta property="article:modified_time" content="${TRY_UPDATED}" />`,
  // A link to /try shared on X or anywhere else gets a real card, not a bare URL.
  '<meta property="og:type" content="website" />',
  '<meta property="og:url" content="https://helicon.sh/try" />',
  '<meta property="og:title" content="Try Helicon in your browser" />',
  '<meta property="og:description" content="The real Helicon interface for Muse Code, running on sample data. Nothing to install." />',
  '<meta property="og:image" content="https://helicon.sh/brand/og-dark.png" />',
  '<meta name="twitter:card" content="summary_large_image" />',
  '<meta name="twitter:image" content="https://helicon.sh/brand/og-dark.png" />',
  // The publisher node matches the one on every helicon.sh page (same @id), so the graphs merge.
  `<script type="application/ld+json">${JSON.stringify(tryJsonLd)}</script>`,
].join("\n    ");

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

// Hidden for the first two seconds so a normal load goes straight to the app with no flash of text.
// Without JavaScript, or on a connection too slow to start the app, the guide fades in instead.
// The app's CSS locks html and body to the viewport, so the guide unlocks scrolling. The style tag
// sits inside #root, so the lock comes back as soon as the app mounts.
const GUIDE_STYLE =
  "<style>html,body,#root{height:auto!important;max-height:none!important;overflow:auto!important}.try-guide{max-width:44rem;margin:0 auto;padding:3rem 1.25rem;font:16px/1.65 system-ui,sans-serif;color:CanvasText;opacity:0;animation:try-guide-in 0s 2s forwards}" +
  ".try-guide h1{font-size:2rem;line-height:1.15;margin:0 0 1rem}.try-guide h2{font-size:1.25rem;margin:2.25rem 0 .5rem}" +
  ".try-guide small{opacity:.7}.try-guide code{font-size:.92em}@keyframes try-guide-in{to{opacity:1}}</style>";

export const TRY_GUIDE = `<article class="try-guide">${GUIDE_STYLE}
<h1>Try Helicon in your browser</h1>
<p data-answer>${ANSWER}</p>
<p><small>Last updated <time datetime="${TRY_UPDATED}">${formatDate(TRY_UPDATED)}</time></small></p>
<noscript><p>The interactive demo needs JavaScript. Everything it shows is described below.</p></noscript>
<h2>What the Helicon demo includes</h2>
<ul>
<li>Three sample projects, <code>readme-demo</code>, <code>api-server</code> and <code>helicon</code>, each with seeded threads.</li>
<li>A thread waiting on an approval, with Allow and remember, Allow once and Reject.</li>
<li>Tool calls and inline diffs for file reads, edits and shell commands.</li>
<li>A usage page that shows what each thread would have cost at API rates, by day, by model and by thread.</li>
<li>A Muse Code monitor that watches a pull request's checks in the background.</li>
<li>The command palette and the settings page.</li>
</ul>
<h2>How to use the demo</h2>
<ol>
<li>Open helicon.sh/try. The sample projects load in the sidebar.</li>
<li>Open the thread "Paginate GET /v1/projects with a cursor". It is waiting on an approval.</li>
<li>Choose Allow once to run the tests, or Reject to skip them.</li>
<li>Open the usage page to see the cost of each thread at API rates.</li>
<li>Press Cmd+K on macOS, or Ctrl+K on Windows and Linux, to open the command palette.</li>
</ol>
<h2>Worked example: approve a test run</h2>
<p>In the <code>api-server</code> project, the prompt asks Muse Code to paginate <code>GET /v1/projects</code> with a cursor and then run the route tests. Muse Code reads <code>src/routes/projects.ts</code>, edits the route to take <code>limit</code> and <code>cursor</code> query parameters, and stops before <code>npm test -- routes/projects</code>, because a shell command needs your approval.</p>
<p>Choose Allow once and the tests run. Both route tests pass, and the reply says the route now takes <code>limit</code> (default 50, max 200) and <code>cursor</code> and answers <code>{ data, next }</code>. Choose Reject and the tests do not run. The reply then points you to the change in <code>src/routes/projects.ts</code>.</p>
<h2>Limits of the demo</h2>
<ul>
<li>Every project, thread, usage figure and reply is sample data. A prompt you send gets a fixed reply, not an answer from a model.</li>
<li>The demo cannot open folders on your computer or reach a Muse Code install.</li>
<li>Threads you start live in memory and are gone after a reload.</li>
</ul>
<h2>Use Helicon on your own projects</h2>
<p>Helicon is free and MIT licensed. <a href="https://helicon.sh/#install">Download the desktop app</a> for Windows, macOS or Linux, or install the VS Code extension. Both run on the Muse Code subscription you already have.</p>
</article>`;

/** Applies the /try head and guide to Vite's index.html. */
export function tryHtml(html: string): string {
  return html.replace("<title>Helicon</title>", TRY_HEAD).replace('<div id="root"></div>', `<div id="root">${TRY_GUIDE}</div>`);
}
