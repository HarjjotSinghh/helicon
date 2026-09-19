# Changelog

## 0.14.3

### Fixed

- **A thread that stops receiving updates says so** ([#42](https://github.com/HarjjotSinghh/helicon/issues/42), reported by [@margantcovka](https://github.com/margantcovka)). When a turn's live updates go quiet, Helicon reloads the thread's history twice to catch up. If that does not move the turn on, it used to leave a spinner turning for ever. It now says the thread stopped receiving updates, explains that Muse is probably still working, and offers a reload.

### Changed

- **Helicon can now say whether a thread went quiet or was simply idle.** A long report of turns finishing while their view stood still could not be diagnosed, because nothing here recorded anything about the feed of updates. Each session now tracks when it last received one and what it received, frames the protocol refuses are recorded instead of vanishing, and updates that arrive without a session to belong to are counted rather than dropped in silence. All of it reads from `/api/health`. Nothing new leaves your machine: this is written to the local daemon and stays there.
- **One bad update can no longer take down every thread at once.** Handling an update ran unguarded inside the connection's read loop, so a single failure would have ended the connection to Muse and every thread on it. A failure is now contained to the update that caused it.

## 0.14.2

### Fixed

- **A thread stops freezing part-way through a long run** ([#32](https://github.com/HarjjotSinghh/helicon/issues/32), found and fixed by [@margantcovka](https://github.com/margantcovka) in [#41](https://github.com/HarjjotSinghh/helicon/pull/41)). 0.13.1 fixed one cause of this and missed the rest: it still happened with no subagents at all, on a thread of roughly 487 tool calls. Three things were wrong. Reloading a thread while another load was still running threw away every event that arrived in the meantime, so a turn's ending could vanish and the view would show it running for ever. Streaming text, long tool output and very large edits were each re-processed in full on every frame, which stalled the window as a thread grew. And a thread whose stream goes quiet now reloads itself instead of sitting there, which is what restarting the app used to do for you.

## 0.14.1

Same app as 0.14.0 on Windows and macOS. The step that repacks the Linux AppImage without its stale Wayland libraries failed on its first real run, so 0.14.0's AppImage still carried them; it is repacked properly here. Windows and macOS users on 0.14.0 lose nothing by updating.

## 0.14.0

### New

- **Session statistics above the composer** ([#39](https://github.com/HarjjotSinghh/helicon/pull/39), built by [@jorgitin02](https://github.com/jorgitin02)). Two pills summarise the open thread: turns, steps and the request-average speed in one, exact token counts with the cache split and a per-model breakdown in the other. Everything is worked out from the thread's own history on your machine; nothing is sent anywhere. Off by default, switched on under Settings -> Appearance -> Session statistics. On a long thread where only part of the history is loaded, the numbers say so rather than quietly under-reporting: details are marked *Partial* and the token total carries a `+`.

### Fixed

- **The Linux AppImage opens on current distributions** ([#38](https://github.com/HarjjotSinghh/helicon/pull/38), thanks [@orkuhh](https://github.com/orkuhh)). The bundler shipped Ubuntu 22.04's Wayland libraries inside the AppImage, and a newer system's graphics stack could not initialise against them, so the window never appeared ([tauri-apps/tauri#15665](https://github.com/tauri-apps/tauri/issues/15665)). The release now repacks the AppImage without those libraries so it uses the ones already on your system.
- **Two clicks that went to the wrong place** ([#36](https://github.com/HarjjotSinghh/helicon/issues/36), [#37](https://github.com/HarjjotSinghh/helicon/issues/37)). Finishing a sidebar drag no longer opens the thread you dropped, and Alt with the arrow keys no longer jumps threads while you are typing in the composer.

### Changed

- **Short durations read in milliseconds.** A tool call that took under a second used to say "under 1s", which told you nothing; it now says `412ms`.

## 0.13.1

### Fixed

- **A thread that ran subagents no longer grinds to a halt** ([#32](https://github.com/HarjjotSinghh/helicon/issues/32), reported by [@margantcovka](https://github.com/margantcovka)). Applying an event copied the whole thread's state, so each event cost more as the thread grew, and a long one eventually stopped updating while the work carried on without it. Subagent children drove the count, which is why only those threads hung: 20,000 of them took 36 seconds to apply and now take 8 milliseconds. They are also left out of the thread entirely now, since nothing ever showed them.

## 0.13.0

### New

- **Threads get a short generated title** ([#29](https://github.com/HarjjotSinghh/helicon/issues/29), built by [@orkuhh](https://github.com/orkuhh) in [#28](https://github.com/HarjjotSinghh/helicon/pull/28)). The first prompt still names a thread instantly, then one cheap `muse exec` call replaces the echo with a concise title and pushes it back to Muse Code, so the CLI shows the same name. A typed title, or a name Muse Code chose itself, is never touched, and anything that fails leaves the echo in place. Settings has a switch, a model choice, and says plainly that the calls run on your plan; off means no calls at all.

### Changed

- **Back on Settings and Usage returns where you came from** ([#27](https://github.com/HarjjotSinghh/helicon/pull/27), thanks [@orkuhh](https://github.com/orkuhh)), instead of always going home.
- **The desktop app asks helicon.sh for updates**, falling back to GitHub as before. That request is how we count roughly how many installs are in use, since downloads and stars say nothing about that: the platform, the version, and a hash of the IP salted per week, so two weeks of logs cannot be joined. Nothing about your code, prompts or files leaves your machine, and the README and FAQ both say so.
- **"Muse Code" everywhere it means the CLI.** Meta now ships a consumer assistant called Muse for Mac; Helicon is a client for Muse Code and unrelated to it, so the site and README never say bare "Muse" and both disclaimers name the two apart.

## 0.12.6

### New

- **Linux builds.** Releases now carry an x86_64 AppImage, which runs on most distributions and updates itself from then on. Thanks to [@orkuhh](https://github.com/orkuhh) ([#23](https://github.com/HarjjotSinghh/helicon/pull/23)), who also added Ubuntu to CI. A `.deb` will follow: Tauri's Debian bundler would install the bundled Node.js as `/usr/bin/node`, which collides with Debian's own `nodejs` package.

### Fixed

- **A collapsed sidebar can be reopened from Usage and Settings** ([#24](https://github.com/HarjjotSinghh/helicon/pull/24), thanks [@orkuhh](https://github.com/orkuhh)). Those pages draw their own header and had no toggle, so the only ways back were the Back button and Cmd/Ctrl+B.

### Changed

- **Plan usage says how old its numbers are** ([#26](https://github.com/HarjjotSinghh/helicon/issues/26)). Muse reports your plan's allowance with a model call and at no other time, so each row now carries the reading's age, and the card says plainly that the numbers only move when you send a prompt from a thread here. Work done in the terminal counts against the plan without ever reaching this card.

## 0.12.5

Same app as 0.12.4. GitHub refused the macOS update package on every upload attempt for that release, so macOS could not update itself to it; the release job now retries uploads. Windows users on 0.12.4 lose nothing by updating.

## 0.12.4

### Fixed

- **A failed turn's red banner no longer sticks around** ([#22](https://github.com/HarjjotSinghh/helicon/issues/22)). The banner has a close button, and a closed or retried banner stays closed when the thread reloads; before, reopening the thread or restarting the app brought it back. Once the conversation moves past a failed turn, the failure shows as a small "Failed · reason" note in the history instead of a full banner with no way to act on it.

## 0.12.3

### Changed

- **Ultra is gone from the effort picker.** Checked against a real `muse serve` 1.3.0: picking Ultra sends `max` to the model, so it was Max under another name, and the Muse CLI no longer offers it either. Max is now the top of the scale. A thread or setting left on Ultra carries on as Max, and `/effort ultra` still works and means Max.

## 0.12.2

### Fixed

- **Links open in your browser.** Clicking a link in a reply, like a pull request Muse mentions, did nothing in the desktop app. Web and mail links now open in the default browser or mail app, and a link can no longer navigate the Helicon window away. File links still open in the file viewer.

## 0.12.1

### Fixed

- **macOS stops asking for folder access over and over.** The app bundle was not properly signed, so macOS could not remember an Allow and asked again for every project, once for each process Helicon runs. The whole app is now signed as one, so a protected location like Documents asks once. Builds are not yet signed with an Apple Developer ID, so expect one prompt per location again after each update.

### New

- **Close the plan, goal and background-task cards.** Each card above the composer has a close button. A closed card stays hidden in that thread; while one has something to show, a button in the thread's top bar brings it back.

## 0.12.0

### New

- **Muse for Windows, no WSL.** Muse Code now runs natively on Windows, and Helicon runs it that way. When Muse for Windows is installed (`irm https://dev.meta.ai/install.ps1 | iex` in PowerShell), Helicon runs it directly with your Windows paths, runs `!` commands in PowerShell, and never starts WSL. Muse inside WSL2 keeps working: Helicon uses it when native Muse is not installed, and `HELICON_MUSE_RUNTIME=wsl` (or `--runtime wsl` for the web server) keeps WSL when both are. Threads started in WSL live with WSL's Muse, so they stay there. Setup, the sidebar status and Settings show which one is in use.
- **A file viewer beside the thread.** The folder button in the thread's top bar, or Cmd/Ctrl+Shift+E, opens the project's files on the right: a tree you can search by name, tabs, and a resizable panel.
  - Source files show with syntax highlighting and line numbers, and a link to a line range scrolls to and marks it.
  - Markdown opens as a rendered preview, with a toggle to its source, which you can edit and save (Cmd/Ctrl+S). If the file changed on disk since you opened it, Helicon asks before overwriting.
  - Images, video, audio and PDFs preview in place; anything else opens in its default app.
  - File paths Muse mentions in a reply, the files on read, edit and write tool rows, and the changed-file chips under a turn all open in the viewer. A file Muse edits reloads while it is open.
  - The viewer reads and writes only inside the project folder, and serves files so that a page in the project cannot run inside Helicon.

## 0.11.1

### Fixed

- **Dragging a project to reorder the sidebar works again.** The drop marker showed where a project would land, but letting go left the order unchanged, in the desktop app and in the browser alike. The drop handler was reading which project was being dragged from state captured before the drag began, when nothing was.

## 0.11.0

Built on the Muse Session Protocol methods that shipped with Muse Code 1.3.0, each checked against a real `muse serve` host.

### New

- **Plan usage.** The 5-hour window and the weekly cap, as Muse reports them with each model call, with when each resets. A small meter sits in the sidebar footer and a full card leads the usage page. This is your actual allowance, not the API-rate estimate the rest of the usage page shows. (`usage/read`, `usage/changed`)
- **Goal controls.** `/goal <objective>` now sets the goal through Muse's own goal command, which starts work on it straight away. `/goal pause`, `/goal resume` and `/goal clear` work from the composer, and the goal panel has Pause, Resume and Clear. Hosts without the goal commands keep the old behaviour. (`goal/set`, `edit`, `pause`, `resume`, `clear`)
- **Background tasks.** A running tool call can be sent to the background and keeps running while Muse moves on; one running there can be stopped, and a bar above the composer stops every background task in the thread at once. (`task/background`, `task/stop`, `task/stopAll`)
- **Workflow controls.** Cancel a running workflow, and skip or retry one of its agents from the workflow details sheet. (`workflow/cancel`, `workflow/childControl`)
- **Subagent controls.** Message a running subagent, give a finished one a follow-up task, stop, pause, resume, reopen or close it. These appear on subagents that carry a subagent id; Muse Code 1.3.0 does not report one yet (meta-models/muse-code-sdk#13), so they light up once it does. (`subagent/*`)
- **Full tool output.** Output Muse trimmed in the view gets a "Show full output" button that reads the stored log a page at a time. (`item/readOutput`)

### Fixed

- **Reasoning effort now takes effect.** Muse Code 1.3.0 accepts the effort sent with each turn and then drops it before the model call (meta-models/muse-code-sdk#6). Helicon now also sets it as the session's standing default, which Muse does apply, and the effort picker updates the open thread immediately.

### Changed

- **Skills come from the session.** With a thread open, the slash menu lists the skills Muse itself resolves for that session, and refreshes when Muse says they changed; the `muse skills list` CLI call remains for new threads and for reading a skill's instructions. Skills that declare an argument hint show it. (`skill/list`, `skill/changed`)
- **Renames reach Muse.** Renaming a thread renames the Muse session too, so the CLI and `/name` addressing see the same name, and a rename made in another Muse client shows up here. (`session/rename`, `session/nameChanged`)
