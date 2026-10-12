# HEL revoice-v3 lane handover, 11 Oct 2026

## Done (step 1: previews)
- 8 previews, old clone vs v3, at `marketing/videos/<video>/revoice-v3/preview/<video>-{old,v3}-preview.mp4`.
- Review page: `marketing/videos/revoice-v3-review/index.html` (15 MB, all media embedded as data URIs at 540p; full 720p clips stay in each preview/ folder). Sonnet QA: 20/20 media play from a folder holding only index.html.
- Outro name takes (eleven_v3, ਹਰਜੋਤ): `revoice-v3-review/outro/vo/lines/outro-follow-{1,2,3}.wav`. The outro is shared by all 5 hc-* videos.
- Credits: preview estimate 4,878 (account counter moved 2,154). Full run: 8,217 total, about 3,339 more.
- Added `--only slug,...` to `~/.agents/skills/harjot-voiceover/scripts/vo.py`, plus a SKILL.md line. Context still comes from the full list.

## Next: step 2, only after Harjot approves
1. Generate the rest: `python3 vo.py <video>/revoice-v3/lines.json --out <video>/revoice-v3/preview/vo --takes 3`. It resumes and skips existing takes.
2. hc-*: point a copy of the project at the new takes and re-run build.mjs, which re-times the timeline and anchors scenes to words. Then mix and render to `revoice-v3/<video>-v3.mp4`. Don't overwrite assets/ or renders/: work in a copy (e.g. `revoice-v3/build/`).
3. Swap the outro in the hc-* builds for the take Harjot picks.
4. short-*: the cues in index.html are fixed. Re-time the vo/caption starts by hand (short-usage drifts about 1 s). Master to -14 LUFS (old renders sit near -18.5).
5. Get Harjot's go per video for each swap.
   - YouTube: upload the new version to the same slot, then delete the old one. Keep altered/synthetic = Yes and the AI-voice caption line.
   - Meta Business Suite (@harjotcodes, Instagram login): schedule the new Reel in the same slot with the same caption, then delete the old one.
   - Then call publisher MCP `track_external` once per platform with the same ref:
     - YouTube: source/platform as in PUB.
     - Reel: source "Meta Business Suite", platform "instagram".
     - Pass the new external_id and the exact file_path.
   - Creds are in `~/.config/social-publisher/agent.env`. Never print the token.
   - Tell PUB (thread a119617c...) about each swap.
   - YouTube ids: approvals f5EpV_IECb4, monitors xLb8iXWCSBI, hc-01 s30n4oDoTN0 (moved to 12 Oct 10:00 PM IST, keep this slot), usage -09RJ9KeEmQ, hc-05 LGVAUFRbW-I.

## Gotchas
- `marketing/` is gitignored in the helicon repo, so none of this is committed.
- Tools are in `revoice-v3-review/tools/`: pick.py, preview.py (reuses hc-short mix.py with patched paths), page.py, credits.py.
- In preview.py the short-* ffmpeg mix hung with `apad,atrim`. It now uses `duration=longest` + `-t`.

## Round 2 (11 Oct evening): Harjot said v3 sounds lazy, breathy, name too deep
- Test page: `marketing/videos/revoice-v3-review/energy.html` (60 embedded clips, QA 60/60 play). Results: `energy/results.json`.
- Breaths: no ElevenLabs switch. `tools/breath.py` cuts breaths (unvoiced, -12 dB under speech, centroid < 4 kHz, >= 180 ms) and caps pauses at 0.30 s. `tools/check_breath.py`: 52 takes, 25 breaths cut, 0 words lost. Must be added to the polish step before the full run.
- Energy: settings C (stab 0.35, sim 0.75, style 0.4) gives the most pitch movement (6.8 st vs 6.0 current, old clone 9.0).
- Name: eleven_v3 + [warmly] renders the PVC at about 131 Hz; the old outro is 150 and his real voice about 140. Take 3 shifted +1.5 st (rubberband --formant) lands at 143 Hz.
- Waiting on: a delivery letter, a name option, and an outro draft (6 drafts on the page). The previews must be redone with the chosen settings before step 2.

## Round 3: Harjot will record all 8 himself (Maono mic)
- Script and rules: `marketing/videos/revoice-v3-review/RECORDING-SCRIPT.md`. Drop folder: `revoice-v3-review/manual-takes/<video>.wav` + `outro.wav` (3 outro options A/B/C, 3 takes each).
- Pipeline once the files land:
  1. Split on silence (3 takes per line, 1 s gaps, 3 s between lines).
  2. Whisper-match each take to its line.
  3. Run `tools/breath.py`.
  4. Run the Voice Isolator: `python3 ~/tools/isolate-voice/isolate.py <files> --go`. It bills per minute, so check the cost first.
  5. Level to -20 LUFS.
  6. Pick takes (by length fit), then build a review page for Harjot.
- Then re-time:
  - hc-*: build.mjs re-times from the new line lengths.
  - short-*: fix the vo/caption starts by hand.
