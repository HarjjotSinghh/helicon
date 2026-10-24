# Helicon: a Muse Code GUI for VS Code

**Run Meta's Muse Code from a side panel in VS Code, Cursor or Windsurf, with your threads as tabs, approvals you can read before anything runs, and the diff of every edit.**

Helicon is free, MIT licensed and unofficial. It drives the `muse` CLI you already have, signed in with your own login, so there is no API key to paste and no credentials stored.

![The Helicon side panel in VS Code: a shell command waiting for approval, and a thread watching a pull request's checks](https://raw.githubusercontent.com/HarjjotSinghh/helicon/prod/docs/assets/vscode-panel.png)

## Install

- **VS Code:** [install from the Marketplace](https://marketplace.visualstudio.com/items?itemName=harjjotsinghh.helicon), or search "Helicon" in the Extensions view.
- **Cursor, Windsurf, Antigravity and other VS Code-based editors:** [install from Open VSX](https://open-vsx.org/extension/harjjotsinghh/helicon).
- **From a terminal:**

  ```sh
  code --install-extension harjjotsinghh.helicon
  ```

Works on Windows, macOS and Linux, including Remote-SSH, WSL and dev container windows. Needs VS Code 1.101 or newer.

## First run

1. Install the `muse` CLI and sign in once:

   ```sh
   curl -fsSL https://dev.meta.ai/install.sh | bash   # macOS and Linux
   irm https://dev.meta.ai/install.ps1 | iex          # Windows PowerShell
   muse login
   ```

   ([Help if the CLI isn't found](https://helicon.sh/guides/muse-cli-not-found))
2. Click the Helicon icon in the activity bar, or press `Cmd+Alt+H` (`Ctrl+Alt+H` on Windows and Linux). The panel opens on the folder you have open.
3. Type what you want changed. Each new thread opens as a tab, and the clock icon lists every earlier thread in the folder.
4. For every project at once, run **Helicon: Open Full Helicon in Editor** to get the full app in an editor tab.

Want to look around before installing anything? [Try the full app in your browser](https://helicon.sh/try?utm_source=vscode&utm_medium=listing&utm_campaign=extension) on sample data.

## What you get

- **Threads as tabs.** The threads you have open in this folder sit across the top of the panel. Every earlier one is under History, searchable and grouped by day. Drag the panel to the right-hand side bar if you prefer it there.
- **All your Muse Code threads for the folder,** including the ones you started in the terminal.
- **Approvals you can read.** You see the exact command or edit before it runs, then allow it, deny it, or let the thread run without asking until you close Helicon.
- **Inline diffs** at the point in the thread where each change happened, plus the list of files each thread touched.
- **Session history.** Reopen any past thread with its turns, tool calls and diffs.
- **Plan usage and cost.** Your 5-hour and weekly windows, and what each thread would have cost at API rates.
- **Several Muse accounts,** with each project remembering which one it uses.
- **Projects on other machines over SSH.**
- **Muse Code monitors.** A thread that's watching a build or a pull request's checks says so and has a Stop button. The turn a monitor woke up is marked.
- **Screen reader support,** reworked after a VoiceOver review. Status is announced once per change and focus stays in the thread.

![Helicon in 30 seconds](https://raw.githubusercontent.com/HarjjotSinghh/helicon/prod/docs/assets/launch.gif)

## How it works

The extension starts Helicon's local server on your editor's own Node runtime, bound to `127.0.0.1` only, and shows the Helicon UI in the side panel. That server runs `muse serve` and talks to it over MSP, the protocol Muse Code uses with its clients. Muse Code stays the agent, with the same models, tools and approval rules you get in the terminal.

In a Remote-SSH, WSL or dev container window the extension runs on the remote side, next to your code and its `muse` install, and the editor forwards the port for you.

## Commands

| Command | What it does |
|---|---|
| Helicon: Open Helicon | Show the Helicon panel |
| Helicon: New Thread | Start a new thread in the panel |
| Helicon: Open Full Helicon in Editor | The full app, with every project, in an editor tab |
| Helicon: New Thread in This Folder | From the Explorer's right-click menu: start a thread in any folder |
| Helicon: Open in Browser | Open the same session in your browser |
| Helicon: Restart Server | Restart the local server |
| Helicon: Show Log | Server output, for bug reports |

Setting: `helicon.panelBorder` puts the panel's divider line on the edge facing the editor (`auto`), or on the `left` or `right` edge if you moved Helicon to the other side bar.

## FAQ

**Do I need a Muse Code plan?**
Yes. Muse Code needs a Meta sign-in or a Model API key, billed on one of its 4 subscription plans or per token. The free Muse app does not include Muse Code. Helicon itself is free and adds no cost of its own.

**Is this an official Meta extension?**
No. Helicon is an unofficial community project, MIT licensed, and not made, sponsored or endorsed by Meta.

**Does it collect any data?**
No. The extension has no telemetry and no account. It talks only to the local server it starts, and that server talks only to Muse Code.

**Where do my credentials live?**
With the `muse` CLI, from your own `muse login`. Helicon never stores or handles them.

**Does it work in Cursor and Windsurf?**
Yes. Install it from [Open VSX](https://open-vsx.org/extension/harjjotsinghh/helicon). It runs in any VS Code-based editor built on VS Code 1.101 or newer.

## Also available

- **Desktop app** for Windows, macOS and Linux: [helicon.sh](https://helicon.sh/?utm_source=vscode&utm_medium=listing&utm_campaign=extension)
- **Source code** (MIT): [github.com/HarjjotSinghh/helicon](https://github.com/HarjjotSinghh/helicon)

Found a bug or want a feature? [Open an issue](https://github.com/HarjjotSinghh/helicon/issues).

---

Helicon is an unofficial community project, not affiliated with or endorsed by Meta. Muse Code is a trademark of Meta; the name is used only to describe what Helicon works with.
