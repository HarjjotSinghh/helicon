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
| `Accept: text/markdown` | Any page, without the `.md` suffix. Handled in `src/proxy.ts` |
| `Link:` header | Every HTML page advertises its own `.md` twin |

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
block is not redundant: several of those crawlers only read the block that names them. `/api/` and
`/download/` are disallowed for the wildcard because they are redirects and endpoints, not pages.

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
```

It fails loudly on a missing canonical, a duplicated `h1`, a description outside 80 to 185
characters, an unparseable `ld+json` block, or an accidental `noindex`.

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