- Then mix to -14 LUFS and render to `revoice-v3/<video>-v3.mp4`.
- AI disclosure changes for videos with his real voice. Only hc-01 still holds clone audio (the phone clips). Ask Harjot before changing the YouTube flag or the caption.

## Schedule change (11 Oct)
- hc-01 is now at 12 Oct 10:00 PM IST on YouTube + the IG Reel, and PUB records are updated. The @harjotcodes grid: 13:00 Helicon, 16:30 Brio, 19:30 HC Shorts, 22:00 spare. Space posts 2-3 h apart.
- Publisher MCP without the MCP: `revoice-v3-review/tools/pub.py <tool> '<json>'` (needs a user-agent header; Cloudflare 403s urllib's default).

## Standing rule (COS, 12 Oct 2026)
1. Voiceovers are manual from now on: Harjot records them himself. No clone or TTS voiceover unless he asks. ElevenLabs is still fine for music, SFX, the isolator and Scribe.
2. AI label off by default: when swapping a re-voiced Short onto YouTube and IG, set YouTube "altered or synthetic content" = No and remove the AI-voice caption line, only when the audio is entirely his real voice. hc-01 keeps the label (it still has the clone phone clips) unless those are removed or re-recorded. Ask Harjot only if a case is unclear.
- Skills updated by COS: harjot-voiceover, harjot-codes-shorts.

## Isolated audio used by every mix (12 Oct)
- Raw take: `marketing/videos/revoice-v3-review/manual-takes/harjot codes voiceovers.wav`. It clipped, so it was declipped first (`-6 dB, adeclip`) into `revoice-v3-review/manual/iso/declipped.wav`.
- Isolated: `revoice-v3-review/manual/iso/declipped-isolated.mp3`. All three files sit side by side. Every render (the 3 Helicon shorts, hc-01..05 at 1.2x) was cut from this file via `tools/manual_cut.py`, then breath-cut and levelled. Checked by md5 on 12 Oct.
- Packs: `<video>/revoice-v3/manual-vo/` (1.0x, shorts) and `manual-vo-1.2/` (hc, rubberband 1.2x). Outros: `revoice-v3-review/manual/outro-1.2/`.

## Swaps done (12 Oct)
- short-monitors YT lwVUf69ldsM / IG 3726326604187737 (12 Oct 7:30 PM); short-usage YT 5T5UJpVKNsI / IG 1691588212533862 (13 Oct 7:30 PM): label No.
- hc-01 YT LM3-Ga_XAfQ / IG 1611262737107652 (12 Oct 10:00 PM): Harjot chose label No despite the clone clips; IG caption keeps "Narration: my own voice. The failed name clips are my AI voice clone."
- hc-05 YT QLKKrPsPSDw / IG 1112278161451542 (14 Oct 9:00 PM): label No.
- short-approvals: live, left as is (v3 file kept for a repost). PUB records updated for all swaps.
- Next: hc-02/03/04 new uploads 15/16/17 Oct 7:30 PM once Harjot OKs `<video>/revoice-v3/UPLOAD-v3.md` (covers from the new cut, not old renders/).

## YouTube A/B pairs (rule from 12 Oct)
- Shorts have no Test & compare, only a custom thumbnail "Upload file" (checked on hc-01, hc-05 and Muse PR). Pair 1 becomes the custom thumbnail after Harjot's go. Pairs 2 and 3 are kept as files next to the video.
- hc-01 pairs: /Users/harjjotsinghh/Documents/Projects/helicon/marketing/videos/hc-01-name/revoice-v3/AB-PAIRS.md (thumbs/pair{1,2,3}-9x16.jpg and -16x9.jpg).
- hc-05, hc-02, hc-03, hc-04: <video>/revoice-v3/AB-PAIRS.md once made.
- hc-05/02/03/04 pairs done: <video>/revoice-v3/AB-PAIRS.md (thumbs/pair{1,2,3}-9x16 and -16x9). Numbers checked against SCRIPT.md receipts (209-line CLAUDE.md, 58h 58m, 21/36 commits, 7,248). Each pair 1 is waiting for Harjot's go; nothing is saved in Studio.
- Scheduled 12 Oct: hc-02 YT 0yMcpATZ6Hk (15 Oct, 7:30 PM IST), hc-03 YT 8JLHF1Pq18M (16 Oct, 7:30 PM IST), hc-04 YT r-tHXqBvIR0 (17 Oct, 7:30 PM IST), and IG Reels at the same times. Pinned comments go up after each one is public (text in UPLOAD-v3.md).
- 12 Oct, about 4 PM IST: pair 1 custom thumbnails saved in Studio for hc-01, hc-05, hc-02, hc-03 and hc-04. hc-05's title is now "Agent stuck retrying? Paste these 3 lines." (PUB record updated). The Muse PR thumbnail (ab-thumb-1) was uploaded before Harjot's hold; HEL main is redoing it and short-usage's.
