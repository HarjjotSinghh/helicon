import type { IconKey, SeoPage } from "../types";

/**
 * Comparison pages. One per tool people weigh Helicon against, written from the honest position
 * in .agents/product-marketing.md: Helicon is not the only Muse Code GUI, editor options exist,
 * and several of these tools are not competitors at all because they run a different agent.
 */

const UPDATED = "2026-09-19";

type Entry = {
  slug: string;
  icon: IconKey;
  label: string;
  /** How the tool is written in prose. */
  name: string;
  title: string;
  h1: string;
  description: string;
  answer: string;
  keywords: string[];
  /** Rows of the at a glance table: [dimension, Helicon, the other tool]. */
  rows: string[][];
  what: string[];
  differences: [string, string][];
  pickOther: string[];
  pickHelicon: string[];
  together: string;
  faqs: { q: string; a: string }[];
};

const ENTRIES: Entry[] = [
  {
    slug: "muse-code-terminal",
    icon: "terminalWindow",
    label: "The muse terminal",
    name: "the muse terminal TUI",
    title: "Helicon vs the muse terminal: Muse Code with a UI",
    h1: "Helicon vs the muse terminal TUI",
    description:
      "How a Muse Code GUI differs from the muse CLI terminal interface: session history, inline diffs, approvals and cost, side by side with what the TUI already does well.",
    answer:
      "The muse terminal TUI is the official way to run Muse Code and it stays the fastest path for a single task in one repo. Helicon is a desktop and web GUI over the same CLI: it adds persistent session history across projects, inline diffs, a visible approval queue and per thread cost, and it can resume sessions the TUI started.",
    keywords: [
      "muse code gui vs terminal",
      "muse code without terminal",
      "muse cli terminal alternative",
      "muse code tui",
      "muse code session history",
    ],
    rows: [
      ["Where it runs", "Desktop app or browser against a daemon", "Any terminal emulator"],
      ["Session history", "Every session listed per project, resumable", "Scrollback, until the tab closes"],
      ["Several repos at once", "Sidebar grouped by working directory", "One terminal tab per repo"],
      ["Diffs", "Inline in the thread, where the edit happened", "Patch text in the scroll"],
      ["Approvals", "A queue you can see and act on", "Inline prompt you have to be watching for"],
      ["Cost", "Per thread, per day, per model at API rates", "Not shown"],
      ["Offline setup", "Needs the muse CLI installed and logged in", "Is the muse CLI"],
      ["Who ships it", "Community, MIT, unofficial", "Meta, official"],
    ],
    what: [
      "The muse TUI is the interface that ships with Muse Code. You run `muse` in a directory, it starts a session in that working directory, and the whole conversation lives in that terminal tab. It is the reference implementation, it gets features first, and it is what every Muse Code doc assumes you are using.",
      "Helicon does not replace it. Helicon starts `muse serve` per workspace and speaks the Muse Code Session Protocol to it through Meta's MIT licensed SDK, which is the supported way to build a client. Your authentication stays in your own `muse login`. Both interfaces can be open at once against the same machine.",
    ],
    differences: [
      [
        "History survives the tab",
        "In the TUI, a session is as durable as the terminal it runs in. Close the tab or reboot and the thread is gone from view even when the underlying session still exists. Helicon keeps a local SQLite index of projects, sessions and turns, so every thread is one click away, including threads you started in the TUI.",
      ],
      [
        "Parallel work has a home",
        "Running four agents means four terminal tabs and remembering which is which. Helicon groups threads by working directory, isolated git worktrees included, and shows which ones are running, which finished, and which are blocked on you.",
      ],
      [
        "Approvals stop being a race",
        "A terminal approval prompt only helps if you are looking at that tab. Helicon surfaces every approval request as it arrives, maps onRequest, promptUnmatched and denyUnmatched one to one, and never batches or bypasses them.",
      ],
      [
        "Diffs sit next to the sentence that caused them",
        "The TUI prints a patch. Helicon renders the edit as a diff in the thread at the point the agent made it, and opens the touched file in a viewer beside the conversation.",
      ],
      [
        "You can see what the subscription did",
        "Helicon shows what each thread would have cost at Meta's published per token rates, broken down by day, model and thread. It is a meter reading, not a bill. The TUI does not surface this.",
      ],
    ],
    pickOther: [
      "You are doing one focused task in one repo and want zero extra software.",
      "You are on a remote box over SSH with no desire to forward a port.",
      "You want the first build of every new Muse Code feature, the day it ships.",
      "You script Muse Code from CI or a Makefile, where a GUI has nothing to add.",
    ],
    pickHelicon: [
      "You run several agent threads across repos and lose track of which needs you.",
      "You want to reopen last Tuesday's session with its full history.",
      "You are on Windows and want an installer rather than terminal plumbing.",
      "You want approvals and costs visible instead of implied.",
    ],
    together:
      "Most people end up using both. Start a quick one off in the terminal, then open Helicon when you want the history, the diffs or the approval queue. Sessions started in the TUI show up in the Helicon sidebar automatically, and you can resume them there without losing context.",
    faqs: [
      {
        q: "Does Helicon replace the muse CLI?",
        a: "No. Helicon requires the muse CLI to be installed and logged in. It drives `muse serve` and speaks the Muse Code Session Protocol to it. If the CLI is not there, Helicon has nothing to talk to.",
      },
      {
        q: "Can Helicon see sessions I started in the terminal?",
        a: "Yes. The daemon discovers sessions for a workspace regardless of which interface started them, so TUI sessions appear in the sidebar with full history and can be resumed from the app.",
      },
      {
        q: "Is there a performance cost to running the GUI?",
        a: "Helicon runs one `muse serve` host per workspace, the same process the CLI would start. The UI is a Tauri window, and all state is local SQLite. The agent itself runs exactly as it would from the terminal.",
      },
    ],
  },
  {
    slug: "vs-code-extension",
    icon: "code",
    label: "VS Code extensions",
    name: "a VS Code Muse extension",
    title: "Helicon vs VS Code Muse Code extensions",
    h1: "Helicon vs a VS Code extension for Muse Code",
    description:
      "A standalone Muse Code desktop app compared with running the muse CLI inside VS Code: where an editor panel wins, where a separate session home wins, and how to run both.",
    answer:
      "VS Code extensions put Muse Code in a panel next to the file you are editing, which is the right place for a quick change. Helicon is a separate window whose job is the session list: every project, every thread, resume, diffs, approvals and cost in one place, independent of which editor you happen to have open.",
    keywords: [
      "muse code vs code extension",
      "muse cli chat vscode",
      "muse code editor integration",
      "muse code gui vs extension",
      "vscode muse code",
    ],
    rows: [
      ["Lives in", "Its own window, or a browser tab", "The VS Code sidebar"],
      ["Scope", "All projects on the machine at once", "The open workspace"],
      ["Editor lock in", "None, works beside any editor", "VS Code and forks"],
      ["Session list", "Grouped by directory, all history", "Usually per window"],
      ["Diffs", "Inline in the thread plus a file viewer", "Native editor diff"],
      ["Cost view", "Per thread, day and model", "Not typically included"],
      ["Remote machines", "Same UI against a remote daemon", "Via Remote SSH or dev containers"],
      ["Billing", "Your Muse Code subscription", "Your Muse Code subscription"],
    ],
    what: [
      "Several community extensions bring the muse CLI into VS Code. They give you a chat panel inside the editor, which means the agent's output is a click away from the file tree you already have open, and applying an edit lands in the editor's own diff view. For a single repository and a single task that is hard to beat.",
      "Helicon takes the other position. It is a standalone app whose primary object is the session, not the file. The sidebar lists every project on the machine, each with its threads, and the thing you resume is a conversation rather than a folder. That difference matters most when you are running work in four repos and want one place to see which ones are waiting on you.",
    ],
    differences: [
      [
        "One workspace versus every workspace",
        "An editor extension is scoped to the window it lives in. Helicon indexes projects across your machine, including isolated git worktrees, and shows them in one sidebar with their sessions underneath.",
      ],
      [
        "The editor keeps working",
        "Helicon does not care which editor you use. Neovim, Zed, JetBrains, Xcode or VS Code: the thread lives in its own window and the file viewer beside it opens whatever path the agent mentions.",
      ],
      [
        "Cost is surfaced",
        "Helicon shows what threads would have cost at published API rates, by day, model and thread. This is a meter reading on your existing subscription, not a bill, and it is not something editor panels usually show.",
      ],
      [
        "Approvals are a queue, not a toast",
        "Approval requests are listed and stay listed until you act. onRequest, promptUnmatched and denyUnmatched are mapped one to one and never bypassed.",
      ],
      [
        "Windows is a first class target",
        "Helicon ships a signed Windows installer with auto update, runs Muse Code natively on Windows, and falls back to Muse Code inside WSL2 with path translation both ways when native is not installed.",
      ],
    ],
    pickOther: [
      "Your work is one repo at a time and the file tree is the thing you care about.",
      "You want edits to land in the editor's own diff and staging flow.",
      "You already live in VS Code and do not want another window.",
    ],
    pickHelicon: [
      "You want a session home that outlives any single editor window.",
      "You triage several threads across repos and worktrees.",
      "You want cost, approvals and full history in one surface.",
      "You are on Windows and want an installer, not setup.",
    ],
    together:
      "They compose cleanly. Keep the extension for inline work in the repo you are editing, and open Helicon when you want to see everything at once or resume something from last week. Both talk to the same muse CLI and the same subscription, so there is no second bill and no second login.",
    faqs: [
      {
        q: "Is Helicon the only GUI for Muse Code?",
        a: "No. VS Code extensions exist, editor integrations over ACP exist, and there are other open source wrappers. Helicon is the standalone desktop and web option with a signed Windows installer and a cross project session list.",
      },
      {
        q: "Can I run Helicon and a VS Code extension at the same time?",
        a: "Yes. Both drive the same muse CLI. Sessions started in either are visible to the daemon, so Helicon can list and resume work an extension started in that workspace.",
      },
      {
        q: "Do I need a second subscription?",
        a: "No. Helicon uses your existing Muse Code subscription through your own `muse login`. It stores no credentials and adds no billing of its own.",
      },
    ],
  },
  {
    slug: "zed-acp",
    icon: "lightning",
    label: "Zed with ACP",
    name: "Zed with an ACP bridge",
    title: "Helicon vs Zed + muse-acp for Muse Code",
    h1: "Helicon vs Zed with an ACP bridge",
    description:
      "Running Muse Code inside Zed through an Agent Client Protocol bridge, compared with a standalone Muse Code desktop app. Editor native versus session native.",
    answer:
      "Zed can drive Muse Code through an Agent Client Protocol bridge, which puts the agent in the editor you are already writing in. Helicon is a separate desktop and web app built directly on the Muse Code Session Protocol, so it keeps the session list, approvals, diffs and cost across every project rather than inside one editor window.",
    keywords: [
      "muse code zed",
      "muse-acp zed",
      "zed agent client protocol muse",
      "muse code editor agent",
      "muse code acp bridge",
    ],
    rows: [
      ["Protocol", "Muse Code Session Protocol, direct", "Agent Client Protocol, bridged"],
      ["Surface", "Standalone app or browser", "Zed's agent panel"],
      ["Project scope", "Every project on the machine", "The open Zed project"],
      ["Session resume", "Any past session, including TUI ones", "Depends on the bridge"],
      ["Cost view", "Per thread, day and model", "Not part of ACP"],
      ["Windows", "Signed installer, native or WSL2", "Zed's own platform support"],
      ["License", "MIT", "Varies by bridge"],
    ],
    what: [
      "The Agent Client Protocol lets an editor talk to any conforming agent. Bridges exist that expose Muse Code over ACP so Zed and JetBrains IDEs can use it. You get the agent inside the editor, with the editor's own buffers, diffs and keybindings, and you can swap agents without changing editors.",
      "Helicon does not go through a bridge. It speaks the Muse Code Session Protocol over JSON-RPC to `muse serve` using Meta's MIT SDK, which means capabilities that are specific to Muse Code, such as the exact approval modes and the usage reporting, arrive intact rather than flattened into a generic agent interface.",
    ],
    differences: [
      [
        "Protocol fidelity",
        "A bridge maps Muse Code onto a general agent interface. Anything the general interface has no word for has to be dropped or approximated. Helicon reads the protocol directly, so approval modes, reasoning effort, subagents, goals and usage arrive as they are.",
      ],
      [
        "What the interface is about",
        "The editor panel is about the file you are in. Helicon's sidebar is about the session you are resuming. Those are different jobs, and which one you want depends on whether you are writing code or supervising agents.",
      ],
      [
        "Where the history lives",
        "Helicon keeps a local index of projects, sessions and turns in SQLite, so history is not tied to a workspace being open in a particular editor.",
      ],
      [
        "Remote work",
        "The same Helicon UI runs as a web app pointed at a daemon on another machine, so a laptop can drive agents on a workstation or a server without SSH forwarding an editor session.",
      ],
    ],
    pickOther: [
      "You live in Zed and want the agent in the same window as your buffers.",
      "You want to switch between several agents behind one editor interface.",
      "You prefer the editor's native diff and multibuffer review flow.",
    ],
    pickHelicon: [
      "You want Muse Code specific behaviour surfaced exactly, not bridged.",
      "You supervise several threads across repos and want one list.",
      "You want cost and approval history that outlives the editor session.",
      "You are on Windows and want a signed installer.",
    ],
    together:
      "Use the editor bridge while you are writing, and Helicon when you are supervising. Both run against the same muse CLI and the same subscription, so nothing has to be chosen once and for all.",
    faqs: [
      {
        q: "Does Helicon support the Agent Client Protocol?",
        a: "Helicon is a Muse Code Session Protocol client. It talks to `muse serve` directly through Meta's MIT SDK rather than going through ACP.",
      },
      {
        q: "Can I use both Zed and Helicon against one Muse Code install?",
        a: "Yes. They share the CLI and your `muse login`. Helicon's daemon discovers sessions for a workspace, so work started elsewhere is listed and resumable.",
      },
      {
        q: "Which one gets Muse Code features first?",
        a: "In general, whichever layer is thinnest. A direct protocol client can expose a new Muse Code capability as soon as the SDK does, while a bridge needs the general protocol to grow a word for it first.",
      },
    ],
  },
  {
    slug: "jetbrains-acp",
    icon: "browsers",
    label: "JetBrains IDEs",
    name: "a JetBrains IDE with an ACP plugin",
    title: "Helicon vs JetBrains + ACP for Muse Code",
    h1: "Helicon vs a JetBrains IDE with an ACP plugin",
    description:
      "Muse Code inside IntelliJ, PyCharm, GoLand or WebStorm through an Agent Client Protocol plugin, compared with a standalone Muse Code desktop app.",
    answer:
      "A JetBrains ACP plugin puts Muse Code in the IDE tool window, next to the refactoring and inspection tools you already use. Helicon is a separate desktop and web app on the Muse Code Session Protocol, built for the session list: every project, thread, diff, approval and cost figure in one place regardless of IDE.",
    keywords: [
      "muse code intellij",
      "muse code jetbrains",
      "muse code pycharm",
      "muse code webstorm agent",
      "jetbrains muse acp plugin",
    ],
    rows: [
      ["Surface", "Standalone app or browser", "IDE tool window"],
      ["Protocol", "Muse Code Session Protocol, direct", "Agent Client Protocol, bridged"],
      ["Project scope", "Every project on the machine", "The open IDE project"],
      ["Refactoring tools", "Not applicable", "Full IDE toolset beside the agent"],
      ["Cost view", "Per thread, day and model", "Not part of ACP"],
      ["Memory footprint", "One Tauri window", "On top of the JVM the IDE already needs"],
      ["Remote daemon", "Yes, same UI in a browser", "Via the IDE's own remote development"],
    ],
    what: [
      "JetBrains IDEs are strong when the work is heavily language aware: safe renames, structural search, a debugger that knows your framework. An ACP plugin adds an agent to that, so you can hand a task over without leaving the tool window.",
      "Helicon is deliberately not an IDE. It has a file viewer with syntax highlighting, Markdown preview and editing, and image, video and PDF preview, because you need to read what the agent touched, but it does not try to be where you write code. Its job is the session and the approval queue.",
    ],
    differences: [
      [
        "Different objects",
        "The IDE's object is the project you have open. Helicon's object is the thread, and threads are grouped by the directory the agent worked in, worktrees included.",
      ],
      [
        "Startup and weight",
        "Opening a thread in Helicon does not require indexing a project or waiting on a JVM. It is a small window against a local daemon.",
      ],
      [
        "Cost and usage",
        "Helicon reports the 5 hour window and weekly cap as Muse Code itself reports them, plus what threads would have cost at API rates. That reporting is Muse Code specific and does not travel over a general agent protocol.",
      ],
      [
        "Windows",
        "Helicon ships a signed Windows installer with auto update and runs Muse Code natively on Windows, or inside WSL2 with path translation when that is your setup.",
      ],
    ],
    pickOther: [
      "Your workflow depends on JetBrains refactoring, inspections or the debugger.",
      "You want one window for both writing and delegating.",
      "You already pay for the IDE and want to consolidate surfaces.",
    ],
    pickHelicon: [
      "You want a session home that is independent of any IDE project.",
      "You run threads across several repos and want them in one list.",
      "You want to drive agents on a remote machine from a browser.",
      "You want Muse Code approvals and usage exactly as the protocol reports them.",
    ],
    together:
      "Keep the IDE for the code and Helicon for the agents. Both drive the same muse CLI on the same subscription, and Helicon's daemon lists sessions no matter which client started them.",
    faqs: [
      {
        q: "Does Helicon have refactoring tools?",
        a: "No. Helicon is a client for the Muse Code CLI with a read oriented file viewer. Language aware refactoring stays in your editor or IDE.",
      },
      {
        q: "Can Helicon open files in my IDE?",
        a: "Paths the agent mentions open in Helicon's own viewer beside the thread. You can keep the IDE open on the same repository at the same time.",
      },
      {
        q: "Is Helicon heavier than an IDE plugin?",
        a: "It is a separate Tauri window with a local daemon rather than a plugin inside a running JVM. In practice that is a smaller resident footprint than an extra IDE project window.",
      },
    ],
  },
  {
    slug: "claude-code-desktop",
    icon: "appWindow",
    label: "Claude Code desktop",
    name: "the Claude Code desktop app",
    title: "Helicon vs the Claude Code desktop app",
    h1: "Helicon vs the Claude Code desktop app",
    description:
      "Two desktop apps for two different coding agents. What Helicon borrows from the Claude Code desktop experience, and what changes because the agent underneath is Muse Code.",
    answer:
      "They are the same shape for different agents. The Claude Code desktop app is Anthropic's official window over Claude Code and its subscription. Helicon is an unofficial, MIT licensed desktop and web app over Meta's Muse Code CLI and your existing Muse Code subscription. Pick by which agent and which billing relationship you already have.",
    keywords: [
      "helicon vs claude code desktop",
      "muse code vs claude code",
      "claude code desktop alternative",
      "coding agent desktop app",
      "muse code desktop app",
    ],
    rows: [
      ["Agent underneath", "Muse Code CLI, from Meta", "Claude Code, from Anthropic"],
      ["Who ships it", "Community, unofficial", "Anthropic, official"],
      ["License", "MIT, source on GitHub", "Proprietary"],
      ["Billing", "Your Muse Code subscription", "Your Anthropic plan"],
      ["Windows", "Signed installer, native or WSL2", "Official builds"],
      ["Web version", "Same UI against a remote daemon", "Not the same shape"],
      ["Price", "Free, no paid tier", "Included with the plan"],
    ],
    what: [
      "The Claude Code desktop app made the case that a terminal coding agent deserves a window: a list of sessions, diffs you can read, approvals you can see, and a place to come back to. That case is the reason Helicon exists.",
      "Helicon applies the same idea to Muse Code. It is not a port, a fork or a reimplementation of anything Anthropic ships. It is an independent MIT project built on Meta's Muse Code Session Protocol SDK, and its sidebar is organised by working directory rather than by a hosted account.",
    ],
    differences: [
      [
        "Different agent, different subscription",
        "This is the decision. Helicon cannot run Claude Code, and the Claude Code app cannot run Muse Code. If you hold a Muse Code subscription, Helicon is the app that uses it.",
      ],
      [
        "Open source and inspectable",
        "Helicon is MIT licensed with the desktop app, web app, daemon and this website in one public repository. You can read exactly what it sends, which matters when the thing being wrapped has file system and shell access.",
      ],
      [
        "No account of its own",
        "Helicon has no sign up, no server side account and no credential storage. Authentication is your own `muse login`, held by the CLI. The only network call Helicon makes on its own behalf is an update check.",
      ],
      [
        "One codebase, desktop and web",
        "The same React UI ships as a Tauri desktop app and as a web app pointed at a daemon elsewhere, so the browser version is not a reduced second product.",
      ],
    ],
    pickOther: [
      "Your subscription is with Anthropic and your agent is Claude Code.",
      "You want a first party app with vendor support.",
    ],
    pickHelicon: [
      "Your subscription is Muse Code and you want it out of the terminal.",
      "You want the client to be open source and auditable.",
      "You are on Windows and want a signed installer with auto update.",
      "You want the same interface in a browser against a remote machine.",
    ],
    together:
      "Nothing stops you running both. They are separate agents with separate billing, and plenty of people keep one of each open. Helicon makes no claim to be a replacement for the Claude Code app, only the equivalent home for Muse Code sessions.",
    faqs: [
      {
        q: "Can Helicon run Claude Code?",
        a: "No. Helicon is a Muse Code Session Protocol client. It drives the muse CLI and nothing else.",
      },
      {
        q: "Is Helicon made by Meta?",
        a: "No. Helicon is an unofficial community project, MIT licensed, not made, sponsored or endorsed by Meta. Muse and Muse Code are Meta trademarks, used here only to say what Helicon connects to.",
      },
      {
        q: "Does Helicon cost anything?",
        a: "No. It is free and MIT licensed with no paid tier. It runs on the Muse Code subscription you already have, so there is no second bill.",
      },
    ],
  },
  {
    slug: "codex-app",
    icon: "robot",
    label: "Codex app",
    name: "the Codex and ChatGPT desktop app",
    title: "Helicon vs the Codex desktop app",
    h1: "Helicon vs the Codex and ChatGPT desktop app",
    description:
      "How a Muse Code desktop client compares with OpenAI's Codex app: same category, different agent, different billing, different openness.",
    answer:
      "The Codex desktop experience wraps OpenAI's coding agent and your OpenAI plan. Helicon wraps Meta's Muse Code CLI and your Muse Code subscription. Both give a terminal agent a window with projects, sessions, diffs and approvals. The choice is decided by which agent you already pay for, not by the interface.",
    keywords: [
      "helicon vs codex app",
      "codex desktop app alternative",
      "muse code vs codex",
      "openai codex gui",
      "ai coding agent desktop app",
    ],
    rows: [
      ["Agent underneath", "Muse Code CLI, from Meta", "Codex, from OpenAI"],
      ["Who ships it", "Community, unofficial", "OpenAI, official"],
      ["License", "MIT", "Proprietary"],
      ["Billing", "Existing Muse Code subscription", "OpenAI plan or API"],
      ["Local state", "SQLite on your machine", "Vendor managed"],
      ["Remote daemon", "Yes, same UI in a browser", "Cloud execution model"],
      ["Approvals", "Surfaced one to one, never bypassed", "Vendor defined"],
    ],
    what: [
      "Codex popularised the idea that you can hand a task to an agent and come back to a reviewable result rather than watching a terminal. Its desktop and cloud surfaces are built around that.",
      "Helicon is local first by design. The daemon runs on your machine, one `muse serve` host per workspace, all state in SQLite next to you, and nothing about your code, prompts, threads or files leaves the machine. The only outbound request Helicon makes for itself is an update check.",
    ],
    differences: [
      [
        "Local first versus cloud first",
        "Helicon does not execute work in someone else's environment. The agent runs where you run it, against the checkout on your disk.",
      ],
      [
        "Auditability",
        "MIT licensed, one public repository for the desktop app, web app, daemon and site. You can read the protocol calls it makes.",
      ],
      [
        "Subscription reuse",
        "Helicon adds no billing. It uses your existing Muse Code plan through your own `muse login`, which is exactly the complaint people have about tools that route a paid plan into their own API metering.",
      ],
      [
        "Windows",
        "Signed installer, auto update, native Muse Code on Windows with WSL2 and path translation as the fallback.",
      ],
    ],
    pickOther: [
      "Your agent is Codex and your plan is with OpenAI.",
      "You want cloud execution and vendor managed environments.",
    ],
    pickHelicon: [
      "Your agent is Muse Code and you want a window for it.",
      "You want everything to stay on your machine.",
      "You want an open source client you can read and fork.",
      "You want one UI that works as a desktop app and in a browser.",
    ],
    together:
      "They do not conflict. Different agents, different bills, different repositories if you like. Helicon only claims to be the home for Muse Code sessions.",
    faqs: [
      {
        q: "Does Helicon send my code anywhere?",
        a: "No. Nothing about your code, prompts, threads or files leaves your machine. The desktop app asks helicon.sh whether a newer version exists, which reports the platform, the version and a weekly hash of the IP. There is no account.",
      },
      {
        q: "Can Helicon run tasks in the cloud?",
        a: "It can point at a daemon on another machine you control, which is how the web app works. It does not execute work in a hosted environment run by us.",
      },
      {
        q: "Is Helicon a fork of anything?",
        a: "No. It is an independent MIT project built on Meta's Muse Code Session Protocol SDK.",
      },
    ],
  },
  {
    slug: "cursor",
    icon: "cursor",
    label: "Cursor",
    name: "Cursor",
    title: "Helicon vs Cursor for Muse Code users",
    h1: "Helicon vs Cursor",
    description:
      "Cursor is an AI editor with its own models and billing. Helicon is a window over the Muse Code CLI on your existing subscription. What each one is actually for.",
    answer:
      "Cursor is a full AI editor with its own agent, its own models and its own subscription. Helicon is not an editor: it is a desktop and web client for Meta's Muse Code CLI that reuses the subscription you already pay for. If you want an editor, that is Cursor. If you want a home for Muse Code sessions, that is Helicon.",
    keywords: [
      "helicon vs cursor",
      "cursor alternative open source",
      "muse code vs cursor",
      "cursor vs coding agent gui",
      "cursor muse code",
    ],
    rows: [
      ["Category", "Client for the Muse Code CLI", "AI first code editor"],
      ["Agent", "Muse Code, yours", "Cursor's agent and models"],
      ["Billing", "Existing Muse Code subscription", "Cursor subscription, usage based tiers"],
      ["Editing", "File viewer and Markdown editing", "Full editor, its own fork of VS Code"],
      ["License", "MIT, open source", "Proprietary"],
      ["Multi repo triage", "Sidebar across all projects", "Per window"],
      ["Cost visibility", "Per thread, day and model", "Plan dashboard"],
    ],
    what: [
      "Cursor replaces your editor. Tab completion, inline edits, an agent mode, and a set of models it routes for you. It is a product you buy as a whole, and it is good at being the place you write code.",
      "Helicon replaces nothing. It assumes you already write code somewhere you like and already pay for Muse Code, and it gives that agent a window: projects, sessions, resume, inline diffs, approvals and a cost view, as a Tauri desktop app or in a browser.",
    ],
    differences: [
      [
        "You are not buying a model",
        "Helicon brings no model, no routing and no inference bill. It drives the muse CLI you already have. That is the whole point: same Muse Code, same subscription, better interface.",
      ],
      [
        "Editor freedom",
        "Helicon works beside Neovim, Zed, JetBrains, Xcode, Emacs or VS Code. There is no migration and no extension ecosystem to rebuild.",
      ],
      [
        "Open source",
        "MIT licensed and readable, which matters for a tool that can run shell commands on your machine.",
      ],
      [
        "Approvals are explicit",
        "Every approval Muse Code raises is surfaced and never bypassed. Allow all exists but sits behind a deliberate opt in.",
      ],
    ],
    pickOther: [
      "You want one application for writing and delegating.",
      "You want tab completion and inline edits from the same vendor.",
      "You are happy paying for a second AI subscription.",
    ],
    pickHelicon: [
      "You already pay for Muse Code and want to use it outside the terminal.",
      "You do not want to change editors.",
      "You want an open source client with no credential custody.",
      "You want to see approvals and cost rather than trust them.",
    ],
    together:
      "Cursor and Helicon can sit on the same machine without arguing. Write in Cursor if you like it, and let Helicon hold the Muse Code threads. They bill separately because they are separate products.",
    faqs: [
      {
        q: "Can Cursor use my Muse Code subscription?",
        a: "Cursor routes its own models and billing. Helicon exists precisely because a Muse Code subscription is best used by a Muse Code client.",
      },
      {
        q: "Is Helicon an editor?",
        a: "No. It has a file viewer with syntax highlighting, Markdown preview and editing, and image, video and PDF preview, so you can read what the agent touched. Writing code stays in your editor.",
      },
      {
        q: "Which is cheaper?",
        a: "Helicon is free and MIT licensed with no paid tier. It adds nothing to the Muse Code subscription you already hold.",
      },
    ],
  },
  {
    slug: "windsurf",
    icon: "wind",
    label: "Windsurf",
    name: "Windsurf",
    title: "Helicon vs Windsurf for Muse Code users",
    h1: "Helicon vs Windsurf",
    description:
      "Windsurf is an AI editor with its own agent and plan. Helicon is a free, open-source desktop and web client for the Muse Code CLI. Which one fits which job.",
    answer:
      "Windsurf is an agentic AI editor with its own models and subscription, built to be the place you write code. Helicon is a free MIT client for Meta's Muse Code CLI that gives your existing subscription a window: projects, sessions, diffs, approvals and cost, beside whatever editor you already use.",
    keywords: [
      "helicon vs windsurf",
      "windsurf alternative",
      "muse code vs windsurf",
      "open source ai coding gui",
      "windsurf muse code",
    ],
    rows: [
      ["Category", "Client for the Muse Code CLI", "AI first code editor"],
      ["Agent", "Muse Code, yours", "Windsurf's own agent"],
      ["Billing", "Existing Muse Code subscription", "Windsurf plan"],
      ["License", "MIT", "Proprietary"],
      ["Editor replacement", "No", "Yes"],
      ["Cross repo session list", "Yes, grouped by directory", "Per window"],
      ["Runs on a remote daemon", "Yes, same UI in a browser", "Remote development features"],
    ],
    what: [
      "Windsurf's pitch is flow: an editor that keeps context as the agent works across your codebase, with its own model routing behind a plan you buy.",
      "Helicon's pitch is narrower and cheaper. You already have Muse Code. Helicon is the window that makes several Muse Code threads manageable, keeps their history, shows the diffs inline, and puts every approval in front of you.",
    ],
    differences: [
      [
        "Nothing new to pay for",
        "Helicon has no plan. It is MIT licensed and free, and it uses the Muse Code subscription you already have through your own `muse login`.",
      ],
      [
        "No editor migration",
        "Adopting Helicon does not change where you write code, which keybindings you know or which extensions you rely on.",
      ],
      [
        "Local first and inspectable",
        "One daemon on your machine, one `muse serve` per workspace, state in local SQLite, source in one public repository.",
      ],
      [
        "Windows is handled",
        "Signed installer with auto update, native Muse Code on Windows, WSL2 with two way path translation when that is what you run.",
      ],
    ],
    pickOther: [
      "You want an editor and an agent from the same vendor.",
      "You want model routing handled for you.",
    ],
    pickHelicon: [
      "You hold a Muse Code subscription and want more than a terminal.",
      "You keep your editor and only want the agent to have a home.",
      "You want open source with no credential storage.",
      "You want cross project triage across repos and worktrees.",
    ],
    together:
      "There is no conflict. Windsurf is an editor purchase, Helicon is a free client for an agent you already pay for.",
    faqs: [
      {
        q: "Does Helicon have autocomplete?",
        a: "No. Helicon is a client for an agent, not an editor. Completion stays with your editor.",
      },
      {
        q: "Can I use Windsurf and Helicon together?",
        a: "Yes. They are separate products with separate billing and do not interfere with each other.",
      },
      {
        q: "What does Helicon cost?",
        a: "Nothing. MIT licensed, no paid tier, no second bill on top of Muse Code.",
      },
    ],
  },
  {
    slug: "opencode",
    icon: "gitBranch",
    label: "OpenCode",
    name: "OpenCode",
    title: "Helicon vs OpenCode for Muse Code subscribers",
    h1: "Helicon vs OpenCode",
    description:
      "OpenCode is an open-source terminal agent with its own provider routing. Helicon is a GUI for Meta's Muse Code CLI that reuses the subscription you already pay for.",
    answer:
      "OpenCode is an open-source agent harness that you point at providers, usually with its own API billing. Helicon is not a harness at all: it is a desktop and web interface for Meta's Muse Code CLI, so the agent, the models and the subscription are the ones you already have, with no second route to pay for.",
    keywords: [
      "helicon vs opencode",
      "opencode muse code subscription",
      "use muse subscription in opencode",
      "open source coding agent gui",
      "muse code subscription routing",
    ],
    rows: [
      ["What it is", "GUI client for the Muse Code CLI", "Terminal agent harness"],
      ["Agent", "Muse Code", "Its own loop over chosen providers"],
      ["Billing", "Existing Muse Code subscription", "Usually your own API keys"],
      ["Interface", "Desktop app and web UI", "Terminal"],
      ["Session list across repos", "Yes", "Per invocation"],
      ["License", "MIT", "Open source"],
      ["Approvals", "Muse Code's own, surfaced one to one", "Harness defined"],
    ],
    what: [
      "OpenCode is a good answer to a different question: how do I get an open agent loop that I control end to end, across whichever providers I like. That control comes with provider configuration and, for most people, pay as you go API billing.",
      "Helicon does not try to own the loop. Muse Code owns the loop. Helicon is the window: sessions grouped by working directory, resume, inline diffs, an approval queue, and what each thread would have cost at published rates.",
    ],
    differences: [
      [
        "Subscription reuse is the point",
        "A recurring complaint from people who buy a coding subscription is finding that a favourite harness routes through its own API metering instead. Helicon uses your `muse login` and nothing else, so the plan you bought is the plan that pays.",
      ],
      [
        "Terminal versus window",
        "OpenCode is a terminal experience. Helicon exists because the terminal has no persistent history UI, no cross project triage and no cost surface.",
      ],
      [
        "Protocol native",
        "Helicon speaks the Muse Code Session Protocol through Meta's MIT SDK rather than scraping a TUI, so sessions started from the terminal are discovered and resumable.",
      ],
    ],
    pickOther: [
      "You want to choose and mix providers yourself.",
      "You are happy in a terminal and want maximum control over the agent loop.",
      "You need an agent where no vendor CLI is involved.",
    ],
    pickHelicon: [
      "Your subscription is Muse Code and you want it to be the thing that pays.",
      "You want a GUI with history, diffs, approvals and cost.",
      "You want sessions started in the muse TUI to be visible and resumable.",
    ],
    together:
      "They are not exclusive, but they are not complementary either: one is a harness, the other is a client for a different harness. Pick by whether your Muse Code plan should be doing the work.",
    faqs: [
      {
        q: "Can Helicon route to other providers?",
        a: "No. Helicon drives the muse CLI. Whatever models Muse Code offers on your plan are the models you get.",
      },
      {
        q: "Is Helicon open source too?",
        a: "Yes, MIT licensed, with the desktop app, web app, daemon and this site in one public repository.",
      },
      {
        q: "Do I need API keys for Helicon?",
        a: "No. Authentication is your own `muse login`, held by the CLI. Helicon never stores credentials.",
      },
    ],
  },
  {
    slug: "aider",
    icon: "gitCommit",
    label: "Aider",
    name: "Aider",
    title: "Helicon vs Aider: GUI over CLI, two ways",
    h1: "Helicon vs Aider",
    description:
      "Aider is a terminal pair programmer driven by git commits and your own API keys. Helicon is a desktop and web GUI for Meta's Muse Code CLI. Different agents, different workflows.",
    answer:
      "Aider is a terminal pair programmer that works in tight commit sized loops against your own API keys. Helicon is a graphical client for Meta's Muse Code CLI on your existing subscription, built for supervising longer agent threads across several repositories rather than driving one edit at a time.",
    keywords: [
      "helicon vs aider",
      "aider gui",
      "aider alternative",
      "muse code vs aider",
      "terminal pair programmer gui",
    ],
    rows: [
      ["Interface", "Desktop app and web UI", "Terminal"],
      ["Agent", "Muse Code", "Aider's own loop"],
      ["Billing", "Existing Muse Code subscription", "Your API keys, per token"],
      ["Working unit", "A session you can resume", "A git commit"],
      ["Multi repo view", "Sidebar across projects", "One repo per run"],
      ["Approvals", "Queued and surfaced", "Confirm in the terminal"],
      ["License", "MIT", "Open source"],
    ],
    what: [
      "Aider's model of work is the commit. You describe a change, it edits, it commits, you review the diff in git. That tight loop is excellent for incremental work in one repository where you want git history to be the record.",
      "Helicon's model of work is the session. A thread can run long, spawn subagents, hit approvals and come back hours later, and the sidebar is there so you can find it again. Diffs are shown inline in the thread rather than left for git to explain.",
    ],
    differences: [
      [
        "Subscription versus API keys",
        "Aider spends your API keys per token. Helicon spends nothing extra: the muse CLI uses the subscription you already hold.",
      ],
      [
        "Where history lives",
        "Aider leans on git history. Helicon keeps its own local index of projects, sessions and turns so you can reopen a conversation, not just a commit.",
      ],
      [
        "Supervision",
        "Helicon's approval queue and per thread cost are built for watching several agents at once. Aider assumes you are in the loop for each step.",
      ],
    ],
    pickOther: [
      "You want git commits as the interface and the audit trail.",
      "You prefer a terminal and per token API billing.",
      "You are working in one repository at a time.",
    ],
    pickHelicon: [
      "You want to resume threads and read their history days later.",
      "You run several agents across repos and worktrees.",
      "Your billing is a Muse Code subscription, not API keys.",
    ],
    together:
      "Plenty of people use a commit driven tool for small edits and an agent client for larger delegated work. They touch the same repository from different directions and do not interfere.",
    faqs: [
      {
        q: "Does Helicon commit for me?",
        a: "Helicon shows what the agent changed as inline diffs. Committing is yours, and git worktrees appear as their own projects in the sidebar.",
      },
      {
        q: "Can Helicon use my own API key?",
        a: "No. It uses the muse CLI and your `muse login`. That is the design: no second bill and no credential custody.",
      },
      {
        q: "Is Helicon a terminal app?",
        a: "No. It is a Tauri desktop app and a web app on the same React UI, talking to a local or remote daemon.",
      },
    ],
  },
  {
    slug: "cline",
    icon: "puzzle",
    label: "Cline",
    name: "Cline",
    title: "Helicon vs Cline for agent supervision",
    h1: "Helicon vs Cline",
    description:
      "Cline is a VS Code agent extension with its own approvals and provider setup. Helicon is a standalone Muse Code desktop app. Panel versus window, and what changes.",
    answer:
      "Cline is an agent that lives in the VS Code sidebar, brings its own provider configuration and shows approvals inside the editor. Helicon is a standalone desktop and web app for Meta's Muse Code CLI, built so the session list, approvals and cost survive independently of any editor window.",
    keywords: [
      "helicon vs cline",
      "cline alternative",
      "muse code agent extension",
      "vscode agent extension vs desktop app",
      "cline muse code",
    ],
    rows: [
      ["Surface", "Standalone app or browser", "VS Code sidebar"],
      ["Agent", "Muse Code", "Cline over your chosen provider"],
      ["Billing", "Existing Muse Code subscription", "Your provider keys"],
      ["Approvals", "Queue, one to one with the protocol", "Inline in the panel"],
      ["Project scope", "Every project on the machine", "The open workspace"],
      ["Cost view", "Per thread, day and model", "Per task token counters"],
      ["License", "MIT", "Open source"],
    ],
    what: [
      "Cline does a lot right: it shows you the plan, asks before it acts, and keeps the token counter visible. It is also tied to the editor window it runs in, and it expects you to bring provider credentials.",
      "Helicon keeps the same honesty about approvals and cost but moves it out of the editor. The sidebar is projects and sessions across the whole machine, and the credentials question does not arise because Muse Code holds them.",
    ],
    differences: [
      [
        "No provider setup",
        "There are no API keys to paste. If `muse login` works, Helicon works.",
      ],
      [
        "Survives the editor",
        "Close VS Code and your threads are still there, with their history, because they are indexed by the daemon, not by a workspace.",
      ],
      [
        "Cross project triage",
        "Threads are grouped by working directory, including isolated git worktrees, so parallel work has one place to be watched.",
      ],
      [
        "Windows installer",
        "Signed, auto updating, with native Muse Code support and WSL2 path translation as the fallback.",
      ],
    ],
    pickOther: [
      "You want the agent inside VS Code with the editor's own diff flow.",
      "You want to choose the provider and model yourself.",
    ],
    pickHelicon: [
      "Your agent is Muse Code and your billing is its subscription.",
      "You want a session home outside the editor.",
      "You supervise more than one thread at a time.",
    ],
    together:
      "Different agents, so they can coexist on the same repository. If you keep both, Helicon is the place you look when you want to know what is still running.",
    faqs: [
      {
        q: "Does Helicon ask before running commands?",
        a: "Muse Code raises the approval and Helicon surfaces it. onRequest, promptUnmatched and denyUnmatched are mapped one to one, and allow all is behind an explicit opt in.",
      },
      {
        q: "Can I see token cost per task?",
        a: "Yes. Helicon shows what each thread would have cost at published per token rates, plus daily and per model breakdowns. It is a meter reading on your subscription, not an invoice.",
      },
      {
        q: "Does Helicon need VS Code?",
        a: "No. It is a standalone desktop app, and the same UI runs in a browser against a daemon.",
      },
    ],
  },
  {
    slug: "warp",
    icon: "terminal",
    label: "Warp",
    name: "Warp",
    title: "Helicon vs Warp for running Muse Code",
    h1: "Helicon vs Warp",
    description:
      "Warp is a modern terminal with agent features. Helicon is a purpose built GUI for the Muse Code CLI. What a better terminal gives you, and what it still cannot.",
    answer:
      "Warp makes the terminal better: blocks, history, its own agent. Running Muse Code inside it is still a terminal session. Helicon is a purpose built client that indexes projects and sessions, renders diffs inline, queues approvals and reports cost, because those come from the Muse Code protocol rather than from the shell.",
    keywords: [
      "helicon vs warp",
      "warp terminal muse code",
      "run muse code in warp",
      "muse code gui vs terminal app",
      "warp agent alternative",
    ],
    rows: [
      ["What it is", "Muse Code protocol client", "Terminal emulator with agent features"],
      ["Knows about Muse sessions", "Yes, indexed and resumable", "No, it sees text"],
      ["Diffs", "Rendered inline in the thread", "Whatever the CLI prints"],
      ["Approvals", "Protocol level queue", "A prompt in the block"],
      ["Cost", "Per thread, day and model", "Not available"],
      ["Multi repo triage", "Sidebar grouped by directory", "Tabs and panes"],
      ["Billing", "Existing Muse Code subscription", "Warp plan for its own agent"],
    ],
    what: [
      "Warp is a genuinely better terminal, and if the terminal is where you want to be then running `muse` inside it is a fine setup. Blocks make scrollback navigable and the command history is far better than a plain emulator.",
      "The ceiling is that a terminal sees characters. It cannot know that a particular run was a Muse Code session in a particular worktree, that a tool call is waiting on your approval, or what the turn would have cost. Helicon knows those things because it reads the Muse Code Session Protocol directly.",
    ],
    differences: [
      [
        "Structure, not text",
        "Helicon receives typed protocol events rather than parsing output, so sessions, turns, tool calls, approvals and usage are first class objects.",
      ],
      [
        "Resumption",
        "Sessions are listed per project and resumable, including the ones you started in the terminal.",
      ],
      [
        "Background work under control",
        "You can send a running tool call to the background, stop one, stop them all, cancel a workflow run, or skip and retry its agents.",
      ],
      [
        "Free",
        "MIT licensed with no paid tier, running on the subscription you already have.",
      ],
    ],
    pickOther: [
      "You want one place for all shell work, Muse Code included.",
      "You like Warp's own agent and are happy paying for it.",
    ],
    pickHelicon: [
      "You want Muse Code sessions to be objects you can find again.",
      "You want approvals and cost surfaced rather than printed.",
      "You are running several threads and need to see which is blocked.",
    ],
    together:
      "Keep Warp as your terminal and open Helicon for the agent threads. Anything you start in Warp with `muse` shows up in Helicon's sidebar, so nothing is lost by switching between them.",
    faqs: [
      {
        q: "Can I still use the terminal after installing Helicon?",
        a: "Yes, and sessions you start there are discovered by the daemon and resumable in the app.",
      },
      {
        q: "Does Helicon include a terminal?",
        a: "Helicon shows the commands the agent runs and their output inside the thread. It is not a general purpose shell.",
      },
      {
        q: "Does it work on Windows terminals?",
        a: "Helicon runs Muse Code natively on Windows with PowerShell for shell commands, and uses Muse Code inside WSL2 with path translation when native is not installed.",
      },
    ],
  },
  {
    slug: "other-muse-code-guis",
    icon: "squares",
    label: "Other Muse GUIs",
    name: "the other open-source Muse Code GUIs",
    title: "Muse Code GUI comparison: Helicon and the others",
    h1: "Helicon vs the other open-source Muse Code GUIs",
    description:
      "An honest look at the small field of Muse Code GUI wrappers, what separates them, and the specific things to check before trusting any client with shell access.",
    answer:
      "Several open-source Muse Code GUIs exist and Helicon does not claim to be the only one. What separates them in practice is packaging and protocol depth: a signed Windows installer with auto update, native Windows plus WSL2 path translation, cross project session resume including terminal sessions, and approvals mapped one to one.",
    keywords: [
      "muse code gui",
      "best muse code gui",
      "open source muse code gui",
      "muse code gui comparison",
      "muse code desktop client",
    ],
    rows: [
      ["Signed Windows installer", "Yes, with auto update", "Rare"],
      ["Native Windows Muse Code", "Yes, PowerShell shell commands", "Varies"],
      ["WSL2 path translation", "Both ways", "Varies"],
      ["macOS universal DMG", "Yes, updater signed, not notarized yet", "Varies"],
      ["Resumes terminal sessions", "Yes", "Varies"],
      ["Approval modes mapped one to one", "Yes", "Varies"],
      ["Cost at API rates", "Per thread, day and model", "Rare"],
      ["Web build on the same UI", "Yes, against a remote daemon", "Rare"],
    ],
    what: [
      "The category is young. A scan in September 2026 found a handful of Muse Code GUI projects, all of them small, none of them established. That is an honest description of the field and it is worth saying plainly rather than claiming a crown.",
      "Helicon's differences are concrete rather than rhetorical: end to end Windows and macOS release engineering, a protocol native client built on Meta's MIT SDK instead of TUI scraping, and one React codebase that ships as both a Tauri desktop app and a web app against a remote daemon.",
    ],
    differences: [
      [
        "Check the packaging",
        "An unsigned binary or a clone and build README is a real cost on Windows. Helicon ships a signed installer with auto update, and a universal macOS DMG. The macOS builds are not Apple notarized yet, so first launch needs right click then Open. That is a known gap and it is stated rather than hidden.",
      ],
      [
        "Check how it talks to Muse Code",
        "Scraping a TUI breaks whenever the TUI changes and cannot see structured events. Helicon speaks the Muse Code Session Protocol over JSON-RPC through the official MIT `@muse-code/sdk`.",
      ],
      [
        "Check what it does with credentials",
        "Helicon stores none. Authentication stays with your own `muse login`. Any client that asks you to paste a token deserves a longer look.",
      ],
      [
        "Check the approval behaviour",
        "A wrapper that silently auto approves to keep the demo smooth is a liability. Helicon surfaces every approval, maps the three Muse Code modes one to one, and puts allow all behind a deliberate opt in.",
      ],
    ],
    pickOther: [
      "Another project fits your platform or your taste better.",
      "You want something smaller that you intend to modify heavily.",
    ],
    pickHelicon: [
      "You are on Windows and want an installer that works today.",
      "You want cross project session triage with resume.",
      "You want approvals, diffs and cost visible.",
      "You want one UI that also runs in a browser against a remote daemon.",
    ],
    together:
      "They all drive the same muse CLI, so trying another costs you nothing but disk. If something else fits better, use it. The category is better off with more than one serious client in it.",
    faqs: [
      {
        q: "Is Helicon the only GUI for Muse Code?",
        a: "No. VS Code extensions, ACP editor bridges and several open source wrappers exist. Helicon is the standalone desktop and web option with signed Windows and macOS releases.",
      },
      {
        q: "What should I check before installing any Muse Code GUI?",
        a: "Whether it stores credentials, whether it bypasses approvals, whether it speaks the protocol or scrapes the TUI, and whether the binaries are signed. Helicon's answers are: no, no, protocol, and yes on Windows.",
      },
      {
        q: "Is Helicon official?",
        a: "No. It is an unofficial community project, MIT licensed, not made, sponsored or endorsed by Meta.",
      },
    ],
  },
];

