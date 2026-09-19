import type { SeoPage } from "../types";

/** Persona and situation pages, for "[product] for [audience]" style searches. */

const UPDATED = "2026-09-19";

export const USE_CASE_PAGES: SeoPage[] = [
  {
    slug: "use-cases/windows-developers",
    icon: "windows",
    section: "use-cases",
    label: "Windows developers",
    title: "Muse Code for Windows developers",
    h1: "Muse Code for Windows developers",
    description:
      "A signed installer, native Windows Muse Code with PowerShell, and WSL2 path translation when you need it. The Windows setup tax, paid once by the app instead of by you.",
    answer:
      "Windows has historically been the worst platform for terminal coding agents: WSL2 plumbing, mixed path formats and unsigned binaries. Helicon ships a signed Windows installer with auto update, runs Muse Code natively with PowerShell for shell commands, and falls back to Muse Code inside WSL2 with two way path translation.",
    keywords: [
      "muse code windows developer",
      "ai coding agent windows",
      "muse code windows 11 setup",
      "coding agent gui for windows",
      "wsl2 coding agent",
    ],
    updated: UPDATED,
    blocks: [
      { kind: "h2", text: "What normally goes wrong" },
      {
        kind: "ul",
        items: [
          "The agent reports /home/you/project and nothing on the Windows side can open it.",
          "SmartScreen blocks an unsigned binary and you are asked to trust it anyway.",
          "Half your tooling is in the distribution and half is on the host.",
          "Updating means finding the release page again.",
        ],
      },
      { kind: "h2", text: "What Helicon does about each" },
      {
        kind: "table",
        head: ["Problem", "What the app does"],
        rows: [
          ["Mixed paths", "Translates both ways on the WSL2 route, uses Windows paths natively"],
          ["Unsigned binaries", "Signed installer, so SmartScreen behaves"],
          ["Shell mismatch", "PowerShell for shell commands on the native route"],
          ["Manual updates", "Auto update built into the app"],
          ["Which route am I on", "Detection prefers native and tells you what it chose"],
        ],
      },
      { kind: "h2", text: "A setup that works" },
      {
        kind: "ol",
        items: [
          "Install Muse Code natively on Windows if you can. PowerShell should answer `muse --version`.",
          "Run `muse login` in that shell. Helicon stores no credentials.",
          "Install Helicon with the signed installer.",
          "Add the Windows paths you actually work in.",
          "Keep WSL2 only if your project or toolchain genuinely lives there.",
        ],
      },
      {
        kind: "note",
        text: "Running the daemon from source on Windows needs Node 22 or newer on the Windows host, not inside WSL2. The packaged app brings its own.",
      },
    ],
    faqs: [
      { q: "Do I need WSL2?", a: "No. Muse Code runs natively on Windows and Helicon drives it directly. WSL2 remains supported for setups that need it." },
      { q: "Is the installer signed?", a: "Yes, with auto update built in." },
      { q: "Does it work on Windows on ARM?", a: "The published installer is x64. ARM users can run from source with Node 22 or newer." },
    ],
    related: ["install/windows", "install/wsl2", "guides/muse-code-windows-without-wsl"],
  },
  {
    slug: "use-cases/macos-power-users",
    icon: "apple",
    section: "use-cases",
    label: "macOS power users",
    title: "Muse Code for macOS power users",
    h1: "Muse Code for macOS power users",
    description:
      "Several repositories, several threads, and a history that outlives the terminal. A universal DMG, a session sidebar, inline diffs and a cost view.",
    answer:
      "If you run Muse Code across several repositories on a Mac, the constraint is not the agent, it is keeping track of it. Helicon gives every thread a home: projects grouped by directory, sessions with full history and resume, inline diffs, an approval queue and cost at API rates, in a universal DMG.",
    keywords: [
      "muse code mac power user",
      "muse code multiple repos mac",
      "coding agent session manager mac",
      "muse code macos gui",
      "apple silicon coding agent app",
    ],
    updated: UPDATED,
    blocks: [
      { kind: "h2", text: "The pattern this fixes" },
      {
        kind: "p",
        text: "Four terminal tabs, three of them idle, one waiting on an approval you have not noticed, and no way to reopen the thread from Tuesday that had the reasoning you now need. That is the normal state of running an agent seriously, and it is an interface problem rather than a model problem.",
      },
      { kind: "h2", text: "What changes" },
      {
        kind: "ul",
        items: [
          "Threads are listed under their project and resume with full history.",
          "Blocked threads are marked, so the approval queue is visible at a glance.",
          "Diffs are inline, at the turn that produced them.",
          "The usage page shows what each thread would have cost at published rates.",
          "The command palette reaches any project or session without the mouse.",
        ],
      },
      { kind: "h2", text: "Practical notes" },
      {
        kind: "ul",
        items: [
          "One universal DMG covers Apple Silicon and Intel.",
          "First launch needs right click then Open, because the builds are not Apple notarized yet.",
          "The theme follows the system, in both light and dark.",
          "Auto update keeps the app current.",
        ],
      },
    ],
    faqs: [
      { q: "Is there an Apple Silicon build?", a: "One universal DMG covers Apple Silicon and Intel." },
      { q: "Why the Gatekeeper warning?", a: "The builds are updater signed but not Apple notarized yet. Right click and Open the first time." },
      { q: "Does it replace my editor?", a: "No. It has a file viewer for reading what the agent touched. Writing code stays where you like it." },
    ],
    related: ["install/macos", "guides/macos-first-launch", "features/session-history"],
  },
  {
    slug: "use-cases/parallel-agents",
    icon: "stack",
    section: "use-cases",
    label: "Running agents in parallel",
    title: "Running several coding agents in parallel",
    h1: "When you run more agents than you can watch",
    description:
      "Isolated worktrees, one sidebar, and clear marks for which thread is running, finished, or blocked on you. Plus the cost of all that parallelism, per thread.",
    answer:
      "Parallelism breaks down at the interface, not the agent. Four threads means four places something can be waiting. Helicon puts every thread in one sidebar grouped by working directory, marks which are running and which are blocked on an approval, and shows what the fan out cost per thread.",
    keywords: [
      "run multiple coding agents",
      "parallel ai agents workflow",
      "agent triage dashboard",
      "multiple muse code sessions",
      "supervise several agents",
    ],
    updated: UPDATED,
    blocks: [
      { kind: "h2", text: "Isolation first" },
      {
        kind: "p",
        text: "Two agents on one checkout will fight. Give each task an isolated git worktree, add each as a project, and the collisions stop being possible rather than being unlikely.",
      },
      { kind: "code", lang: "sh", code: "git worktree add ../proj-auth -b feat/auth\ngit worktree add ../proj-search -b feat/search" },
      { kind: "h2", text: "Then triage" },
      {
        kind: "table",
        head: ["Signal", "What you do"],
        rows: [
          ["Thread marked running", "Leave it"],
          ["Thread marked blocked", "Open it, read the request, decide"],
          ["Thread finished", "Review the diffs in the thread"],
          ["Tool call stuck", "Background it, stop it, or stop everything"],
        ],
      },
      { kind: "h2", text: "Then count the cost" },
      {
        kind: "p",
        text: "Fan out spends tokens faster than sequential work, which is the whole point and also the risk. The usage page breaks cost down by thread, by day and by model, so the tradeoff between wall clock time and spend is visible instead of assumed.",
      },
    ],
    faqs: [
      { q: "How many threads is too many?", a: "The limit is usually your attention rather than the machine. The sidebar exists so the number you can supervise is higher than the number you can remember." },
      { q: "Do worktrees appear separately?", a: "Yes, each as its own project with a badge, because each is its own working directory." },
      { q: "Can I stop everything at once?", a: "Yes, and it ends running calls without ending the sessions." },
    ],
    related: ["guides/run-parallel-agents", "features/projects-and-worktrees", "features/subagents-and-workflows"],
  },
  {
    slug: "use-cases/remote-development",
    icon: "broadcast",
    section: "use-cases",
    label: "Remote development",
    title: "Muse Code for remote and remote-first development",
    h1: "Agents where the code is, UI where you are",
    description:
      "Run the daemon and the muse CLI on the machine that holds the repository, then supervise from a browser on a laptop. Same UI, same sidebar, same approvals.",
    answer:
      "Helicon ships the same React UI as a desktop app and as a web app pointed at a daemon elsewhere. Put the daemon and the muse CLI on the workstation or server that holds the code, and supervise from a browser, so the agent runs next to the repository while you stay on a laptop.",
    keywords: [
      "remote coding agent",
      "muse code on a server",
      "ai agent remote workstation",
      "browser coding agent ui",
      "muse code ssh alternative",
    ],
    updated: UPDATED,
    blocks: [
      { kind: "h2", text: "Why not just SSH" },
      {
        kind: "p",
        text: "SSH gives you a terminal on the far machine, which means you are back to scrollback, no session list and no approval queue. The point of the remote daemon is keeping the interface while moving the execution.",
      },
      { kind: "h2", text: "Situations this fits" },
      {
        kind: "ul",
        items: [
          "A monorepo whose test suite needs more machine than a laptop has.",
          "Code that must stay on a particular machine.",
          "Long runs that should not stop when the laptop sleeps.",
          "A Linux box for the agent while you work on Windows or macOS.",
        ],
      },
      { kind: "h2", text: "What to get right" },
      {
        kind: "ul",
        items: [
          "Node 22 or newer on the remote machine, since it is running from source.",
          "`muse login` on that machine, since credentials live with the CLI.",
          "Your own tunnel, VPN or reverse proxy. Do not expose a daemon with shell access to the open internet.",
          "Strict approval modes. Remote execution is exactly where allow all is a bad idea.",
        ],
      },
      { kind: "note", text: "There is no hosted Helicon. The daemon is yours, on a machine you control." },
    ],
    faqs: [
      { q: "Is the web build a cut down version?", a: "No. It is the same React UI. Only the daemon's location differs." },
      { q: "Can several people share one daemon?", a: "Multi user deployment is out of scope today. Helicon targets one developer's own machines." },
      { q: "Does my code pass through helicon.sh?", a: "No. Nothing about your code, prompts, threads or files leaves your machines." },
    ],
    related: ["features/remote-daemon", "guides/remote-daemon-setup", "install/linux"],
  },
  {
    slug: "use-cases/open-source-maintainers",
    icon: "github",
    section: "use-cases",
    label: "Open source maintainers",
    title: "Muse Code for open-source maintainers",
    h1: "Muse Code for open-source maintainers",
    description:
      "Many repositories, short bursts of attention, and a need to see exactly what an agent did before it touches a project other people depend on.",
    answer:
      "Maintaining several repositories means short bursts of attention across many codebases. Helicon lists every project with its sessions, so picking a repository back up does not mean reconstructing context, and every edit is an inline diff with the approval record beside it before anything reaches a project others depend on.",
    keywords: [
      "coding agent for maintainers",
      "muse code many repositories",
      "open source agent workflow",
      "review agent changes before merge",
      "agent audit trail",
    ],
    updated: UPDATED,
    blocks: [
      { kind: "h2", text: "The maintainer shape of work" },
      {
        kind: "ul",
        items: [
          "Twenty repositories, two of which are active this week.",
          "Context switches measured in minutes, not hours.",
          "Contributions you must read carefully before merging.",
          "No appetite for a tool that makes changes you cannot audit.",
        ],
      },
      { kind: "h2", text: "What helps" },
      {
        kind: "table",
        head: ["Need", "What the app gives you"],
        rows: [
          ["Pick a repo back up", "Sessions listed under the project, resumable with full history"],
          ["See exactly what changed", "Inline diffs at the turn that produced them"],
          ["Know what was allowed", "Approval decisions kept in the thread"],
          ["Keep changes isolated", "Worktrees listed as their own projects"],
          ["Trust the client itself", "MIT licensed, no credential storage, source in one repository"],
        ],
      },
      { kind: "h2", text: "On trusting the tool" },
      {
        kind: "p",
        text: "A wrapper around an agent with shell access deserves the same scrutiny you would give a dependency. Helicon is MIT licensed with the desktop app, web app, daemon and this site in one public repository, it stores no credentials, and it never bypasses an approval.",
      },
    ],
    faqs: [
      { q: "Does Helicon commit or push anything?", a: "No. It shows what changed. Git stays yours." },
      { q: "Can I audit what the client sends?", a: "Yes. It is MIT licensed and the source is public." },
      { q: "Does it phone home?", a: "Only an update check, which reports platform, version and a weekly hash of the IP. No account, no thread data." },
    ],
    related: ["guides/review-agent-changes", "features/approvals", "features/projects-and-worktrees"],
  },
  {
    slug: "use-cases/freelancers",
    icon: "briefcase",
    section: "use-cases",
    label: "Freelancers and consultants",
    title: "Muse Code for freelancers and consultants",
    h1: "Muse Code for freelancers and consultants",
    description:
      "Several clients, several codebases, and a real need to know what each piece of work actually consumed. Projects, sessions and cost, separated by directory.",
    answer:
      "Client work means several codebases at once and a reason to know what each one consumed. Helicon groups threads by working directory, so each client's work stays separate, keeps the full session history for anything you need to explain later, and shows what each thread would have cost at published per token rates.",
    keywords: [
      "coding agent for freelancers",
      "track ai cost per client",
      "muse code multiple clients",
      "consultant ai coding workflow",
      "per project ai usage",
    ],
    updated: UPDATED,
    blocks: [
      { kind: "h2", text: "Separation by directory" },
      {
        kind: "p",
        text: "Projects are keyed by the working directory the agent ran in, so one client's repository never shares a thread list with another's. That is organisational hygiene rather than a feature, and it is the reason the sidebar is shaped the way it is.",
      },
      { kind: "h2", text: "Knowing what work consumed" },
      {
        kind: "ul",
        items: [
          "Cost per thread at published per token rates, so a big refactor is visibly bigger.",
          "Cost per day, which is the unit most timesheets already use.",
          "Cost per model, so an expensive habit is attributable.",
          "The 5 hour window and weekly cap, so you know when a deadline is going to meet a limit.",
        ],
      },
      {
        kind: "note",
        text: "These figures are a meter reading on your own subscription, not an invoice, and not something to hand a client as a bill.",
      },
      { kind: "h2", text: "Explaining work later" },
      {
        kind: "p",
        text: "A session keeps its turns, tool calls, diffs and approval decisions. When someone asks why a change was made in March, the thread is the answer, and it is still there.",
      },
    ],
    faqs: [
      { q: "Can I export cost data?", a: "The usage page breaks it down by thread, day and model. It is computed locally from the usage Muse Code reports." },
      { q: "Is this a billing tool?", a: "No. It is a meter reading on a subscription you already pay for." },
      { q: "Does client code leave my machine?", a: "No. Nothing about your code, prompts, threads or files leaves it." },
    ],
    related: ["features/cost-and-usage", "guides/see-muse-code-cost", "features/plan-limits"],
  },
  {
    slug: "use-cases/monorepos",
    icon: "folderOpen",
    section: "use-cases",
    label: "Monorepos",
    title: "Muse Code in a monorepo",
    h1: "Muse Code in a large monorepo",
    description:
      "One repository, many packages, and agents that need isolation. Worktrees as projects, a remote daemon for the heavy machine, and diffs you can actually read.",
    answer:
      "A monorepo makes two things harder: keeping parallel agents from colliding, and running a test suite a laptop cannot hold. Helicon answers both by treating isolated git worktrees as separate projects and by letting the daemon live on the machine with the CPU while you watch from a browser.",
    keywords: [
      "coding agent monorepo",
      "muse code large repository",
      "monorepo ai agent isolation",
      "agent worktree monorepo",
      "big codebase coding agent",
    ],
    updated: UPDATED,
    blocks: [
      { kind: "h2", text: "Isolation inside one repository" },
      {
        kind: "p",
        text: "In a monorepo the temptation is to run several agents on one checkout because it is one repository. It is still one working directory, and they will still collide. Worktrees give each task a directory of its own while sharing the object store, which keeps the disk cost sane even when the repository is large.",
      },
      { kind: "h2", text: "Put the daemon on the big machine" },
      {
        kind: "ul",
        items: [
          "Test suites and builds run where the CPU is.",
          "The checkout stays on the machine that can hold it.",
          "Long runs continue while your laptop sleeps.",
          "The UI is the same in a browser as on the desktop.",
        ],
      },
      { kind: "h2", text: "Reading changes in a big tree" },
      {
        kind: "p",
        text: "Diffs appear inline at the turn that produced them, and the file viewer beside the thread opens any path the agent mentions. In a repository with thousands of files, being handed the path rather than searching for it is most of the work.",
      },
    ],
    faqs: [
      { q: "Does Helicon index my monorepo?", a: "No. It indexes sessions, not source. Reading files is on demand through the viewer." },
      { q: "One project per package or one for the repo?", a: "Whatever directory the agent works in is the project. For parallel work, a worktree per task is the cleaner shape." },
      { q: "Can the daemon run on a build server?", a: "Yes. That is the remote daemon setup, with the UI in a browser." },
    ],
    related: ["features/remote-daemon", "guides/run-parallel-agents", "glossary/git-worktree"],
  },
  {
    slug: "use-cases/terminal-skeptics",
    icon: "terminalWindow",
    section: "use-cases",
    label: "If you like the terminal",
    title: "A Muse Code GUI for people who like the terminal",
    h1: "For people who do not want a GUI",
    description:
      "Keyboard first, no mouse required, no migration, and the CLI keeps working. What a graphical client adds that a terminal structurally cannot.",
    answer:
      "The objection to a GUI over a CLI is that it will be slower and will take something away. Helicon is keyboard first with a command palette, requires no migration because it reads the same sessions the CLI writes, and adds only the things a terminal structurally cannot do: persistent history, cross project triage, and cost.",
    keywords: [
      "gui for terminal users",
      "keyboard driven coding agent",
      "muse code cli vs gui",
      "do i need a gui for muse code",
      "terminal first developer tools",
    ],
    updated: UPDATED,
    blocks: [
      { kind: "h2", text: "What you are not giving up" },
      {
        kind: "ul",
        items: [
          "The CLI keeps working, unchanged, alongside the app.",
          "Sessions you start in the terminal appear in the app and resume there.",
          "No configuration is migrated, rewritten or taken over.",
          "Every action is reachable from the command palette without a mouse.",
        ],
      },
      { kind: "h2", text: "What a terminal structurally cannot do" },
      {
        kind: "table",
        head: ["Capability", "Why the terminal cannot"],
        rows: [
          ["Persistent session list", "Scrollback is not an index"],
          ["Cross project triage", "Tabs do not know about each other"],
          ["Approval queue", "A prompt only helps if you are looking at it"],
          ["Cost per thread", "The shell never sees the usage events"],
          ["Structured subagent view", "Seven writers, one stream"],
        ],
      },
      { kind: "h2", text: "The honest recommendation" },
      {
        kind: "p",
        text: "Keep the terminal for quick single repository work. Open the app when the number of threads exceeds what you can hold in your head, or when you need to find something from last week. If that never happens to you, you do not need this.",
      },
    ],
    faqs: [
      { q: "Can I use it without a mouse?", a: "Yes. The command palette reaches every project, session and action." },
      { q: "Will it change my CLI setup?", a: "No. It drives your existing install with your own login and settings." },
      { q: "What if I try it and prefer the terminal?", a: "Uninstall the app. Your sessions and configuration are untouched, because it only ever read them." },
    ],
    related: ["compare/muse-code-terminal", "guides/from-terminal-to-gui", "features/command-palette"],
  },
];
