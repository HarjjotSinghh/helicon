# ROTATE: HEL-REVOICE, 13 Oct 2026 (hand-off to H4R)

Supersedes /Users/harjjotsinghh/Documents/Projects/helicon/handover/ROTATE-HEL-REVOICE-2026-10-12.md (still holds the longer history).

## 1. Lane and goal
- Tag HEL-REVOICE (r2, thread mcp:4df7f024-8470-4757-bda0-6691e9dcdae9). Product: Harjot Codes channel Shorts (YouTube "Harjot Codes", IG @harjotcodes). Repo /Users/harjjotsinghh/Documents/Projects/helicon; videos in /Users/harjjotsinghh/Documents/Projects/helicon/marketing/videos/ (gitignored).
- Goal was to replace the cloned voice on 8 Shorts with Harjot's own recording. Done. Only housekeeping is left.
- Moving to new lane H4R (Harjot Codes YouTube + IG + HARJOT calendar). H4R owns the hc-* Shorts from now. COS thread: mcp:26708dfc-e479-4ebe-99e5-b4ebb3a322d5. HEL-CMO: mcp:5292a95b-1e3c-4afc-a4ee-0b7e78ff3eee (owns short-monitors, short-usage, Muse PR, and the shared Helicon browser profile).

## 2. State right now
- All posts below are left as scheduled. Nothing running: no background jobs, no browser open, no pending timers.
- Nothing half-finished.
- Scheduled tasks I own (1): `scheduled-task:command:mcp:ec2c40c9-0a51-4404-a89b-bbc0cbc21193:schedule-task:hel-revoice-r2-hc01-check-2026-10-12`, "hc-01 public check + pin", DISABLED (enabled=false, nextRunAt null). Work was done by hand. Safe to delete. Bound to thread mcp:4df7f024. The other scheduled tasks on this project (hel-cmo-oss-v3, hel-cmo-pitches-v4, hel-intro restore watches) belong to HEL-CMO / HEL-INTRO, not this lane.

## 3. Every hc-* Short (times IST, 12-hour; YouTube account mynameisthis696969@gmail.com)
| Video | Status | Slot | YouTube id | IG reel | HQ card (ws5) | Pair-1 thumb |
|---|---|---|---|---|---|---|
| hc-01-name | LIVE, pinned comment done | Mon 12 Oct, 10:02 PM YT / 10:01 PM IG | LM3-Ga_XAfQ | https://www.instagram.com/reel/DeZqxALgZCX/ (Business Suite id 1611262737107652) | tmv58ttmlc1gt (done; dup tmv58v1ymdvu9 merged) | saved |
| hc-05-three-lines | scheduled | Wed 14 Oct, 9:00 PM | QLKKrPsPSDw | scheduled, Business Suite id 1112278161451542 | tmv58tuorwfmd | saved; title "Agent stuck retrying? Paste these 3 lines." |
| hc-02-calls | scheduled | Thu 15 Oct, 7:30 PM | 0yMcpATZ6Hk | scheduled, id not shown by Business Suite | tmv58tvv9nxuk | saved; Helicon playlist |
| hc-03-five-releases | scheduled | Fri 16 Oct, 7:30 PM | 8JLHF1Pq18M | scheduled, id not shown | tmv58tx4qfd3y | saved; no playlist |
| hc-04-claude-limit | scheduled | Sat 17 Oct, 7:30 PM | r-tHXqBvIR0 | scheduled, id not shown | tmv58ty6at73b | saved; no playlist |
- Not mine (HEL-CMO): short-monitors lwVUf69ldsM (live), short-usage 5T5UJpVKNsI (Tue 13 Oct, 7:30 PM). Muse PR reel https://www.instagram.com/reel/DeZZl6pCM1h/ , card tmv58v10c2qnh. short-approvals stays live with the old voice; v3 file kept at /Users/harjjotsinghh/Documents/Projects/helicon/marketing/videos/short-approvals/revoice-v3/short-approvals-v3.mp4 for a possible repost.
- Slots for hc-05..hc-04 were checked on both YouTube and IG on 12 Oct: they match. AI label is OFF on every hc-* Short, including hc-01 (Harjot, 12 Oct: "dont turn label on for it"). Never turn it on without his go.
- Publisher (PUB) has track_external records for all 14 posts. Never mark them posted; HQ cards only.
- hc-01 pinned comment (live): https://www.youtube.com/watch?v=LM3-Ga_XAfQ&lc=UgyAc6_1BRMrBxiFcuZ4AaABAg . Text: Worst take: 01 "Harjote" or 04 "Hur-jote"?