function toPage(entry: Entry): SeoPage {
  return {
    slug: `compare/${entry.slug}`,
    section: "compare",
    icon: entry.icon,
    label: entry.label,
    title: entry.title,
    h1: entry.h1,
    description: entry.description,
    answer: entry.answer,
    keywords: entry.keywords,
    updated: UPDATED,
    ogEyebrow: "Comparison",
    blocks: [
      { kind: "h2", text: "At a glance" },
      {
        kind: "table",
        head: ["", "Helicon", entry.label],
        rows: entry.rows,
        caption: `Helicon compared with ${entry.name}.`,
      },
      { kind: "h2", text: "What each one is" },
      ...entry.what.map((text) => ({ kind: "p", text }) as const),
      { kind: "h2", text: "Where they actually differ" },
      ...entry.differences.flatMap(([heading, text]) => [
        { kind: "h3", text: heading } as const,
        { kind: "p", text } as const,
      ]),
      { kind: "h2", text: `Choose ${entry.name} if` },
      { kind: "ul", items: entry.pickOther },
      { kind: "h2", text: "Choose Helicon if" },
      { kind: "ul", items: entry.pickHelicon },
      { kind: "h2", text: "Can you use both?" },
      { kind: "p", text: entry.together },
    ],
    faqs: entry.faqs,
  };
}

export const COMPARE_PAGES: SeoPage[] = ENTRIES.map(toPage);
