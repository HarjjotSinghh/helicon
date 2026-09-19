# Directory and listing plan

Where to list Helicon, in what order, and with which copy. The point is not the listings, it is
the links: a new domain with no inbound links cannot rank for its own name, and answer engines
cite high-authority directories far more readily than a site's own pages.

Written 2026-09-19. Track progress in the table at the bottom.

## Readiness

| Requirement | State |
| --- | --- |
| Public, no wall | Yes |
| Pricing page | Yes, `/pricing`, plus `/pricing.md` |
| Alternative and comparison pages | Yes, 13 under `/compare` |
| Use-case pages | Yes, 8 under `/use-cases` |
| Single h1, clean heading order | Yes, enforced by `npm run seo:check` |
| FAQ schema and structured data | Yes, 414 Q&A pairs, `SoftwareApplication`, `Organization` |
| Logo in PNG and SVG, square, favicon | Yes. `assets/social/` has all of it, and the pieces a form asks for by URL are published under `https://helicon.sh/brand/` |
| 5 to 8 real screenshots at 1920x1080 | In `docs/assets`, worth re-exporting at that size |
| 60 to 90 second demo video | Yes, `landing/public/demo` |
| Privacy policy and terms pages | **Missing.** Several Tier 1 and Tier 2 directories require both |
| 20 users who could leave a review | Not yet. Blocks G2 and Capterra, which are dead without reviews |

One hard block before submitting anywhere that matters: **privacy and terms pages**. Everything
else can proceed.

Assets, by URL, for forms that want a link rather than an upload:

| | |
| --- | --- |
| Logo, SVG, dark on light | `https://helicon.sh/brand/helicon-logo-black.svg` |
| Logo, SVG, light on dark | `https://helicon.sh/brand/helicon-logo-white.svg` |
| Square mark, 2048 | `https://helicon.sh/brand/helicon-mark-2048.png` |
| Square avatar, 1024 | `https://helicon.sh/brand/pfp-1024-light.png` and `-dark.png` |
| Social card, 1200x630 | `https://helicon.sh/brand/og-light.png` and `og-dark.png` |
| Generated per page | `https://helicon.sh/api/og?title=...&subtitle=...&eyebrow=...` |

## Order

**Week 1, free and fast.** These take an afternoon and are the ones AI engines read.

1. AlternativeTo — already listed, keep the description current and add the new pages as links
2. SaaSHub
3. SourceForge (open source, accepts GitHub releases directly)
4. Slashdot
5. F6S
6. Crunchbase — matters disproportionately, it feeds AI training corpora
7. LinkedIn company page — same reason
8. Wikidata entry — same reason, and it is what Wikipedia would draw on later
9. OpenAlternative (open-source-only directory, exact fit)
10. Awesome lists: `awesome-ai-tools`, `awesome-agents`, any `awesome-muse-code` that appears

**Week 2, AI and developer directories.** Helicon is an AI coding tool, so these are on-category
rather than a stretch.

11. There's An AI For That (TAAFT)
12. Futurepedia
13. Toolify
14. Future Tools
15. aitools.inc
16. DevHunt
17. Dev.to profile plus a cross-posted technical article with a canonical URL back to the site
18. Hashnode, same pattern

**Week 3, the launch moment.** Do not do this before weeks 1 and 2, or the traffic lands on a
domain with no authority.

19. Product Hunt — Tuesday, Wednesday or Thursday, 12:01 AM Pacific. Ask for feedback, never for
    upvotes. Three weeks of account warm-up first.
20. Show HN — only with the technical angle: protocol-native MSP client, no TUI scraping, one
    React codebase shipping as Tauri and as a web app against a remote daemon
21. BetaList, Fazier
22. r/SideProject, r/SaaS "Share Your SaaS" thread, r/Windows for the Windows angle

**Rolling.** Reddit and Hacker News mentions are what Claude and Perplexity index most heavily in
this category. Participate honestly, ten comments for every link.

## Positioning, per surface

