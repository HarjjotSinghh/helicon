# Helicon for VS Code

**A GUI for the Muse Code CLI, right in your editor.** Threads in a sidebar, approvals you can actually read, diffs where the edit happened, session history, and what each thread would have cost. Helicon drives the `muse` CLI you already have, with your own login and subscription: no API key, no credentials stored.

![Helicon in 30 seconds](https://raw.githubusercontent.com/HarjjotSinghh/helicon/prod/docs/assets/launch.gif)

Works in VS Code, Cursor, Windsurf, Antigravity and other VS Code-based editors, on Windows, macOS and Linux, including Remote-SSH and WSL windows.

## What you get

- **Every Muse Code thread in one place**, grouped by project, including the ones you started in the terminal.
- **Approvals you can read:** see the exact command or edit before it runs, then allow or deny it, or let the thread run without asking until you close Helicon.
- **Inline diffs** at the point in the thread where the change happened.
- **Session history:** reopen any past thread with its turns, tool calls and diffs.
- **Plan usage and cost:** your 5-hour and weekly windows, and what each thread would have cost at API rates.
- **Several Muse accounts,** each project remembering which one it uses.
- **Projects on other machines over SSH.**

## Get started

1. Install the `muse` CLI and run `muse login` once. ([Help if it isn't found](https://helicon.sh/guides/muse-cli-not-found))
2. Click the Helicon icon in the activity bar, then **Open Helicon**, or run **Helicon: Open Helicon** from the command palette (`Cmd+Alt+H` / `Ctrl+Alt+H`).
3. To start in the folder you have open: **Helicon: New Thread in This Folder**, or right-click a folder in the Explorer.

## How it works

The extension starts Helicon's local server on your editor's own Node runtime, bound to `127.0.0.1` only, and opens the Helicon UI in an editor tab. The server runs `muse serve` and talks to it over MSP, the protocol Muse Code speaks to its clients, so Muse Code stays the agent: same models, same tools, same approval rules. Nothing is sent anywhere except to Muse Code itself, and the extension has no telemetry.

In a Remote-SSH, WSL or dev container window the extension runs on the remote side, next to your code and its `muse` install, and the editor forwards the port for you.

## Commands

| Command | What it does |
|---|---|
| Helicon: Open Helicon | Open the Helicon tab |
| Helicon: New Thread in This Folder | Add the folder as a project and start a thread there |
| Helicon: Open in Browser | Open the same session in your browser |
| Helicon: Restart Server | Restart the local server |
| Helicon: Show Log | Server output, for bug reports |

## Also available

- **Desktop app** for Windows, macOS and Linux: [helicon.sh](https://helicon.sh/?utm_source=vscode&utm_medium=listing&utm_campaign=extension)
- **Source code** (MIT): [github.com/HarjjotSinghh/helicon](https://github.com/HarjjotSinghh/helicon)

Found a bug or want a feature? [Open an issue](https://github.com/HarjjotSinghh/helicon/issues).

---

Helicon is an unofficial community project, not affiliated with or endorsed by Meta. Muse Code is a trademark of Meta; the name is used only to describe what Helicon works with.
