# SEO and AEO for helicon.sh

Everything on this site that exists to be found, and the runbook for the parts that need a human
with a Google account. Written 2026-09-19.

## What is generated, and from where

The site is one hand-written landing page plus 71 generated pages. The generated pages are data,
not files: adding an entry to a content module makes the page, its Markdown mirror, its social
image, its schema, its sitemap entry, its internal links and its llms.txt line all exist.

| Thing | Where |
| --- | --- |
| Content model | `src/lib/seo/types.ts` |
| The registry every surface reads | `src/lib/seo/catalog.ts` |
| Page content | `src/lib/seo/content/*.ts` |
| Markdown renderer (the `.md` mirrors) | `src/lib/seo/markdown.ts` |
| schema.org graphs | `src/lib/seo/schema.ts` |
| Per page `<head>` | `src/lib/seo/metadata.ts` |
| Page layout | `src/components/seo/*` |
| Route wrappers (two lines each) | `src/app/<section>/[slug]/page.tsx` |

### Adding a page

1. Add an entry to the right file in `src/lib/seo/content/`.
2. Nothing else. The hub, the sitemap, the internal links and the Markdown mirror pick it up.
3. Give it a real `answer`: 40 to 60 words that read correctly quoted out of context. That
   paragraph is the page's `description` in schema, the opening of the Markdown mirror, the
   `speakable` target, and the passage answer engines actually lift.
4. Point `related` at three or more slugs, or the page falls back to its own section.

### Rules the content has to keep

From `.agents/product-marketing.md`:

- Never claim Helicon is official, or made, sponsored or endorsed by Meta.
- Never claim it is the only GUI for Muse Code. VS Code extensions, ACP bridges and other
  open-source wrappers exist, and the comparison pages say so by name.
- Never call the cost view a bill. It is what threads would cost at published API rates.
- No em dashes. Specific numbers over adjectives.

## URL map

```
/                            home
/muse-code-gui               pillar: "Muse Code GUI", the honest roundup of every option
/muse-code-desktop-app       pillar: "Muse Code desktop app"
/pricing                     free, MIT, no paid tier
/faq                         every question the site answers, in one page
/changelog                   GitHub releases, newest first
/install                     hub → windows, macos, linux, wsl2
/compare                     hub → 13 comparison pages
/features                    hub → 12 capability pages
/guides                      hub → 10 task guides
/use-cases                   hub → 8 persona pages
/glossary                    hub → 13 definitions
```

Short redirects exist for `/gui`, `/desktop`, `/app`, `/windows`, `/mac`, `/macos`, `/linux`,
`/wsl`, `/docs`, `/alternatives`, `/vs/:slug` and `/releases` (see `next.config.ts`).

## Machine-readable surfaces (AEO)

| URL | What it is |
| --- | --- |
| `/llms.txt` | llmstxt.org index: facts, every page grouped by section |
| `/llms-full.txt` | The whole site as one plain-text file, including every FAQ |
| `/agents.md` | Instructions for an agent installing or recommending Helicon, including a "do not claim" list |
| `/facts.json` | The checkable facts as JSON: licence, price, platforms, privacy, what not to claim |
| `/pricing.md` | Pricing as Markdown, for agents comparing tools programmatically |
| `/faq.md` | Every question and answer as Markdown |
| `/<any-page>.md` | The Markdown mirror of that page |
| `/index.md` | The home page as Markdown |
| `Accept: text/markdown` | Any page including `/`, without the `.md` suffix. Handled in `src/proxy.ts` |
| `Link:` header | Every HTML page advertises its own `.md` twin; the home page also advertises `/openapi.json` as `rel="service-desc"` |
| `/openapi.json` | OpenAPI 3.1 description of the public API |
| `/api/openapi.yaml` | The same document as YAML |
| `/api/v1` | The public JSON API. No key, no account, read only |

Every one of these sends `Access-Control-Allow-Origin: *` so a tool on another origin can fetch
them, and `X-Robots-Tag: index, follow` so they stay indexable.

### Structured data

`src/lib/seo/schema.ts` emits one merged `@graph` per page. Shared nodes carry stable `@id`s
(`#website`, `#author`, `#publisher`, `#app`) so every page describes the same entity rather than
71 unrelated ones. Per page it adds `BreadcrumbList`, the right page type (`HowToPage` for install
and guides, `DefinedTermSet` plus `DefinedTerm` for the glossary, `CollectionPage` for hubs),
`FAQPage`, `HowTo` where there are steps, `ItemList` where there is a list, and a `speakable`
selector pointing at `[data-answer]`.

## Crawler access

`src/app/robots.ts` allows everything, then names 37 AI and search crawlers explicitly. The named
block is not redundant: several of those crawlers only read the block that names them. `/api/og`, `/api/update/`
and `/download/` are disallowed for the wildcard because they are redirects and endpoints, not
pages. `/api/v1/`, `/api/openapi.yaml` and `/openapi.json` are explicitly allowed: they are the
machine-readable half of the site, and an agent that cannot crawl them cannot find the API.

## Runbook: Google Search Console

Helicon renders the verification tag from an environment variable, so there is nothing to commit.