Do not paste the same text everywhere. Answer engines cross-reference and down-weight duplicates.

**Open source directories** (SourceForge, OpenAlternative, awesome lists). Lead with the licence.

> Helicon is an MIT-licensed desktop and web client for Meta's Muse Code CLI. It gives the agent
> a window: every project and session grouped by working directory, inline diffs, an approval
> queue that is never bypassed, and what each thread would have cost at published API rates. No
> account, no credential storage, no second bill. Tauri 2 and React, one codebase for the desktop
> app and the web build.

**AI tool directories** (TAAFT, Futurepedia, Toolify, Future Tools). Lead with the agent.

> Run Meta's Muse Code coding agent outside the terminal. Helicon indexes every agent session on
> your machine, renders each edit as an inline diff at the turn that made it, queues every
> approval instead of hiding it, and shows what the run cost. Free, open source, and it uses the
> Muse Code subscription you already pay for rather than its own API billing.

**Developer directories** (DevHunt, Dev.to, Hashnode, Show HN). Lead with the architecture.

> A protocol-native client for the Muse Code Session Protocol, built on Meta's MIT SDK rather
> than scraping the TUI. One `muse serve` host per workspace, all state in local SQLite, and
> sessions started from the terminal are discovered and resumable. The same React UI ships as a
> Tauri 2 desktop app and as a web app pointed at a daemon on another machine.

**SaaS and alternative directories** (AlternativeTo, SaaSHub, Slashdot). Lead with the comparison.

> The Codex and Claude-Code-desktop experience, for Meta's Muse Code. Projects and sessions in a
> sidebar, resume anything including terminal sessions, diffs in the thread, approvals surfaced,
> cost per thread. Signed Windows installer with WSL2 path translation, universal macOS DMG,
> Linux AppImage. Free and MIT.

**Startup directories** (Product Hunt, BetaList, F6S, Fazier). Lead with the outcome.

> Muse Code, without living in the terminal. Same Muse Code, same subscription, better interface.

Tagline, under 10 words: **Muse Code, without living in the terminal.**
Short description, 60 characters: **Free, open-source desktop app for the Muse Code CLI.**

## Link destinations

Point each listing at the page that answers what that audience searched for, not at the home page:

| Surface | Link to |
| --- | --- |
| Open source and developer | `https://helicon.sh/muse-code-desktop-app` |
| AI tool directories | `https://helicon.sh/muse-code-gui` |
| Alternative and comparison sites | `https://helicon.sh/compare` |
| Windows-specific posts and threads | `https://helicon.sh/install/windows` |
| Anything pricing-led | `https://helicon.sh/pricing` |

## What not to do

- Do not pay for a submission service. Every listing here is free.
- Do not submit to DR-under-10 link farms. They dilute the profile and Google reads them as spam.
- Do not submit to G2 or Capterra until there are 10 reviews to put on them.
- Do not ask for Product Hunt upvotes. Ask for feedback; the current algorithm penalises the ask.
- Do not claim to be official, the only GUI, or affiliated with Meta anywhere in this copy.

## Tracker

| Directory | Tier | Submitted | Live URL | Dofollow | Notes |
| --- | --- | --- | --- | --- | --- |
| AlternativeTo | SaaS | done | https://alternativeto.net/software/helicon/ | ? | Update description with the new pages |
| SaaSHub | SaaS | | | | |
| SourceForge | Open source | | | | |
| Crunchbase | Profile | | | | Feeds AI training corpora |
| LinkedIn company page | Profile | | | | Same |
| Wikidata | Profile | | | | Same |
| OpenAlternative | Open source | | | | |
| TAAFT | AI | | | | |
| Futurepedia | AI | | | | |
| Toolify | AI | | | | |
| DevHunt | Dev | | | | |
| Product Hunt | Launch | | | | Tue/Wed/Thu, 12:01 AM PT |
| Show HN | Launch | | | | Technical angle only |

Verify each live link passes equity: `Link: rel="nofollow"` absent means dofollow.
