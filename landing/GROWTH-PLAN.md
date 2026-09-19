# Off-page plan

On-page work is finished. Everything below is off the site, because that is where the remaining
constraint is: 75 pages, all technically sound, and roughly two referring domains. Nothing you
change in the repository moves that number.

Ordered by leverage, not by effort. Written 2026-09-19 for Sunday 2026-09-20.

## Before you start: what I can ship without you

Three of the nine are code. They should not cost you a Sunday hour.

| # | Item | Where | Effort |
| --- | --- | --- | --- |
| 6 | `VideoObject` schema for the demo | `lib/seo/schema.ts`, needs the YouTube URL to be complete | 20 min |
| 7 | RSS and Atom for `/changelog` | new route, built from the same GitHub releases | 30 min |
| 8 | Site search, and a real `SearchAction` in schema | `cmdk` is already a dependency | 90 min |

Say the word and these are done before you wake up. Item 6 is better after item 3, because the
schema wants the YouTube URL.

## The day

Nine items is not a realistic Sunday. Eight are. **Item 9, localisation, is weeks of work, not
hours** — it is at the bottom for a reason and it should not be started tomorrow.

The order below is deliberate: mechanical work while you are fresh is a waste, and the research
in Block 3 is what Block 4 posts about, so it has to come first.

---

### Block 1, 45 minutes. Indexing and entities

**Why first:** short, mechanical, and the entity profiles feed AI training corpora, which is the
single highest ratio of AEO value to effort available.

1. **URL Inspection, 10 requests.** The quota reset overnight. Hubs first, because an indexed hub
   hands Googlebot 8 to 13 internal links at once:
   ```
   /features  /changelog  /legal  /privacy  /terms
   /install/wsl2  /compare/jetbrains-acp  /features/inline-diffs
   /features/remote-daemon  /guides/resume-a-muse-session
   ```
   That list comes from `npm run seo:report -- --coverage`, filtered to what Google has not
   discovered at all. Re-run it first in case the set has changed overnight.

2. **Wikidata.** Create an item for Helicon: instance of *free software*, *programmed in*
   TypeScript and Rust, *license* MIT, *repository*, *official website*, *developer*. Wikidata is
   read directly into several training and retrieval pipelines and almost nobody in this category
   has an entry.

3. **Crunchbase.** Organization profile. Even an unfunded open-source project can have one, and
   it is cited disproportionately by answer engines for "what is X".

4. **LinkedIn company page.** Name, one-line description, website, logo from
   `https://helicon.sh/brand/pfp-1024-light.png`. You do not have to post to it; the page itself
   is the entity record.

Copy for all three: the "Open source directories" variant in `DIRECTORIES.md`.

---

### Block 2, 90 minutes. YouTube

**Why:** answer engines cite YouTube heavily, and they do not watch the video. They read the
title, the description, the chapters, the transcript and the pinned comment. A 90-second demo
with a real text layer is one of the cheapest citable assets available.

1. Upload the existing demo video. It is already in `landing/public/demo/`.
2. **Title:** `Muse Code with a GUI: projects, sessions, diffs and cost in one window`
3. **Description, first two lines matter most:** the answer paragraph from `/muse-code-desktop-app`
   verbatim, then the install links, then the repository.
4. **Chapters.** Timestamps in the description. One per thing the video shows: sidebar, thread,
   approval, diff, usage. Chapters are indexed separately and can be cited on their own.
5. **Transcript.** Do not rely on auto-captions. Upload a corrected one: auto-captions will
   mangle "Muse Code", "MSP" and "WSL2", and those are exactly the terms you need matched.
6. **Pinned comment** with the links, because descriptions get truncated.
7. Link the video from `/muse-code-desktop-app` and the home page.

Send me the URL when it is live and I will add `VideoObject` schema (item 6) pointing at it.

---

### Block 3, 2 to 3 hours. Original research

**Why this is the highest-leverage item on the list:** it is the only content type that earns
links instead of asking for them, and you are sitting on data nobody else has.