1. Open <https://search.google.com/search-console> and add a property.
   - **Domain property** (`helicon.sh`) is better: it covers every subdomain and both schemes.
     It needs a DNS TXT record, which you add in Vercel under the domain's DNS settings.
   - **URL prefix** (`https://helicon.sh`) is faster: pick the HTML tag method, copy the
     `content` value, and skip to step 2.
2. For the HTML tag method, set the token as an environment variable and redeploy:
   ```sh
   vercel env add GOOGLE_SITE_VERIFICATION production
   vercel --prod
   ```
   The tag is emitted from `src/app/layout.tsx`. An unset variable emits no tag at all.
3. Back in Search Console, press Verify.
4. Submit the sitemap: Sitemaps → enter `sitemap.xml` → Submit.
5. Use URL Inspection on `https://helicon.sh/` and `https://helicon.sh/muse-code-gui`, then
   Request Indexing for each. Do the same for two or three more head-term pages. Google rate
   limits this, so do a handful a day rather than all 72.

Same pattern for the others, all optional:

| Service | Variable | Where to get it |
| --- | --- | --- |
| Bing Webmaster Tools | `BING_SITE_VERIFICATION` | <https://www.bing.com/webmasters> (it can import from Search Console in one click) |
| Yandex Webmaster | `YANDEX_VERIFICATION` | <https://webmaster.yandex.com> |
| Naver | `NAVER_SITE_VERIFICATION` | <https://searchadvisor.naver.com> |
| Google Analytics 4 | `NEXT_PUBLIC_GA_ID` | <https://analytics.google.com>. Link it to Search Console so queries and sessions line up. |

### The Search Console MCP server

`.mcp.json` at the repo root registers `mcp-server-gsc`, so Search Console data can be queried
from this repo without opening a browser. It reads `GOOGLE_APPLICATION_CREDENTIALS` and asks for
one scope, `webmasters.readonly`.

**Set up (done 2026-09-19):** the credentials are the owner's own, not a service account.

```sh
gcloud auth application-default login \
  --scopes=https://www.googleapis.com/auth/webmasters.readonly,https://www.googleapis.com/auth/cloud-platform
```

That writes `~/.config/gcloud/application_default_credentials.json`. Because the account is
already an Owner of the property, nothing has to be added in Search Console at all. Re-run the
command if the refresh token is ever revoked.

The committed `.mcp.json` carries `${GOOGLE_APPLICATION_CREDENTIALS}` and nothing more. The path
to the credentials file is machine-specific and belongs nowhere near a public repository, so it
is registered at **local scope** instead, in `~/.claude.json`, which is not tracked:

```sh
claude mcp add google-search-console --scope local \
  -e GOOGLE_APPLICATION_CREDENTIALS="$HOME/.config/gcloud/application_default_credentials.json" \
  -- npx -y mcp-server-gsc
```

Exporting the variable from a shell profile works too. Either way, never write the path into
`.mcp.json`.

The service account route is documented everywhere and is worse here: Search Console frequently
rejects a freshly created `name@project.iam.gserviceaccount.com` address with *"Failed to add
user: email not found"*, and it needs a delegation step that owner credentials do not. A service
account (`helicon-gsc@helicon-seo.iam.gserviceaccount.com`, key at
`~/.config/helicon/gsc-service-account.json`) exists as a fallback if a non-owner ever needs
access; it still has to be added as a Full user on the property before it can read anything.

## Runbook: IndexNow

Bing, Yandex, Seznam and Naver accept instant submission. Google does not participate.

The key lives in `public/<key>.txt` and must stay there. To submit:

```sh
node scripts/indexnow.mjs                 # everything in the sitemap
node scripts/indexnow.mjs /pricing /faq   # specific paths after an edit
```

Run it after any deploy that adds or materially changes pages.

## Verifying the whole surface

After a build, with `npx next start` running:

```sh
node scripts/seo-check.mjs                # every sitemap URL: canonical, title, description, h1, schema, og
node scripts/agent-check.mjs              # content negotiation, the 404 body, the API and the OpenAPI document
npm test                                  # the router, the OpenAPI document, the negotiation rules, the schema graph
```

`seo-check` fails loudly on a missing canonical, a duplicated `h1`, a description outside 80 to
185 characters, an unparseable `ld+json` block, or an accidental `noindex`.

`agent-check` covers what only exists once a server is running: that `/` answers Markdown with
`Vary: Accept` to `Accept: text/markdown` and HTML to a browser, that a path that does not exist
answers 404 with a Markdown body that links the indexes, that every endpoint the API index claims
returns parseable JSON, that a bad path, a bad parameter and a write each return the shared error
envelope, and that `/docs`, `/api-docs`, `/openapi` and `/swagger.json` land where they should.

Both take `BASE=https://helicon.sh` to run against production instead of a local build.

## The public API

`src/lib/api/router.ts` is the whole API: one dispatcher over path segments, served by
`src/app/api/v1/[[...path]]/route.ts`. It is written as a function of its input so that every
failure takes the same shape without a 405 handler per endpoint, and so that it can be tested
without a server.