## 4. Voice settings and files
- Current rule (since 12 Oct): Harjot records every voiceover. Declip if clipped, then ElevenLabs isolator, before any use. No clone or TTS unless he asks.
- Raw take: /Users/harjjotsinghh/Documents/Projects/helicon/marketing/videos/revoice-v3-review/manual-takes/harjot codes voiceovers.wav
- Declipped + isolated (every mix used this): /Users/harjjotsinghh/Documents/Projects/helicon/marketing/videos/revoice-v3-review/manual/iso/declipped-isolated.mp3
- Packs: <video>/revoice-v3/manual-vo/ (shorts, 1.0x) and manual-vo-1.2/ (hc-*, 1.2x speed). Outros: /Users/harjjotsinghh/Documents/Projects/helicon/marketing/videos/revoice-v3-review/manual/outro-1.2-matched/ (D default, H project showcases, F AI-tip videos).
- Final renders: /Users/harjjotsinghh/Documents/Projects/helicon/marketing/videos/<video>/revoice-v3/<video>-v3.mp4 (r1/r2 siblings are earlier rounds). Upload copy: <video>/UPLOAD.md (hc-01, hc-05), <video>/revoice-v3/UPLOAD-v3.md (hc-02, hc-03, hc-04). Thumbnails: <video>/revoice-v3/thumbs/pair{1,2,3}-9x16.jpg and AB-PAIRS.md.
- Tools: /Users/harjjotsinghh/Documents/Projects/helicon/marketing/videos/revoice-v3-review/tools/ (manual_cut.py, vo_pack.py, scribe.py, outro_match.py, breath.py, gem.py, pub.py). Recording rules: /Users/harjjotsinghh/Documents/Projects/helicon/marketing/videos/revoice-v3-review/RECORDING-SCRIPT.md
- Old clone, only if Harjot asks: ElevenLabs "Harjot Personal Voice" IizdIrzEP7Xm2Jc7sokR, eleven_multilingual_v2. His name only sounds right on eleven_v3 with Gurmukhi ਹਰਜੋਤ; calm, low energy, one clip per sentence. Full notes: memory file voiceover-setup.md. Clone clips appear only in hc-01 (the failed name takes).

## 5. Open asks (all need Harjot's go via COS; nothing posted or created yet)
1. **Pinned comments**, after each Short is public. Check HEL-CMO first (shared browser profile):
   - hc-05, after 9:00 PM Wed 14 Oct: "What's the one line in your CLAUDE.md you'd never delete?"
   - hc-02, after 7:30 PM Thu 15 Oct: "Has a dashboard ever missed a bill on you? Yes or no."
   - hc-03, after 7:30 PM Fri 16 Oct: "Which one would you have patched first, 3 or 5?"
   - hc-04, after 7:30 PM Sat 17 Oct: "Heads up: leave a session idle for over an hour and your next message re-reads everything too (the cache expires; 5 min on API or usage credits). How big is your CLAUDE.md?"
