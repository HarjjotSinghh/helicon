# HEL lane handover (rebuilt 12 Oct 2026)

Note: this file was lost on 12 Oct when an agent overwrote it and then renamed its copy. It was rebuilt from the HEL main thread's context; the HEL-INTRO, arrow-fix and Softonic sections at the end are restored word for word from T3 checkpoint e9c167b (12 Oct, 2:58 PM IST). Lane handovers now use suffixed files: NEXT-ab-thumbs.md, NEXT-peerlist-voice.md, NEXT-revoice-v3.md, NEXT-social-visuals.md. Never overwrite NEXT.md; append to it.

## Done 11 Oct
- Outreach: 15 pitches drafted, 13 delivered (Leonardo Grigorio and andrew.ooo bounced), Joske clip reply sent. Log: marketing/outreach/sent-log.md
- Directories day 3 live: dev.to, daily.dev, Indie Hackers, CodeTriage, StackShare. EveryDev and SideProjectors in review. SourceForge skipped (password-only).
- Discussions posted: OMP https://github.com/can1357/oh-my-pi/discussions/15325, Tauri https://github.com/orgs/tauri-apps/discussions/16252
- DevHunt paid $9; launches Tue 13 Oct 00:00 UTC. Peerlist week 42 (Mon 12 Oct); featured spot not bought.
- PRs merged #122-#127; released v0.21.7. SignPath application submitted (Harjot, own Chrome).
- Decision 010: 150 weekly actives by 18 Oct, 250 by the week of 1 Nov.
- aiagentslisting.com verified (free badge route): verify file 47f065b, badge a0509ea. The badge must stay up (daily re-check).
- Footer badges: PR #128 (0913de4) moved them into the brand column as one small flex-wrap row. Live QA passed.
- Directory traffic: only AlternativeTo converts (73 visitors, 19 downloaders). The dashboard has a `referrer_downloads` table. AlternativeTo push = item 10 in marketing/weekly-plan/2026-10-11.md.

## Done 12 Oct
- Peerlist launch day. Scroll launch post post_SvJrrA_9C7RKRZeY (approved, thumbnail attached). Launch card ext_5hdzNgdpyWq7vSAD. Maker comment post_pMxK6_-M7ilTRR1K published.
- Re-rendered the ↗ posts with the SVG arrow: 13 Oct Peerlist post_5RnEYFukZWaVWU63, plus 14 Oct X post_4eq0J8LMhf2m4ERX, LinkedIn post_vmUtMvsvy0A0v4C_, IG post_rsxgv0vgGkEkSYXR and Peerlist post_dGkvgBM68s39m4Rs. All pending Harjot's approval.
- awesome-agents #831: one clarification comment posted (Muse Code vs Muse), PR left closed.
- Outreach: Harjot sent 15 pitches and 12 FU1s; 14 delivered, NullsCode bounced (Yandex). FU dates 15, 19 and 26 Oct.
- Softonic rejection: see the restored section at the end.
- OSS check: merged 7/100, stars 81/5,000. The terms say applications closed 30 Jun 2026 unless extended; confirm the window is open.
- YouTube A/B: Shorts have no Test & compare. Pairs made for short-monitors (lwVUf69ldsM) and short-usage (5T5UJpVKNsI); asks are with COS. See NEXT-ab-thumbs.md.
- Standing rules added to brief.md: voiceovers manual + isolator, humanizer, SVG icons (emoji OK), Peerlist first person + local paths, publisher conventions, revision loop, YouTube A/B.

## Next
1. Tue 13: DevHunt launch day; social pilot day 1; pace checkpoint t041.
2. Tue/Wed: Show HN (Harjot writes every word).
3. Fri 16: Product Hunt (marketing/product-hunt/READINESS-2026-10-11.md).
4. 18 Oct: weekly-actives review + AlternativeTo and directory check (weekly plan section 7).
5. 25 Oct: SignPath follow-up; buy Certum if SignPath hasn't approved. Apple ID revisit.

## Open asks to Harjot
- "fix muse": re-render the 13 Oct Peerlist image ("Muse" should read "Muse Code") and switch it and the 14 Oct post to "9:30 AM IST".
- SignPath code-signing policy notice on helicon.sh/download: add or skip.
- Approve visuals v2 (marketing/social-visuals/out/v2-approval/), drop the watermark?
- AI Agents Listing badge dark-mode ring; 16px sideways scroll at 390px.

## Gotchas
- PostHog MCP points at the Whiskey Library project. Query Helicon through the dashboard key (marketing/dashboard/.env, project 611283).
- Don't run browser agents on the Helicon profile while HEL-REVOICE is scheduling hc-02/03/04; wait until it says the profile is free.
- Publisher MCP isn't loaded in some sessions. Agents call it through a temp node script that reads agent.env, then delete the script.
- marketing/ is never committed. Root AGENTS.md and CLAUDE.md are kept local through .git/info/exclude.

## Standing rule
T+2 run-ahead for social posts: see handover/brief.md.