Pick **one**. Do not attempt two.

**Option A, the strongest: "What a coding agent actually costs."**
You already compute per-thread cost at published rates. Run a controlled set of real tasks at
each reasoning effort, record tokens and wall-clock time, and publish the table. Nobody has
published this for Muse Code. Every person evaluating a subscription wants it, and every
"how much does X cost" article will cite it.

**Option B: "Every Muse Code GUI, tested."**
Install all of them. Score packaging, protocol depth, credential handling, approval behaviour,
Windows support. Be honest, including where Helicon loses. An honest roundup by a competitor is
unusually citable precisely because it is unusual.

**Option C: "What MSP 1.3.0 actually honours."**
You already know the schema promises things the implementation ignores. That is a genuine
finding, it is useful to every client author, and it is the kind of post Hacker News rewards.

Shape, whichever you pick: method first, raw numbers in a table, conclusion last. Publish it as a
page on helicon.sh, not Medium, so the links land on your domain. I can wire it into the
generated-page system so it gets the same schema, Markdown mirror and internal links as everything
else.

---

### Block 4, 90 minutes. Directories

**Why after research:** several forms ask for "notable coverage" and a research post is a better
answer than a GitHub link.

Work the Week 1 list in `DIRECTORIES.md`, in order: SaaSHub, SourceForge, OpenAlternative,
Slashdot, F6S, plus any `awesome-*` list where a pull request is the submission mechanism.

Rules that matter: use the per-tier copy variant, never the same paragraph twice; point each
listing at the page that answers what that audience searched for, not the home page; log every
submission in the tracker table at the bottom of `DIRECTORIES.md`.

Skip G2 and Capterra entirely. A zero-review listing is worse than no listing, and you need 10
reviews before either is worth creating.

---

### Block 5, 45 minutes. Reddit and Hacker News — prepare, do not post

**Why not tomorrow:** Sunday is the worst day of the week for both. HN front-page odds are
roughly halved at the weekend, and you get one shot per URL.

Tomorrow: write the posts. Post them **Tuesday or Wednesday, 8 to 10am US Eastern**.

- **Show HN**, only for the research post or the protocol angle. Never "we launched a GUI". Title
  it as the finding, not the product.
- **r/SideProject** and the **r/SaaS** "Share Your SaaS" thread: promotion is explicitly allowed.
- **r/Windows** or **r/bashonubuntuonwindows**: the WSL2 path-translation story is genuinely
  useful there and is not a pitch.
- Anywhere Muse Code is discussed: answer questions, link only when the link is the answer.

Claude and Perplexity index Reddit and HN more heavily than your own domain, so a genuine comment
thread is worth more for AEO than another page.

---

### Deferred: localisation

Real lever, wrong week. A dev tool gets substantial non-English traffic, and the generated-page
system would make `/es`, `/de`, `/ja` and `/zh` mechanical to route. What it would not make
mechanical is 75 pages of translation that has to stay correct as the product changes. Machine
translation of technical comparison content is worse than nothing, because a wrong claim in
Japanese is still a wrong claim.

Revisit when Search Console shows real non-English impressions. The report will show it.

---

## Sunday, on one screen

| Time | Block | Outcome |
| --- | --- | --- |
| 45 min | Indexing and entities | 10 URLs queued, 3 entity records live |
| 90 min | YouTube | Video live with transcript and chapters |
| 2 to 3 h | Original research | One post, published on helicon.sh |
| 90 min | Directories | 5 to 8 listings submitted and logged |
| 45 min | Write the HN and Reddit posts | Drafted, scheduled for Tuesday |

Roughly seven hours. If the day is shorter than that, drop Block 4 before Block 3: directories
can be done any evening, and the research is the thing that compounds.

## Closing the loop

End of day: `npm run seo:report -- --record --coverage`, then `npm run seo:dashboard`. Write what
you changed in the "What I changed because of this" section of the dated report. The next report
has nothing to compare against otherwise.