2. **Playlists**: UPLOAD copy wanted "Ship Log" (hc-03) and "Agent Desk" (hc-04). Neither exists, nothing created. Existing: Helicon, Product Demos, My beats, VFX Work, 8D Music, Detoxify.
3. **Trial reels**: Harjot never answered. My advice: keep scheduled reels normal; trials only as hook tests, 1-2 a week, posted by hand. Ask if the "Trial" toggle shows in his IG app (Business Suite composer has none).
4. **hc-01 description line** (optional): add "Narration: my own voice. The failed name clips are my AI voice clone." to the YouTube description. It is only in the IG caption now.
5. **Thumbnails**: pair 1 is saved on all five hc-* Shorts. Pairs 2 and 3 are files only (Shorts have no Test & compare). Unconfirmed: a visual check that hc-01 shows the NOPE-stamped "Harjote" crop (the browser agent saw a custom thumbnail reading "24 TRIES TO SAY MY NAME").
6. **hc-02 credit line**: the hc-02 description links https://github.com/HarjjotSinghh/helicon/pull/112 (utm tags in UPLOAD-v3.md line 11). PR #112, "Import OMP muse-code provider usage into the usage page", was written by contributor aminamos (Amin) and merged 9 Oct 2026. The copy has no line crediting Amin yet. Add one to the description (and check the on-screen text) with Harjot's go; wording is his call.

## 6. Next steps for H4R
1. Read this file, then confirm to COS in one line what H4R is picking up.
2. Update HQ cards when each Short goes public: `cd /Users/harjjotsinghh/Documents/Projects/helicon && node marketing/hq/hq.mjs patch <cardId> ...` (title "posted <day>, <time> IST", live YT + IG URLs in links, move to done). Define a shell function, not a variable, under zsh.
3. At each slot above, send COS the pin ask. After the go, post and pin via Studio > Comments with a Sonnet browser subagent on profile ~/.agent-browsers/helicon-89bc23 (agent-browser-mcp), after checking with HEL-CMO.
4. Put asks 2, 3, 4 and 6 in one numbered message to COS.
5. Delete the disabled task id in section 2 if not wanted.

## 7. Standing rules
- Humanizer on all prose; times in 12-hour IST; icons are Lucide SVGs, never Unicode glyphs; X copy in sentence case.
- Upload, delete, reschedule, thumbnail, comment and title changes each need Harjot's explicit go per video. Agents never approve or mark Publisher posts.
- One browser agent at a time on the Helicon profile. Browser and screenshot QA go to a Sonnet subagent that returns a short text verdict.
- Memory: /Users/harjjotsinghh/.claude-swap-backup/sessions/2-harjot_whiskeylibrary.com/projects/-Users-harjjotsinghh-Documents-Projects-helicon/memory/ . Lane brief: /Users/harjjotsinghh/Documents/Projects/helicon/handover/brief.md

## 8. Gotchas
- Two agents on the Helicon profile at once broke a Meta Business Suite composer. Run one.
- Business Suite sometimes loads in Hindi: add &locale=en_US. It shows no IG reel permalinks; take URLs from instagram.com/harjotcodes/reels.
- YouTube can leave a new upload as a private draft after the first schedule attempt. Reopen and schedule again.
- Pin text mix-up on 12 Oct: counter 01 = "Harjote", counter 04 = "Hur-jote"; "Harjoat" is take 04B at counter 08, a different take.
- Browser closed/target closed errors: the chrome watchdog restarted it. Retry once.
- Credentials (never print): ElevenLabs key in Keychain service "elevenlabs-api-key"; Publisher in /Users/harjjotsinghh/.config/social-publisher/agent.env (pub.py needs a user-agent header); Gemini key in ~/.gemini/.env.
- A stray ffmpeg (pid 35243) seen on 12 Oct was not mine; check `pgrep -fl ffmpeg` for your own.

## 9. Live links
- Studio: https://studio.youtube.com/video/<id>/edit for each id in section 3.
- Meta Business Suite Planner: https://business.facebook.com/latest/content_calendar?locale=en_US
- HQ board: https://helicon-hq.harjjotsinghh.workers.dev
- Publisher desk: $PUBLISHER_URL from agent.env.