## HEL-INTRO lane (11 Oct, late)
- Restore-Staging backup done: gdrive:Restore-Staging-archives-2026-10-11, all 505,363 files verified end to end (fresh download + SHA-256). Local source deleted with Harjot's OK; old partial copy gdrive:Restore-Staging-backup-2026-10-10 kept. Log: ~/.agents/cos/operations/migration-status/HEL-INTRO.md. Watch task disabled.
- Disk: 85 GiB free after cleanup (caches, idle .next, Rust release target, qwen-image-studio deleted).
- Re-voice offer for hc-02/03/04 (rendered on 10 Oct with the old clone, never uploaded) is superseded: from 12 Oct Harjot records all voiceovers himself. hc-02's planned slot still clashes with hc-05 (Wed 14 Oct, 9 PM).
- Gotcha: rclone gdrive uses the shared client_id, which is being retired in 2026. Make your own client_id before any restore.

## d01-signin CTA arrow fix (11 Oct, separate session)
- The CTA arrow is now an inline Lucide arrow-up-right SVG (`cta()` / `ARROW` in marketing/social-visuals/templates/templates.mjs and templates/v2/templates.mjs, `.button .cta-icon` in both base.css files). Every CTA gets the icon. A trailing arrow glyph in post JSON is stripped, so you don't need to edit the old posts.
- d01-signin was re-rendered and its media swapped on the same Publisher ids. Approval was reset, and COS has been told.
- Next: Harjot re-approves the 3 posts. The 14 Oct posts pick up the SVG only if they are re-rendered.

## Softonic rejection (12 Oct, research only)
- Cause: 0.21.5 x64-setup.exe unsigned + 2/61 VT ML hits (Sophos "Generic ML PUA", DeepInstinct "MALICIOUS"). Likely false positive.
- Do not resubmit until Windows signing lands (SignPath, fallback Certum OSS cert). Azure Artifact Signing is not open to individuals in India.
- Full report: marketing/directories/softonic-rejection-2026-10-12.md

## HEL-CMO: PH readiness + X reply drafts (14 Oct)
- Done: PH run sheet at /Users/harjjotsinghh/Documents/Projects/helicon/marketing/product-hunt/RUNSHEET-2026-10-16.md (live page state, 8 gaps, IST timeline Thu 15 to Sat 17, paste-ready launch X post). LAUNCH-KIT.md facts rechecked (86 stars, 14 forks, v0.21.9, wave 2 label fixed to 9 AM ET). READINESS-2026-10-11.md has a section 7 status check.
- PH live page (read 14 Oct): post scheduled 16 Oct 00:01 PT, video + 6 gallery + logo set. Open: stale description (paste 257-char text), empty category, no forum teaser, co-makers unknown, preview click-through, teasers 1/2 status unknown (Typefully MCP 403), PH profile unverified.
- Done: 5 X reply drafts for the fit-5 leads at /Users/harjjotsinghh/Documents/Projects/helicon/marketing/outreach/x-reply-drafts-2026-10-14.md. Draft only. Nothing posted, liked, followed, submitted or scheduled.
- Next: Harjot closes the PH gaps by Thu 15 evening; approves/edits the 5 drafts; send Wed/Thu or Sat 17+, never Fri 16 (PH day). If a lead replies, use the held follow-up with the /try UTM link in the drafts file.
- Next (agent): Sat 17 badge PR draft if PH badge won; check AlternativeTo moderation; GSC recheck 3 Nov; remeasure /muse-code-gui about 28 Oct.
- Gotchas: marketing/ is gitignored (edits not committed). Typefully MCP returns 403; use `node typefully.js` set 306162. Show HN already live 13 Oct, no HN work. Standing holds: no outreach on 16 Oct, creator FU drafts stay with Harjot, no new creator pitches.

## HEL-CTO: v0.22.0 (14 Oct 2026)
- Shipped #138 (SDK 1.4.7, Resume run), #139 (#95), #140 (#94 undo), #141 (#93 LaTeX), then Release 0.22.0 (#142, tag v0.22.0 on c9719ab). Details and the release recipe: /Users/harjjotsinghh/Documents/Projects/helicon/handover/CTO.md
- Next: check the Release and Extension workflow runs finished; the HEL-CMO inbox already has the announce line.
- Gotcha: landing/public/try was rebuilt in the release commit and now includes KaTeX fonts (woff2, woff, ttf).

## HEL-CMO, 14 Oct: SEO desk free-pass fixes (all live on helicon.sh)
- b341ab3: Linux added to home title, OG alt/title, llms-full.txt heading, features.tsx desktop caption.
- 89cfe0f: 25 titles shortened in source (catalog.ts, seo/content/*.ts, changelog page, /try in apps/web/vite.config.ts + committed landing/public/try/index.html). 0 of 86 sitemap titles over 60.
- a7599e7: /muse-code-gui gap fill (Linux install step, Windows signing note, cost + plan meter section). No rewrite until 28 Oct remeasure.
- IndexNow 200 for 86 URLs. SEO inbox has 4 lines.
- Open: 2 descriptions over 200 chars (/guides/macos-first-launch, /use-cases/windows-developers), not touched. AlternativeTo edit still in moderation.
- Gotcha: /try title lives in apps/web/vite.config.ts; rebuilding /try needs VITE_POSTHOG_KEY, so patch the built index.html too.