`src/lib/api/openapi.ts` builds the OpenAPI 3.1 document from the same catalog the pages render
from, so the description cannot drift from the API. Adding an endpoint means adding a case to the
router, a path to the OpenAPI document and a row to the table on `/developers`; the tests fail
until the three agree.

Every error is `{ error: { code, message, hint, status, documentation_url } }`, with `code` drawn
from `ERROR_CODES` in `src/lib/api/contract.ts`. Agents branch on the code, show the message and
act on the hint.

## Tracking

```sh
npm run seo:report                          # last 7 days vs the 7 before
DAYS=28 npm run seo:report                  # any window
npm run seo:report -- --coverage            # plus index state for every page, ~90s
npm run seo:report -- --record --coverage   # the weekly run: records and writes a dated report
npm run seo:dashboard                       # rebuild seo-data/dashboard.html from the CSVs
```

Everything lands in `seo-data/`, which is committed, so the history is versioned and diffable:

| File | Written by | Holds |
| --- | --- | --- |
| `history.csv` | `--record`, weekly | Clicks, impressions, CTR, position, index coverage, sitemap state |
| `reports/YYYY-MM-DD.md` | `--record` | The full run, plus a section for what you changed because of it |
| `links.csv` | You, monthly | Referring domains, backlinks, domain rating |
| `aeo.csv` | You, monthly | One row per engine per question: runs, cited, mentioned, URL, accurate |
| `dashboard.html` | `seo:dashboard` | Charts over all three. Self-contained, opens from disk |

Fill in the "What I changed because of this" section of the dated report every week. A metric
that moved with no record of what you did to it teaches you nothing the following month.

It borrows a token from the same gcloud login the MCP server uses, so there is nothing else to
configure. Search Console data lags about two days; the script already offsets for that.

### Cadence

| Interval | What | Why |
| --- | --- | --- |
| **Never daily** | | Search Console is noisy at day resolution and the lag makes yesterday empty. Checking daily teaches you to react to noise. |
| **Weekly**, same day | `npm run seo:report` | Clicks, impressions, CTR, position, striking distance, and pages ranking but not clicked |
| **Weekly**, while young | `--coverage` | Until most pages are indexed, coverage is the only metric that moves. Drop this once it stops changing. |
| **Monthly** | Answer-engine check, below | Answer engines change retrieval without telling anyone |
| **Monthly** | Referring domains, directory tracker in DIRECTORIES.md | Links are the constraint, and they move slowly |
| **Quarterly** | Re-read the comparison pages | Other people's products change and a stale comparison is worse than none |

### What the numbers mean at each stage

**Weeks 1 to 6, indexation.** Clicks will be zero and that is not a problem to solve. The only
number that matters is how many of the pages are indexed, and the only lever is requesting
indexing (about 10 a day, hubs first) and earning links. Do not rewrite anything yet.

**Weeks 6 to 16, impressions without clicks.** Pages start appearing at position 30 to 60.
Impressions rising with clicks flat is the expected shape. Now the report's striking-distance
list starts to matter.

**After that, the two tables to act on.**

- *Striking distance*, position 4 to 20: one rank improvement on an existing page beats a new
  page. Add the specific thing the query asked for that the page did not answer.
- *Ranking but not clicked*, position 1 to 10 with CTR under 2%: the page is fine and the title
  and description are wrong. Rewrite the `title` and `description` in the content entry.

### Answer engines, monthly

There is no API for this. Answers are non-deterministic, so one run is an anecdote: ask each
question **five times per engine** and record the rate, not a yes or no.

Engines: ChatGPT, Claude, Perplexity, Google AI Mode, Copilot.

Questions worth tracking:

1. Is there a GUI for Muse Code?
2. Is there a desktop app for Muse Code?
3. How do I run Muse Code on Windows?
4. Best Muse Code client
5. Muse Code vs the terminal
6. How do I see what a Muse Code session cost?

Record: cited (5), mentioned but not cited, or absent; which URL; and whether the description is
accurate. A wrong description is worth fixing faster than an absent one, because it means the
model found the site and misread it, which is a content problem you can actually fix.

### What is not worth tracking

Keyword rank trackers on a domain this young, bounce rate, time on page, and the total number of
indexed pages as a goal in itself. Twenty indexed pages that answer something beat seventy that
nobody searches for.

## What this cannot do

Ranking for "Helicon" as a bare word is a domain-authority problem, not an on-page one. The site
is new and has almost no inbound links. The things that move it:

- Search Console verification and indexing requests, above. Nothing gets ranked before it gets
  indexed, and a brand-new domain can sit uncrawled for weeks.
- Links from places that already rank: the GitHub README, AlternativeTo, Product Hunt, the
  relevant subreddits and HN threads, and any post that links the site rather than the repo.
- Being mentioned where answer engines read: Wikipedia, Reddit, review sites, YouTube
  descriptions. Third-party mentions outperform your own domain for AI citation.
- Time. The head terms here are low competition, so the pillar pages should surface quickly once
  indexed. "Helicon" on its own competes with a mountain, a nebula, several companies and a
  helicopter manufacturer, and is the last term that will come.
