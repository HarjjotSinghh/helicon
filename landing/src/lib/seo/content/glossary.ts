import type { SeoPage } from "../types";

/**
 * Definition pages. These exist for answer engines: each one opens with a self contained
 * definition of 40 to 60 words that reads correctly when lifted out of the page entirely.
 */

const UPDATED = "2026-09-19";

type Def = {
  slug: string;
  term: string;
  title: string;
  description: string;
  answer: string;
  keywords: string[];
  body: { h: string; p?: string; ul?: string[]; code?: string; table?: { head: string[]; rows: string[][] } }[];
  faqs: { q: string; a: string }[];
  related?: string[];
};

const DEFS: Def[] = [
  {
    slug: "muse-code",
    term: "Muse Code",
    title: "What is Muse Code? Meta's terminal coding agent",
    description:
      "Muse Code is Meta's AI coding agent, used through the muse command line tool on macOS, Linux and Windows. A plain definition, what it does, and how clients connect to it.",
    answer:
      "Muse Code is Meta's AI coding agent. You use it through the `muse` command line tool, which runs on macOS, Linux and Windows, and it works inside a project directory: reading files, editing them, running commands and asking for approval. Other applications can drive it over the Muse Code Session Protocol.",
    keywords: ["what is muse code", "meta muse code", "muse code agent", "muse code cli", "muse code explained"],
    body: [
      {
        h: "What it does",
        ul: [
          "Works inside a working directory, with the files actually on disk.",
          "Reads, edits and creates files, and runs shell commands.",
          "Asks for approval before acting, according to the mode you set.",
          "Keeps a session per working directory, with a turn by turn history.",
          "Can fan work out to parallel subagents and run multi step workflows.",
        ],
      },
      {
        h: "How you pay for it",
        p: "Muse Code is used through a subscription rather than per request API keys for most people. That is why a client that routes your work through its own API metering is a common complaint: the plan you already bought stops being the thing that pays.",
      },
      {
        h: "How other apps use it",
        p: "Meta ships an MIT licensed SDK for the Muse Code Session Protocol, so a client can start `muse serve` and drive a session properly instead of scraping terminal output. Helicon is one such client. VS Code extensions and Agent Client Protocol bridges are others.",
      },
    ],
    faqs: [
      { q: "Is Muse Code free?", a: "It is used through a Meta subscription. Helicon, a client for it, is free and MIT licensed and adds no billing of its own." },
      { q: "Does Muse Code run on Windows?", a: "Yes, natively, and it also runs inside WSL2." },
      { q: "Is Muse Code the same as the Muse assistant app?", a: "No. Muse Code is the coding agent used through the muse CLI. The Muse assistant app for Mac is a different product." },
    ],
    related: ["glossary/muse-cli", "glossary/msp", "muse-code-gui"],
  },
  {
    slug: "muse-cli",
    term: "the muse CLI",
    title: "What is the muse CLI?",
    description:
      "The muse command line tool is how you run Muse Code. What it installs, what muse login does, and why a GUI still needs it present.",
    answer:
      "The muse CLI is the command line tool that runs Muse Code. You install it, authenticate once with `muse login`, and then run `muse` inside a project to start a session. It holds your credentials, and every graphical client for Muse Code, including Helicon, drives this CLI rather than replacing it.",
    keywords: ["muse cli", "what is muse command", "muse login", "install muse cli", "muse serve command"],
    body: [
      {
        h: "The commands that matter",
        table: {
          head: ["Command", "What it does"],
          rows: [
            ["muse", "Starts an interactive session in the current directory"],
            ["muse login", "Authenticates you. Credentials stay with the CLI"],
            ["muse serve", "Starts a protocol host that other applications can drive"],
            ["muse --version", "Confirms the install is present and reachable"],
          ],
        },
      },
      {
        h: "Why a GUI still needs it",
        p: "A client like Helicon has no model, no account and no credentials. It starts `muse serve` and speaks the protocol to it, which means the agent, the subscription and the login are all the CLI's. If `muse --version` does not answer, the GUI has nothing to talk to.",
      },
      {
        h: "Where credentials live",
        p: "With the CLI, from your own `muse login`. Helicon never stores or handles them, which is the answer to the most common security question about wrapper clients.",
      },
    ],
    faqs: [
      { q: "Do I need the CLI if I use a GUI?", a: "Yes. Every Muse Code GUI drives the CLI. It is a requirement, not an alternative." },
      { q: "What does muse serve do?", a: "It starts a host that speaks the Muse Code Session Protocol over JSON-RPC, which is how applications drive a session properly." },
      { q: "Where does muse login store credentials?", a: "With the CLI itself. Clients like Helicon read nothing and store nothing." },
    ],
    related: ["glossary/muse-serve", "glossary/msp", "guides/muse-cli-not-found"],
  },
  {
    slug: "msp",
    term: "the Muse Code Session Protocol",
    title: "What is MSP, the Muse Code Session Protocol?",
    description:
      "MSP is the JSON-RPC protocol that applications use to drive a Muse Code session over stdio, instead of parsing terminal output. What it carries and why it matters.",
    answer:
      "The Muse Code Session Protocol, MSP, is the JSON-RPC interface a Muse Code host exposes over stdio when you run `muse serve`. It carries sessions, turns, tool calls, approvals and usage as typed events, so a client can render structure rather than parsing terminal text. Meta ships an MIT licensed SDK for it.",
    keywords: ["muse session protocol", "what is msp", "muse code json rpc", "muse code sdk", "muse code protocol client"],
    body: [
      {
        h: "What travels over it",
        ul: [
          "Sessions, keyed to a working directory.",
          "Turns, with the model and reasoning effort used.",
          "Tool calls, with the command and its output.",
          "Approval requests, with the mode that produced them.",
          "Usage, which is where cost and plan figures come from.",
        ],
      },
      {
        h: "Why protocol beats scraping",
        p: "A wrapper that parses TUI output breaks whenever the TUI changes and can never see anything the TUI does not print. A protocol client receives typed events, so approvals are objects you can queue, diffs are structured, and usage is a number rather than a guess.",
      },
      {
        h: "Who can use it",
        p: "Anyone. The SDK is MIT licensed, which makes client applications the intended path rather than a tolerated hack. That is the basis for saying Helicon is built the supported way even though it is unofficial.",
      },
    ],
    faqs: [
      { q: "Is MSP the same as the Agent Client Protocol?", a: "No. ACP is a general protocol several editors use for any agent. MSP is Muse Code's own interface, so it carries Muse Code specific things like its exact approval modes and usage reporting." },
      { q: "Do I need to know about MSP to use a GUI?", a: "No. It matters only because a protocol native client behaves better than one scraping a terminal." },
      { q: "Is the SDK open source?", a: "Yes, MIT licensed." },
    ],
    related: ["glossary/muse-serve", "glossary/acp", "compare/zed-acp"],
  },
  {
    slug: "muse-serve",
    term: "muse serve",
    title: "What is muse serve?",
    description:
      "muse serve starts a Muse Code protocol host that applications can drive over stdio. What it is for, and how a GUI uses one host per workspace.",
    answer:
      "`muse serve` starts a Muse Code host that speaks the Muse Code Session Protocol over stdio instead of drawing a terminal interface. Applications launch it to drive sessions programmatically. Helicon starts one host per workspace, so each project directory gets its own process, exactly as the CLI would.",
    keywords: ["muse serve", "muse code host", "muse code daemon", "muse serve json rpc", "run muse headless"],
    body: [
      {
        h: "One host per workspace",
        p: "Sessions in Muse Code belong to a working directory, so Helicon runs one `muse serve` per project rather than one shared process. That keeps isolation honest, including for git worktrees, which are separate directories over the same repository.",
      },
      {
        h: "What it is not",
        ul: [
          "Not a network server you expose. It speaks over stdio to the process that launched it.",
          "Not a second agent. It is the same Muse Code, without the terminal interface.",
          "Not a place credentials live. Authentication is still your own `muse login`.",
        ],
      },
    ],
    faqs: [
      { q: "Does muse serve replace muse?", a: "No. It is the same tool exposing a protocol instead of a terminal interface, for applications to drive." },
      { q: "How many hosts does Helicon run?", a: "One per workspace you add, which is the same process the CLI would start for that directory." },
      { q: "Can I run muse serve myself?", a: "Yes. It is a normal CLI command, and any MSP client can drive it." },
    ],
    related: ["glossary/msp", "glossary/muse-cli", "features/remote-daemon"],
  },
  {
    slug: "acp",
    term: "the Agent Client Protocol",
    title: "What is ACP, the Agent Client Protocol?",
    description:
      "ACP is a general protocol that lets editors talk to any conforming coding agent. How it differs from a Muse Code specific protocol, and what gets lost in the bridge.",
    answer:
      "The Agent Client Protocol is a general interface that lets an editor drive any conforming coding agent, so Zed or a JetBrains IDE can use several agents through one integration. Bridges expose Muse Code over ACP. Anything ACP has no vocabulary for, such as Muse Code specific usage reporting, has to be approximated.",
    keywords: ["agent client protocol", "what is acp", "zed acp", "editor agent protocol", "acp vs msp"],
    body: [
      {
        h: "The tradeoff",
        table: {
          head: ["", "General protocol (ACP)", "Native protocol (MSP)"],
          rows: [
            ["Agents supported", "Many", "Muse Code"],
            ["Editor integration", "Write once for all agents", "Per agent"],
            ["Feature fidelity", "Lowest common denominator", "Everything the agent exposes"],
            ["New agent capability", "Waits for the protocol to grow", "Available when the SDK has it"],
          ],
        },
      },
      {
        h: "When each is right",
        p: "If you want one editor panel that can drive whichever agent you are paying for this month, a general protocol is exactly right. If you want a client that surfaces one agent completely, including its approval modes and its usage reporting, a native protocol client is the one that can do it.",
      },
    ],
    faqs: [
      { q: "Does Helicon use ACP?", a: "No. Helicon is a Muse Code Session Protocol client and talks to muse serve directly." },
      { q: "Can I use an ACP editor and Helicon together?", a: "Yes. They share the same CLI and login, and sessions are discoverable either way." },
      { q: "Is one protocol better?", a: "They answer different questions. Breadth across agents, or depth on one." },
    ],
    related: ["glossary/msp", "compare/zed-acp", "compare/jetbrains-acp"],
  },
  {
    slug: "ade",
    term: "an ADE",
    title: "What is an ADE, an agentic development environment?",
    description:
      "An ADE is the workspace you supervise coding agents from, the way an IDE is the workspace you write code in. What belongs in one and what does not.",
    answer:
      "An agentic development environment, or ADE, is the workspace you supervise coding agents from, the way an IDE is the workspace you write code in. Its objects are sessions, approvals, diffs and cost rather than files and build targets, and it assumes you still have an editor open somewhere else.",
    keywords: ["what is an ade", "agentic development environment", "ide vs ade", "agent supervision ui", "coding agent workspace"],
    body: [
      {
        h: "IDE objects versus ADE objects",
        table: {
          head: ["IDE", "ADE"],
          rows: [
            ["Files and projects", "Sessions and threads"],
            ["Build and run configurations", "Approvals and tool calls"],
            ["Debugger", "Diffs and the event log"],
            ["Refactoring tools", "Cost and plan usage"],
          ],
        },
      },
      {
        h: "Why the distinction is useful",
        p: "Putting agent supervision inside an editor makes it a panel scoped to one open project. Making it a separate surface lets it be about every project at once, which is what actually happens when you run several agents. Neither replaces the other.",
      },
      {
        h: "What an ADE should not do",
        ul: [
          "Hide approvals to look smooth.",
          "Summarise tool output instead of showing it.",
          "Store credentials it does not need.",
          "Pretend a subscription meter reading is a bill.",
        ],
      },
    ],
    faqs: [
      { q: "Does an ADE replace my IDE?", a: "No. It supervises agents. You still write code where you like." },
      { q: "Is Helicon an ADE?", a: "That is the category it is built for: a desktop and web workspace for Muse Code sessions." },
      { q: "Do I need one if I use one agent occasionally?", a: "Probably not. The value appears when you have more threads than you can hold in your head." },
    ],
    related: ["muse-code-desktop-app", "features/session-history", "use-cases/parallel-agents"],
  },
  {
    slug: "agent-approvals",
    term: "agent approvals",
    title: "What are coding agent approvals?",
    description:
      "An approval is the moment an agent asks before acting. The three Muse Code modes, what each one does, and why bypassing them is the wrong optimisation.",
    answer:
      "An approval is the moment a coding agent stops and asks before running a command or making a change. Muse Code has three modes: onRequest asks every time, promptUnmatched asks when the action is outside the allow list, and denyUnmatched refuses it outright. A client should surface all three unchanged.",
    keywords: ["coding agent approvals", "muse code approval modes", "onrequest promptunmatched denyunmatched", "agent permission prompt", "safe ai agent execution"],
    body: [
      {
        h: "The three modes",
        table: {
          head: ["Mode", "Behaviour"],
          rows: [
            ["onRequest", "Ask before every tool call"],
            ["promptUnmatched", "Ask only when the call is outside the allow list"],
            ["denyUnmatched", "Refuse anything outside the allow list, without asking"],
          ],
        },
      },
      {
        h: "Why bypassing is the wrong optimisation",
        p: "An agent with file system and shell access is only as safe as the moment you get to say no. Auto approving to make a demo flow removes exactly the property that makes delegation defensible. Allow all is a legitimate setting for a throwaway sandbox and a bad default for a laptop with SSH keys on it.",
      },
      {
        h: "What good handling looks like",
        ul: [
          "The request appears the moment it arrives, not batched at the end.",
          "The actual command or edit is shown, not a paraphrase.",
          "A waiting thread is visibly marked so you know which one needs you.",
          "The decision stays in the history, so the record survives.",
        ],
      },
    ],
    faqs: [
      { q: "Can I turn approvals off?", a: "Allow all exists in Helicon behind a deliberate opt in, labelled as dangerous. It is off by default." },
      { q: "Who decides what is in the allow list?", a: "Muse Code does. A client renders the modes and sends your answer back." },
      { q: "Do approvals slow things down?", a: "They add a decision point. Seeing which thread is blocked in a sidebar is usually faster than discovering it in a scrollback." },
    ],
    related: ["features/approvals", "glossary/ade", "guides/review-agent-changes"],
  },
  {
    slug: "git-worktree",
    term: "a git worktree",
    title: "What is a git worktree, and why agents need them",
    description:
      "A git worktree is a second working directory for the same repository. It is the cheapest way to stop two coding agents from editing the same files.",
    answer:
      "A git worktree is an additional working directory attached to the same repository, each on its own branch. For coding agents it is the cheapest real isolation available: two agents in two worktrees cannot edit the same files, and neither needs a full clone of the repository.",
    keywords: ["git worktree", "git worktree ai agent", "parallel agents isolation", "git worktree add", "multiple branches at once"],
    body: [
      {
        h: "The command",
        p: "One line per task, and each agent gets a directory of its own on its own branch.",
        code: "git worktree add ../proj-auth -b feat/auth",
      },
      {
        h: "Why not just branches",
        ul: [
          "A branch is a pointer. A worktree is a directory. Agents edit directories.",
          "Switching branches in one checkout while an agent is mid task corrupts its view of the world.",
          "Worktrees share the object store, so they cost far less disk than clones.",
        ],
      },
      {
        h: "How a GUI should treat them",
        p: "As separate projects. A worktree is a different working directory, so its sessions belong to it. Helicon lists each worktree with a badge under its own entry, which is what makes parallel work legible.",
      },
    ],
    faqs: [
      { q: "Do worktrees use a lot of disk?", a: "Much less than clones, because they share the repository's object store." },
      { q: "Can two agents share one worktree?", a: "They can, and they will collide. One worktree per agent is the point." },
      { q: "How does Helicon show them?", a: "As their own projects in the sidebar, badged as worktrees, with their sessions underneath." },
    ],
    related: ["features/projects-and-worktrees", "guides/run-parallel-agents", "use-cases/parallel-agents"],
  },
  {
    slug: "subagent",
    term: "a subagent",
    title: "What is a subagent in a coding agent?",
    description:
      "A subagent is a separate agent a main agent spawns to do part of the work in parallel. Why it saves wall clock time and why it is unreadable in a terminal.",
    answer:
      "A subagent is a separate agent that a main agent spawns to handle part of a task, usually in parallel with others. It saves wall clock time on work that splits cleanly, such as searching several subsystems at once, and it produces interleaved output that a terminal cannot render legibly.",
    keywords: ["what is a subagent", "parallel subagents", "agent fan out", "muse code subagents", "multi agent coding"],
    body: [
      {
        h: "When fan out helps",
        ul: [
          "Searching or reading across many files or subsystems.",
          "Reviewing one change from several independent angles.",
          "Any work where the parts do not depend on each other's results.",
        ],
      },
      {
        h: "When it does not",
        ul: [
          "Sequential work where each step needs the previous answer.",
          "Small tasks, where the coordination costs more than it saves.",
          "Anything where you need one consistent view of a file being edited.",
        ],
      },
      {
        h: "The rendering problem",
        p: "Seven agents writing to one stream is not a log. A client that reads the protocol can show each subagent separately, cancel a run, or skip and retry an individual agent, which is the difference between a fan out you can supervise and one you can only hope about.",
      },
    ],
    faqs: [
      { q: "Do subagents cost more?", a: "They use more tokens in the same wall clock time. A per thread cost view makes the tradeoff visible." },
      { q: "Can I stop one subagent?", a: "In Helicon, yes. Individual agents in a workflow run can be skipped or retried, and the run can be cancelled on its own." },
      { q: "Is a subagent a separate session?", a: "It belongs to the parent thread. The session is still the thing you resume." },
    ],
    related: ["features/subagents-and-workflows", "features/background-tasks", "features/cost-and-usage"],
  },
  {
    slug: "reasoning-effort",
    term: "reasoning effort",
    title: "What is reasoning effort in a coding agent?",
    description:
      "Reasoning effort controls how much thinking a model does before answering. What it changes, what it costs, and when to turn it up.",
    answer:
      "Reasoning effort is a setting that controls how much a model thinks before it answers. Higher effort produces better results on hard problems and uses more tokens and more time. On mechanical work it usually buys nothing, which is why it is worth being able to change it per turn rather than per session.",
    keywords: ["reasoning effort", "model thinking budget", "muse code reasoning effort", "when to use high effort", "ai coding agent effort setting"],
    body: [
      {
        h: "A rough rule",
        table: {
          head: ["Work", "Effort"],
          rows: [
            ["Rename, reformat, mechanical edit", "Low"],
            ["Write a feature in a familiar codebase", "Medium"],
            ["Debug something nobody understands yet", "High"],
            ["Design a migration with real consequences", "High"],
          ],
        },
      },
      {
        h: "Why per turn matters",
        p: "A thread rarely stays at one difficulty. Being able to raise the effort for the one hard step and drop it again afterwards is cheaper than running the whole session at the maximum, and a cost view makes the difference concrete rather than theoretical.",
      },
    ],
    faqs: [
      { q: "Does higher effort always help?", a: "No. On mechanical work it usually just costs more tokens and more time." },
      { q: "Can I change it mid thread?", a: "In Helicon, yes. The model and reasoning effort picker applies from the next turn." },
      { q: "How do I see what it cost?", a: "The usage page breaks cost down by model, which is where the difference shows up." },
    ],
    related: ["features/command-palette", "features/cost-and-usage", "guides/see-muse-code-cost"],
  },
  {
    slug: "tui",
    term: "a TUI",
    title: "What is a TUI, and why coding agents ship one",
    description:
      "A TUI is a text user interface drawn inside a terminal. Why agents ship one first, and where the format runs out.",
    answer:
      "A TUI is a text user interface drawn inside a terminal window, with panels, input and scrolling made out of characters. Coding agents ship one first because it works everywhere, over SSH included, with no packaging. It runs out when you need persistent history, several concurrent threads, or structured views of diffs and cost.",
    keywords: ["what is a tui", "terminal user interface", "muse code tui", "tui vs gui", "terminal agent interface"],
    body: [
      {
        h: "What a TUI is genuinely better at",
        ul: [
          "Working over SSH with no port forwarding and no install.",
          "Starting instantly with zero packaging.",
          "Being scriptable and composable with the rest of the shell.",
          "Getting new agent features the day they ship.",
        ],
      },
      {
        h: "Where it runs out",
        ul: [
          "History lives in scrollback and dies with the tab.",
          "Parallel threads become parallel tabs you have to remember.",
          "Diffs are text rather than something you can navigate.",
          "Usage and cost have nowhere to be shown.",
        ],
      },
      {
        h: "The sensible conclusion",
        p: "Not that one replaces the other. A protocol native GUI can read the same sessions the TUI creates, so the honest answer is to use the terminal for quick work and a GUI when the number of threads exceeds what you can hold in your head.",
      },
    ],
    faqs: [
      { q: "Is a GUI slower than a TUI?", a: "Only if it forces the mouse. A keyboard first GUI with a command palette is competitive for navigation and better for triage." },
      { q: "Can a GUI see TUI sessions?", a: "A protocol native one can, because sessions are state on disk rather than terminal output." },
      { q: "Should I stop using the TUI?", a: "No. Most people keep both." },
    ],
    related: ["compare/muse-code-terminal", "guides/from-terminal-to-gui", "glossary/ade"],
  },
  {
    slug: "llms-txt",
    term: "llms.txt",
    title: "What is llms.txt?",
    description:
      "llms.txt is a plain text file at a site's root that gives language models a clean summary and an index of the pages worth reading. What goes in one.",
    answer:
      "llms.txt is a plain text file at the root of a website that gives language models a clean, Markdown formatted summary of what the site is and an index of the pages worth reading. It exists because parsing rendered HTML is lossy, and a curated index is cheaper and more accurate than crawling.",
    keywords: ["what is llms.txt", "llms-full.txt", "llms.txt spec", "ai crawler file", "machine readable website"],
    body: [
      {
        h: "The usual set of files",
        table: {
          head: ["File", "Purpose"],
          rows: [
            ["/llms.txt", "Short summary plus a curated index of links"],
            ["/llms-full.txt", "The whole content in one plain text file"],
            ["/agents.md", "Instructions for an agent acting on a user's behalf"],
            ["/robots.txt", "Which crawlers may fetch what"],
          ],
        },
      },
      {
        h: "What makes one useful",
        ul: [
          "Facts that are checkable, with versions and dates.",
          "Explicit statements about what is not true, so models do not fill gaps badly.",
          "Links to the canonical page for each claim.",
          "Generation from the same source as the site, so the two cannot drift.",
        ],
      },
      {
        h: "This site's files",
        p: "Helicon generates /llms.txt, /llms-full.txt and /agents.md from the same data the pages render, and every page has a Markdown mirror at its own path with .md appended.",
      },
    ],
    faqs: [
      { q: "Is llms.txt a standard?", a: "It is a community convention rather than a formal standard, and it is widely enough adopted to be worth shipping." },
      { q: "Does Google require it?", a: "No. Google says its AI features need no special files. Other answer engines do read them." },
      { q: "Where is Helicon's?", a: "At /llms.txt, with the full text at /llms-full.txt and an agent guide at /agents.md." },
    ],
    related: ["glossary/ade", "muse-code-gui"],
  },
  {
    slug: "tauri",
    term: "Tauri",
    title: "What is Tauri, and why build a desktop app with it?",
    description:
      "Tauri builds desktop apps from web UI using the operating system's own webview and a Rust core. Why that matters for a small, signed, auto updating app.",
    answer:
      "Tauri is a framework for building desktop applications from web technology, using the operating system's own webview rather than bundling a browser, with a Rust core for native work. The result is a much smaller binary than an Electron equivalent, with code signing and auto update built into the release tooling.",
    keywords: ["what is tauri", "tauri vs electron", "rust desktop app", "tauri auto update", "lightweight desktop app framework"],
    body: [
      {
        h: "Why it fits this kind of app",
        ul: [
          "The UI is React already, and the same code ships as a web app.",
          "The binary is small, because the webview comes from the operating system.",
          "Signing and auto update are part of the release path, which matters most on Windows.",
          "The Rust core handles process management for the daemon and the muse hosts.",
        ],
      },
      {
        h: "The tradeoff",
        p: "Using the system webview means rendering differences between platforms are yours to handle, where bundling a browser would have hidden them. For an app whose heaviest surface is a thread of text and diffs, that is a good trade.",
      },
    ],
    faqs: [
      { q: "Is Helicon an Electron app?", a: "No, it is Tauri 2, which uses the system webview and a Rust core." },
      { q: "Does the desktop app bundle Node.js?", a: "Yes. Running from source instead needs Node 22 or newer on the machine." },
      { q: "Does the same code run in a browser?", a: "Yes. One React codebase ships as the desktop app and as the web app against a daemon." },
    ],
    related: ["muse-code-desktop-app", "features/remote-daemon", "install/windows"],
  },
];

function toPage(def: Def): SeoPage {
  return {
    slug: `glossary/${def.slug}`,
    section: "glossary",
    label: def.term,
    title: def.title,
    h1: def.title.replace(/\?.*$/, "?"),
    description: def.description,
    answer: def.answer,
    keywords: def.keywords,
    updated: UPDATED,
    ogEyebrow: "Definition",
    blocks: def.body.flatMap((part) => [
      { kind: "h2", text: part.h } as const,
      ...(part.p ? [{ kind: "p", text: part.p } as const] : []),
      ...(part.ul ? [{ kind: "ul", items: part.ul } as const] : []),
      ...(part.code ? [{ kind: "code", lang: "sh", code: part.code } as const] : []),
      ...(part.table ? [{ kind: "table", head: part.table.head, rows: part.table.rows } as const] : []),
    ]),
    faqs: def.faqs,
    related: def.related,
  };
}

export const GLOSSARY_PAGES: SeoPage[] = DEFS.map(toPage);
