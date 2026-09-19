import type { SeoPage } from "../types";

/** Task pages. One per "how do I ..." query, each carrying HowTo schema where the task has steps. */

const UPDATED = "2026-09-19";

export const GUIDE_PAGES: SeoPage[] = [
  {
    slug: "guides/muse-code-windows-without-wsl",
    icon: "windows",
    section: "guides",
    label: "Muse Code on Windows without WSL",
    title: "How to run Muse Code on Windows without WSL",
    h1: "Run Muse Code on Windows without WSL",
    description:
      "Muse Code runs natively on Windows. Here is how to check which route you are on, run it with Windows paths and PowerShell, and keep WSL2 as a fallback.",
    answer:
      "Muse Code runs natively on Windows, so WSL2 is optional. Install the CLI on Windows, run muse login in PowerShell, and Helicon drives it directly with your own Windows paths and PowerShell for shell commands. If only a WSL2 install is present, Helicon routes there instead and translates paths both ways.",
    keywords: [
      "muse code windows without wsl",
      "run muse code natively windows",
      "muse code powershell",
      "muse code windows paths",
      "do i need wsl for muse code",
    ],
    updated: UPDATED,
    blocks: [
      { kind: "h2", text: "Check which route you are on" },
      {
        kind: "p",
        text: "Open PowerShell and ask the CLI directly. If it answers there, you have a native install and WSL2 is not involved.",
      },
      { kind: "code", lang: "powershell", code: "muse --version" },
      {
        kind: "p",
        text: "If that fails but the same command answers inside your WSL2 shell, your install lives in the distribution and Helicon will route through it.",
      },
      { kind: "h2", text: "What native gives you" },
      {
        kind: "ul",
        items: [
          "Your own Windows paths, with no /mnt/c translation anywhere in the loop.",
          "PowerShell for shell commands, so your profile, aliases and tooling apply.",
          "No distribution to keep updated alongside Windows.",
          "Fewer moving parts when something goes wrong.",
        ],
      },
      { kind: "h2", text: "When to keep WSL2 anyway" },
      {
        kind: "ul",
        items: [
          "Your project lives inside the distribution and your toolchain is Linux.",
          "You depend on Linux only build steps the agent has to run.",
          "You set Muse Code up before native Windows support and it works.",
        ],
      },
      {
        kind: "note",
        text: "Helicon prefers native Muse Code when it finds it and falls back to WSL2 otherwise. You do not have to pick in the UI.",
      },
    ],
    howTo: {
      name: "Run Muse Code natively on Windows",
      steps: [
        { name: "Install the muse CLI on Windows", text: "Use the Windows install path rather than installing inside a distribution." },
        { name: "Confirm PowerShell can see it", text: "A version answer here means you are native.", code: "muse --version" },
        { name: "Sign in", text: "Authentication stays with the CLI.", code: "muse login" },
        { name: "Install Helicon", text: "Run the signed Windows installer from the latest GitHub release." },
        { name: "Add your project", text: "Point Helicon at the Windows path you actually work in." },
      ],
    },
    faqs: [
      {
        q: "Is WSL2 still supported?",
        a: "Yes. Helicon uses Muse Code inside WSL2 when native Muse Code is not installed, and translates paths in both directions.",
      },
      {
        q: "Can I have both installs?",
        a: "You can, and Helicon will prefer the native one. Keeping both is a reasonable way to migrate gradually.",
      },
      {
        q: "Which shell runs the agent's commands?",
        a: "PowerShell on the native route, and the distribution's shell on the WSL2 route.",
      },
    ],
    related: ["install/windows", "install/wsl2", "use-cases/windows-developers"],
  },
  {
    slug: "guides/resume-a-muse-session",
    icon: "rewind",
    section: "guides",
    label: "Resume a session",
    title: "How to resume a Muse Code session you started earlier",
    h1: "Resume a Muse Code session",
    description:
      "Find and reopen any past Muse Code thread, including ones started in the terminal TUI, with its full history, diffs and approval record intact.",
    answer:
      "Open Helicon, find the project in the sidebar, and pick the session. The thread reopens with every turn, tool call, diff and approval in place, and you can carry on from there. Sessions started in the muse terminal TUI are discovered by the daemon and resume the same way.",
    keywords: [
      "resume muse code session",
      "reopen muse code thread",
      "muse code continue conversation",
      "find old muse code session",
      "muse code session resume gui",
    ],
    updated: UPDATED,
    blocks: [
      { kind: "h2", text: "Where sessions come from" },
      {
        kind: "p",
        text: "Helicon's daemon runs one `muse serve` host per workspace and indexes what that workspace has: projects, sessions and turns, in local SQLite. It does not matter which client created a session. If Muse Code has it on disk for that directory, Helicon lists it.",
      },
      { kind: "h2", text: "Three ways to find one" },
      {
        kind: "ol",
        items: [
          "The sidebar, grouped by working directory, with worktrees as their own entries.",
          "The command palette, which searches projects and sessions by name.",
          "The project home, which puts recent work for that project next to the composer.",
        ],
      },
      { kind: "h2", text: "What comes back" },
      {
        kind: "ul",
        items: [
          "Every turn in order, with the model and reasoning effort it used.",
          "Tool calls and their output.",
          "Inline diffs at the point the edit happened.",
          "Approval decisions, so the record of what you allowed survives.",
          "Cost for the thread at published per token rates.",
        ],
      },
    ],
    howTo: {
      name: "Resume a Muse Code session in Helicon",
      steps: [
        { name: "Open Helicon", text: "The sidebar lists projects by working directory." },
        { name: "Find the project", text: "Use the sidebar, or the command palette to search by name." },
        { name: "Pick the session", text: "Sessions are listed under their project with their history." },
        { name: "Carry on", text: "Type in the composer. The thread continues where it stopped." },
      ],
    },
    faqs: [
      {
        q: "Can I resume a session I started in the terminal?",
        a: "Yes. The daemon discovers sessions for the workspace no matter which client started them.",
      },
      {
        q: "Does resuming cost anything extra?",
        a: "It uses your Muse Code subscription like any other turn. Helicon shows what the thread would have cost at published rates.",
      },
      {
        q: "What if the project moved on disk?",
        a: "Sessions are keyed by working directory, so add the new path as a project. The old entry stays until you remove it.",
      },
    ],
    related: ["features/session-history", "features/command-palette", "compare/muse-code-terminal"],
  },
  {
    slug: "guides/remote-daemon-setup",
    icon: "drives",
    section: "guides",
    label: "Remote daemon",
    title: "How to run Muse Code on a remote machine with a web UI",
    h1: "Drive Muse Code on a remote machine",
    description:
      "Put the Helicon daemon and the muse CLI on the machine that holds your code, then open the same UI in a browser from anywhere you trust the network.",
    answer:
      "Run the Helicon daemon and the muse CLI on the machine that holds your code, then open the web build in a browser and point it at that daemon. You get the same sidebar, diffs, approvals and cost view as the desktop app, with the agent running next to the repository instead of on your laptop.",
    keywords: [
      "muse code remote machine",
      "muse code server setup",
      "muse code web ui setup",
      "run coding agent on workstation",
      "muse code headless",
    ],
    updated: UPDATED,
    blocks: [
      { kind: "h2", text: "When this is the right shape" },
      {
        kind: "ul",
        items: [
          "The repository is large and the machine that holds it is not your laptop.",
          "Builds and test suites want more CPU than a laptop has.",
          "Code must not leave a particular machine.",
          "You want long runs to continue while the laptop sleeps.",
        ],
      },
      { kind: "h2", text: "What you need on the remote machine" },
      {
        kind: "ul",
        items: [
          "Node 22 or newer, because you are running the daemon from source rather than using the bundled runtime.",
          "The muse CLI, signed in with its own `muse login` on that machine.",
          "A way to reach it: your own tunnel, VPN or reverse proxy.",
        ],
      },
      { kind: "h2", text: "Security posture" },
      {
        kind: "p",
        text: "The daemon can start processes and edit files, because that is what a coding agent does. Treat it as you would any service with shell access: do not expose it to the open internet, put it behind a tunnel or a VPN, and keep the approval modes strict rather than turning on allow all.",
      },
      {
        kind: "note",
        text: "There is no hosted Helicon. Nothing about your code, prompts, threads or files passes through us.",
      },
    ],
    howTo: {
      name: "Set up Helicon against a remote daemon",
      steps: [
        { name: "Install the muse CLI on the remote machine", text: "Sign in there with its own login.", code: "muse login" },
        { name: "Run the daemon there", text: "Node 22 or newer is required when running from source.", code: "npm install && npm run dev" },
        { name: "Reach it privately", text: "Use your own tunnel, VPN or reverse proxy rather than exposing the port." },
        { name: "Open the web UI", text: "Point the browser build at the daemon and add the projects on that machine." },
      ],
    },
    faqs: [
      {
        q: "Is there a hosted version?",
        a: "No. The daemon is yours, on a machine you control.",
      },
      {
        q: "Does the web UI have fewer features?",
        a: "No. It is the same React UI as the desktop app. The difference is which machine the daemon runs on.",
      },
      {
        q: "Can several people use one daemon?",
        a: "Multi user deployment is out of scope today. Helicon targets an individual developer's own machines.",
      },
    ],
    related: ["features/remote-daemon", "install/linux", "use-cases/remote-development"],
  },
  {
    slug: "guides/see-muse-code-cost",
    icon: "currency",
    section: "guides",
    label: "See what a thread cost",
    title: "How to see what a Muse Code thread cost",
    h1: "See what a Muse Code thread cost",
    description:
      "Open the usage page to see what every thread would have cost at published per token rates, by day, by model and by thread, plus your plan meter.",
    answer:
      "Open the usage page in Helicon. It shows what each thread would have cost at Meta's published per token rates, grouped by day, by model and by thread, alongside the 5 hour window and weekly cap as Muse Code reports them. It is a meter reading, not a bill.",
    keywords: [
      "muse code cost per thread",
      "how much did muse code cost",
      "muse code token spend",
      "muse code usage page",
      "track ai coding agent cost",
    ],
    updated: UPDATED,
    blocks: [
      { kind: "h2", text: "What you are looking at" },
      {
        kind: "p",
        text: "Your subscription already paid. These figures multiply the tokens each turn used by the published rate for the model that used them, which tells you which work is expensive. Nobody sends you this number as an invoice.",
      },
      { kind: "h2", text: "Reading the three breakdowns" },
      {
        kind: "table",
        head: ["View", "Question it answers"],
        rows: [
          ["By thread", "Which piece of work was expensive"],
          ["By day", "Whether today was unusual"],
          ["By model", "What reasoning effort actually costs"],
        ],
      },
      { kind: "h2", text: "Using it to change behaviour" },
      {
        kind: "ul",
        items: [
          "Compare a high effort run against a low effort one on similar work.",
          "Look at threads where a subagent fan out ran, and see what the parallelism cost.",
          "Spot the long thread that has been re reading the same context every turn.",
        ],
      },
    ],
    faqs: [
      {
        q: "Will Helicon ever bill me?",
        a: "No. Helicon is free, MIT licensed, with no paid tier and no billing relationship.",
      },
      {
        q: "Is this my plan usage?",
        a: "No. Plan usage is shown separately as the 5 hour window and weekly cap, exactly as Muse Code reports them.",
      },
      {
        q: "Is the calculation done locally?",
        a: "Yes. Token counts come from Muse Code and the arithmetic happens on your machine.",
      },
    ],
    related: ["features/cost-and-usage", "features/plan-limits", "pricing"],
  },
  {
    slug: "guides/review-agent-changes",
    icon: "search",
    section: "guides",
    label: "Review what the agent did",
    title: "How to review what a Muse Code agent changed",
    h1: "Review what the agent changed",
    description:
      "Read a finished Muse Code run: inline diffs at the point of the edit, tool calls with their output, the approval record, and the touched files in a viewer beside the thread.",
    answer:
      "Scroll the thread. Each edit is rendered as a diff at the turn that produced it, tool calls show the command and its output, and approvals show what you allowed and when. Click any path the agent mentions and it opens in the file viewer beside the conversation.",
    keywords: [
      "review muse code changes",
      "what did the agent change",
      "muse code audit agent run",
      "coding agent diff review",
      "muse code tool call output",
    ],
    updated: UPDATED,
    blocks: [
      { kind: "h2", text: "A review is three questions" },
      {
        kind: "ol",
        items: [
          "What did it change? The inline diffs, in the order they happened.",
          "What did it run? The tool calls, with the command and the output, not a summary.",
          "What did I allow? The approval record, still in the thread.",
        ],
      },
      { kind: "h2", text: "Reading a long unattended run" },
      {
        kind: "p",
        text: "Nothing needs replaying. The thread is the event log rendered, so a run that finished overnight reads exactly like one you watched. Start at the first approval, because that is usually where the run either went well or went sideways.",
      },
      { kind: "h2", text: "Cross checking against git" },
      {
        kind: "p",
        text: "Helicon does not commit for you. The diffs in the thread are what the agent did, and your working tree is the ground truth. For parallel work, isolated git worktrees appear as their own projects, so one agent's changes never mix with another's.",
      },
    ],
    faqs: [
      {
        q: "Does Helicon commit changes?",
        a: "No. It shows what changed. Committing stays yours.",
      },
      {
        q: "Can I see the exact command that ran?",
        a: "Yes. Tool calls are rendered with the command and its output rather than a description.",
      },
      {
        q: "Where do I see what I approved?",
        a: "Approval decisions stay in the thread history at the point they were made.",
      },
    ],
    related: ["features/inline-diffs", "features/approvals", "features/file-viewer"],
  },
  {
    slug: "guides/run-parallel-agents",
    icon: "gitFork",
    section: "guides",
    label: "Parallel agents in worktrees",
    title: "How to run several Muse Code agents in parallel",
    h1: "Run several Muse Code agents at once",
    description:
      "Use isolated git worktrees so parallel agents never collide, then watch all of them from one sidebar that shows which threads are running and which are blocked.",
    answer:
      "Create an isolated git worktree per task so the agents never touch the same files, add each one to Helicon as its own project, and start a thread in each. The sidebar then shows every run in one list, marked by whether it is running, finished, or blocked on your approval.",
    keywords: [
      "run multiple muse code agents",
      "parallel coding agents",
      "git worktree ai agent",
      "muse code multiple sessions",
      "muse code concurrent threads",
    ],
    updated: UPDATED,
    blocks: [
      { kind: "h2", text: "Why worktrees rather than branches" },
      {
        kind: "p",
        text: "Two agents on one checkout will fight over the same files. A git worktree gives each one its own directory with the same repository behind it, which is the cheapest real isolation available without cloning.",
      },
      { kind: "code", lang: "sh", code: "git worktree add ../proj-auth -b feat/auth\ngit worktree add ../proj-search -b feat/search" },
      { kind: "h2", text: "Adding them to Helicon" },
      {
        kind: "p",
        text: "Add each worktree directory as a project. Helicon keys projects by working directory, so each one gets its own entry with a badge marking it as a worktree, and its sessions live underneath.",
      },
      { kind: "h2", text: "Watching them" },
      {
        kind: "ul",
        items: [
          "Running threads are marked while they run.",
          "Threads waiting on an approval are marked, so you know which one needs you.",
          "Stop one call, background it, or stop everything, without ending the session.",
          "The usage page shows what the parallelism cost, by thread.",
        ],
      },
      {
        kind: "note",
        text: "Each workspace gets its own `muse serve` host, the same process the CLI would start. Parallelism is bounded by your machine and your plan, not by Helicon.",
      },
    ],
    howTo: {
      name: "Run several Muse Code agents in parallel with git worktrees",
      steps: [
        { name: "Create a worktree per task", text: "Each agent gets its own directory.", code: "git worktree add ../proj-auth -b feat/auth" },
        { name: "Add each worktree as a project", text: "Helicon lists them separately with a worktree badge." },
        { name: "Start a thread in each", text: "Threads are grouped under their own project." },
        { name: "Triage from the sidebar", text: "Running, finished and blocked threads are marked, so you can see who needs you." },
      ],
    },
    faqs: [
      {
        q: "How many agents can I run?",
        a: "As many as your machine and your Muse Code plan allow. Each workspace gets its own muse serve host.",
      },
      {
        q: "Do worktrees show as separate projects?",
        a: "Yes, each with a badge, because each is its own working directory.",
      },
      {
        q: "How do I know which one is waiting on me?",
        a: "Blocked threads are marked in the sidebar, so the approval queue is visible without opening each one.",
      },
    ],
    related: ["features/projects-and-worktrees", "features/background-tasks", "use-cases/parallel-agents"],
  },
  {
    slug: "guides/keyboard-shortcuts",
    icon: "keyboard",
    section: "guides",
    label: "Keyboard control",
    title: "Muse Code GUI keyboard shortcuts and slash commands",
    h1: "Driving Helicon from the keyboard",
    description:
      "The command palette, slash commands in the composer, and the model and reasoning effort picker. Everything in Helicon is reachable without a mouse.",
    answer:
      "Open the command palette to jump to any project, session or action. Slash commands work in the composer the way they do in the CLI, and the model and reasoning effort picker changes the next turn without restarting the thread. No part of Helicon requires a pointing device.",
    keywords: [
      "muse code keyboard shortcuts",
      "muse code command palette",
      "muse code slash commands",
      "keyboard driven agent gui",
      "helicon shortcuts",
    ],
    updated: UPDATED,
    blocks: [
      { kind: "h2", text: "The palette is the main road" },
      {
        kind: "p",
        text: "If you know the name of a project or a session, the palette is faster than the sidebar. It also holds the actions, so new thread, stop, background, settings, theme and usage are all one search away.",
      },
      { kind: "h2", text: "In the composer" },
      {
        kind: "ul",
        items: [
          "Slash commands, matching what the CLI accepts.",
          "Goal controls, so you can set or change the standing objective without leaving the input.",
          "The model and reasoning effort picker, applied to the next turn.",
        ],
      },
      { kind: "h2", text: "Why this exists" },
      {
        kind: "p",
        text: "The reasonable objection to any GUI over a CLI is that it will be slower. It is only slower if it forces the mouse. Everything here was built so the keyboard path is the fast one.",
      },
    ],
    faqs: [
      {
        q: "Can I remap shortcuts?",
        a: "The palette covers every action by name, which is the intended fast path. Settings holds the app level preferences.",
      },
      {
        q: "Do slash commands behave like the CLI?",
        a: "The composer accepts them, and the goal controls also exist as panel buttons when you prefer clicking.",
      },
      {
        q: "Can I switch model mid thread?",
        a: "Yes, with the picker. It applies from the next turn.",
      },
    ],
    related: ["features/command-palette", "features/goals", "features/session-history"],
  },
  {
    slug: "guides/muse-cli-not-found",
    icon: "warning",
    section: "guides",
    label: "Fix: muse CLI not found",
    title: "Fix: Helicon cannot find the muse CLI",
    h1: "When Helicon cannot find the muse CLI",
    description:
      "Helicon needs a working, logged in muse CLI. Here is how to check which install it is looking at on Windows, macOS, Linux and WSL2, and how to fix each case.",
    answer:
      "Helicon drives the muse CLI and cannot work without one that is installed and logged in. Check muse --version in the shell that holds your install, run muse login there, and confirm which route Helicon took: native on Windows, inside WSL2, or the system PATH on macOS and Linux.",
    keywords: [
      "muse cli not found",
      "helicon cannot find muse",
      "muse command not found",
      "muse code not detected",
      "muse login required",
    ],
    updated: UPDATED,
    blocks: [
      { kind: "h2", text: "Check the CLI first" },
      { kind: "code", lang: "sh", code: "muse --version\nmuse login" },
      {
        kind: "p",
        text: "Run both in the shell where you installed Muse Code. Helicon stores no credentials, so a CLI that is installed but not signed in will fail in exactly the same way as one that is missing.",
      },
      { kind: "h2", text: "Per platform" },
      {
        kind: "table",
        head: ["Platform", "Where to check", "Common cause"],
        rows: [
          ["Windows, native", "PowerShell", "Installed for a different user, or not on PATH"],
          ["Windows, WSL2", "The WSL2 shell", "Logged in on Windows but not inside the distribution"],
          ["macOS", "Terminal", "Installed under a version manager the app does not see"],
          ["Linux", "Your shell", "Installed for root, running as your user"],
        ],
      },
      { kind: "h2", text: "If the version answers but Helicon still complains" },
      {
        kind: "ul",
        items: [
          "Confirm you are signed in: `muse login` in that same shell.",
          "On Windows, check whether you have both a native and a WSL2 install. Helicon prefers native.",
          "Restart the app so it re runs detection after you change an install.",
          "Check that the project directory you added actually exists on the machine running the daemon.",
        ],
      },
    ],
    howTo: {
      name: "Fix Helicon not finding the muse CLI",
      steps: [
        {
          name: "Ask the CLI directly",
          text: "Run this in the shell where you installed Muse Code. On Windows that is PowerShell for a native install, or the WSL2 shell for a WSL2 one.",
          code: "muse --version",
        },
        {
          name: "Sign in from that same shell",
          text: "An installed but signed-out CLI fails in exactly the same way as a missing one, because Helicon stores no credentials.",
          code: "muse login",
        },
        {
          name: "Check which route Helicon took",
          text: "On Windows, Helicon prefers a native install over WSL2. If you have both, it is talking to the native one.",
        },
        {
          name: "Restart the app",
          text: "Detection runs at startup, so restart after changing an install.",
        },
        {
          name: "Check the project path exists",
          text: "The directory you added has to exist on the machine running the daemon, which is not your laptop when you are using a remote daemon.",
        },
      ],
    },
    faqs: [
      {
        q: "Does Helicon install the muse CLI for me?",
        a: "No. It drives an install you own, using your own login. That is deliberate: it keeps credentials out of Helicon entirely.",
      },
      {
        q: "Can I point Helicon at a specific muse binary?",
        a: "Detection prefers a native install and falls back to WSL2 on Windows. Making the right binary reachable on PATH in the shell Helicon starts from is the reliable fix.",
      },
      {
        q: "Do I need Node.js?",
        a: "Not for the desktop app, which bundles its own. Running the daemon from source needs Node 22 or newer, and on Windows that means on the Windows host.",
      },
    ],
    related: ["install/windows", "install/wsl2", "install/macos"],
  },
  {
    slug: "guides/macos-first-launch",
    icon: "apple",
    section: "guides",
    label: "Fix: macOS first launch",
    title: "Fix: macOS blocks Helicon on first launch",
    h1: "Opening Helicon the first time on macOS",
    description:
      "The macOS builds are updater signed but not Apple notarized yet, so Gatekeeper warns once. Right click the app and choose Open, and later launches are normal.",
    answer:
      "The macOS DMG is updater signed but not Apple notarized yet, so Gatekeeper warns on first launch. Right click the app in Applications and choose Open, then confirm in the dialog. macOS remembers the decision and every later launch is normal. Notarization is a known gap, not a policy.",
    keywords: [
      "helicon macos gatekeeper",
      "macos cannot open app developer unverified",
      "muse code mac app blocked",
      "notarization warning helicon",
      "open unnotarized app macos",
    ],
    updated: UPDATED,
    blocks: [
      { kind: "h2", text: "What the warning means" },
      {
        kind: "p",
        text: "Gatekeeper distinguishes between signed and notarized. The Helicon DMG is signed for the updater but has not gone through Apple notarization, so macOS shows the unverified developer dialog the first time. It is not a statement about the binary being unsafe, and the source for it is public.",
      },
      { kind: "h2", text: "The fix" },
      {
        kind: "ol",
        items: [
          "Open Applications in Finder.",
          "Right click Helicon and choose Open.",
          "Confirm in the dialog that appears.",
          "Launch normally from then on.",
        ],
      },
      {
        kind: "note",
        text: "If you prefer to verify first, the repository is public and the releases are built from it.",
      },
    ],
    howTo: {
      name: "Open Helicon for the first time on macOS",
      steps: [
        { name: "Open Applications", text: "Find Helicon in Finder." },
        { name: "Right click and choose Open", text: "This is the path Gatekeeper accepts for an unnotarized app." },
        { name: "Confirm", text: "The dialog now has an Open button." },
        { name: "Launch normally", text: "macOS remembers, so later launches do not warn." },
      ],
    },
    faqs: [
      {
        q: "Will the builds be notarized?",
        a: "Notarization is a known gap rather than a decision. Until then the right click and Open path works.",
      },
      {
        q: "Is the app signed at all?",
        a: "Yes, it is updater signed, which is what makes auto update work. Apple notarization is the separate step.",
      },
      {
        q: "Does this affect auto update?",
        a: "No. Updates arrive through the app's own updater.",
      },
    ],
    related: ["install/macos", "use-cases/macos-power-users"],
  },
  {
    slug: "guides/from-terminal-to-gui",
    icon: "swap",
    section: "guides",
    label: "Move from the terminal",
    title: "Moving from the muse terminal to a GUI without losing anything",
    h1: "Moving from the muse TUI to a GUI",
    description:
      "You do not have to choose. Sessions started in the terminal show up in Helicon, resume there, and the CLI keeps working exactly as before.",
    answer:
      "Nothing has to be migrated. Helicon reads the same Muse Code state the CLI writes, so sessions you started in the terminal appear in the sidebar with their history and resume from the app. The CLI keeps working unchanged, and most people end up using both for different jobs.",
    keywords: [
      "muse code terminal to gui",
      "switch from muse tui",
      "muse code gui migration",
      "keep using muse cli with gui",
      "muse code both interfaces",
    ],
    updated: UPDATED,
    blocks: [
      { kind: "h2", text: "There is no migration" },
      {
        kind: "p",
        text: "Helicon is a client, not a fork. It starts `muse serve` and speaks the Muse Code Session Protocol through Meta's MIT SDK. Your sessions, your login and your configuration stay where they are.",
      },
      { kind: "h2", text: "A sensible split" },
      {
        kind: "table",
        head: ["Job", "Where it is faster"],
        rows: [
          ["One quick fix in one repo", "The terminal"],
          ["Scripted or CI invocation", "The terminal"],
          ["Four threads across three repos", "Helicon"],
          ["Reopening last week's work", "Helicon"],
          ["Reviewing what a long run did", "Helicon"],
          ["Checking cost and plan usage", "Helicon"],
        ],
      },
      { kind: "h2", text: "First week checklist" },
      {
        kind: "ol",
        items: [
          "Add the two or three directories you actually work in.",
          "Open an old terminal session from the sidebar to see that history survived.",
          "Leave a long run going and check the approval queue instead of watching it.",
          "Look at the usage page once, to calibrate what your habits cost.",
        ],
      },
    ],
    faqs: [
      {
        q: "Do I have to stop using the CLI?",
        a: "No. Helicon requires it, and many people keep both open.",
      },
      {
        q: "Will the GUI change my Muse Code configuration?",
        a: "It drives the CLI with your own settings and login. Approval modes and allow lists stay Muse Code's.",
      },
      {
        q: "What if I decide against it?",
        a: "Uninstall the app. Your sessions and your CLI are untouched, because Helicon only ever read them.",
      },
    ],
    related: ["compare/muse-code-terminal", "features/session-history", "guides/resume-a-muse-session"],
  },
];
