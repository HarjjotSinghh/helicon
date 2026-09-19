import type { SeoPage } from "../types";

/** One page per capability, written for the query someone types when they want that capability. */

const UPDATED = "2026-09-19";

export const FEATURE_PAGES: SeoPage[] = [
  {
    slug: "features/session-history",
    section: "features",
    label: "Session history and resume",
    title: "Muse Code session history: find and resume any thread",
    h1: "Session history and resume",
    description:
      "Every Muse Code session, grouped by project, with full history and one click resume. Sessions started in the muse terminal TUI are discovered and resumable too.",
    answer:
      "Helicon keeps a local index of every Muse Code session on the machine, grouped by the working directory the agent ran in. Each session keeps its full turn history and resumes in one click, including sessions you started in the muse terminal TUI, so closing a terminal tab no longer loses the thread.",
    keywords: [
      "muse code session history",
      "resume muse code session",
      "muse code chat history",
      "find old muse session",
      "muse code conversation history",
    ],
    updated: UPDATED,
    blocks: [
      { kind: "h2", text: "The problem this solves" },
      {
        kind: "p",
        text: "In a terminal, a session is as durable as the tab it runs in. Close the tab, reboot, or lose the SSH connection and the conversation is gone from view even though the underlying session still exists on disk. Anyone running more than one agent at a time hits this within a day.",
      },
      { kind: "h2", text: "How Helicon indexes sessions" },
      {
        kind: "ul",
        items: [
          "A local daemon starts one `muse serve` host per workspace and speaks the Muse Code Session Protocol to it.",
          "Projects, sessions and turns are written to local SQLite on your own machine.",
          "Projects are keyed by the working directory the agent ran in, so isolated git worktrees appear as their own entries with a badge.",
          "Sessions the terminal TUI created are discovered by the daemon, not scraped from output, so they carry their real history.",
        ],
      },
      { kind: "h2", text: "What resuming actually restores" },
      {
        kind: "ul",
        items: [
          "Every turn in order, with the model and reasoning effort each one used.",
          "Tool calls and their output, including commands the agent ran.",
          "Inline diffs at the point in the thread where the edit happened.",
          "Approval decisions, so you can see what you allowed and when.",
          "Cost for the thread at published per token rates.",
        ],
      },
      { kind: "h2", text: "Finding a thread again" },
      {
        kind: "p",
        text: "The sidebar groups sessions under their project. The command palette jumps to any project, session or action without the mouse. If you remember the repository, you are two keystrokes from the thread.",
      },
      { kind: "note", text: "All of this is local. No account, no sync, no thread data leaving the machine." },
    ],
    faqs: [
      {
        q: "Does Helicon see sessions I started in the terminal?",
        a: "Yes. The daemon discovers sessions for a workspace regardless of which client started them, so terminal TUI sessions appear in the sidebar with full history and resume from the app.",
      },
      {
        q: "Where is session history stored?",
        a: "In local SQLite on your machine. Helicon has no server side account and syncs nothing.",
      },
      {
        q: "Can I resume a session after rebooting?",
        a: "Yes. History is on disk, so a restart does not lose anything.",
      },
    ],
    related: ["features/projects-and-worktrees", "features/command-palette", "compare/muse-code-terminal"],
  },
  {
    slug: "features/inline-diffs",
    section: "features",
    label: "Inline diffs",
    title: "Inline diffs for Muse Code: see every edit in the thread",
    h1: "Inline diffs in the thread",
    description:
      "Every file the agent edits lands as a diff at the point in the conversation where it happened, with the touched file open in a viewer beside the thread.",
    answer:
      "Helicon renders each edit as a diff inline in the thread, at the exact turn that produced it, instead of printing a patch into scrollback. A file viewer sits beside the conversation, so any path Muse Code mentions opens with syntax highlighting without leaving the app.",
    keywords: [
      "muse code diff viewer",
      "muse code see file changes",
      "inline diff coding agent",
      "muse code review changes",
      "muse code what did the agent change",
    ],
    updated: UPDATED,
    blocks: [
      { kind: "h2", text: "Why inline matters" },
      {
        kind: "p",
        text: "A patch printed into a terminal is correct and nearly unusable. Ten minutes later it is above the fold of a scroll buffer with no anchor to the sentence that caused it. Putting the diff where the edit happened means the reason and the result are one screen apart.",
      },
      { kind: "h2", text: "What you get" },
      {
        kind: "ul",
        items: [
          "Added and removed lines coloured with the same tokens the rest of the app uses, in light and dark.",
          "The file path, so you know what moved without guessing.",
          "A viewer beside the thread that opens any path the agent mentions, with syntax highlighting.",
          "Markdown preview and editing, plus image, video and PDF preview, for repositories that are not only source.",
        ],
      },
      { kind: "h2", text: "Reviewing a long run" },
      {
        kind: "p",
        text: "For a thread that ran while you were away, scroll the conversation and the diffs are already in place. Nothing needs to be replayed, because the event log is the record and Helicon renders it directly.",
      },
    ],
    faqs: [
      {
        q: "Can I edit files in Helicon?",
        a: "Markdown can be previewed and edited in the viewer. For source code, Helicon is read oriented and expects you to keep your own editor.",
      },
      {
        q: "Do diffs survive a resume?",
        a: "Yes. They are part of the thread history, so reopening the session shows them exactly where they were.",
      },
      {
        q: "Does it show shell commands too?",
        a: "Yes. Tool calls and their output are rendered in the thread alongside the diffs.",
      },
    ],
    related: ["features/session-history", "features/file-viewer", "features/approvals"],
  },
  {
    slug: "features/approvals",
    section: "features",
    label: "Approvals",
    title: "Muse Code approvals, surfaced and never bypassed",
    h1: "Approvals you can actually see",
    description:
      "Every approval Muse Code raises appears in Helicon the moment it arrives. onRequest, promptUnmatched and denyUnmatched are mapped one to one, and allow all is an explicit opt in.",
    answer:
      "Helicon surfaces every approval request Muse Code raises, as it arrives, and never batches or bypasses one. The three protocol modes, onRequest, promptUnmatched and denyUnmatched, are mapped one to one, so the app behaves exactly as the CLI would. Allow all exists but sits behind a deliberate opt in.",
    keywords: [
      "muse code approvals",
      "muse code permission prompt",
      "coding agent approval queue",
      "muse code safe mode",
      "muse code allow command",
    ],
    updated: UPDATED,
    blocks: [
      { kind: "h2", text: "Why this is a design decision, not a feature" },
      {
        kind: "p",
        text: "An agent with shell and file system access is only as safe as the moment you get to say no. A wrapper that auto approves to keep a demo smooth has quietly removed that moment. Helicon treats the approval as the most important event in the protocol.",
      },
      { kind: "h2", text: "The three modes, unchanged" },
      {
        kind: "table",
        head: ["Mode", "What Muse Code does", "What Helicon does"],
        rows: [
          ["onRequest", "Asks before the tool call runs", "Shows the request and waits for you"],
          ["promptUnmatched", "Asks when the call is outside the allow list", "Same, with the reason shown"],
          ["denyUnmatched", "Refuses anything outside the allow list", "Shows the refusal in the thread"],
        ],
        caption: "Approval modes are mapped one to one with no reinterpretation.",
      },
      { kind: "h2", text: "In practice" },
      {
        kind: "ul",
        items: [
          "A waiting thread is marked in the sidebar so you can tell at a glance which one needs you.",
          "The request shows the command or edit, not a summary of it.",
          "Decisions stay in the thread history, so you can see later what was allowed.",
          "Allow all is a dangerous opt in, labelled as such, and off by default.",
        ],
      },
      {
        kind: "note",
        text: "Helicon never stores credentials. Authentication is your own `muse login`, held by the CLI.",
      },
    ],
    faqs: [
      {
        q: "Can Helicon approve things on my behalf?",
        a: "Only if you turn on allow all, which is an explicit opt in presented as dangerous. By default every approval waits for you.",
      },
      {
        q: "Do I lose approvals if I close the window?",
        a: "No. The request belongs to the session, so reopening the thread shows it still waiting.",
      },
      {
        q: "Does Helicon change what Muse Code considers safe?",
        a: "No. The allow list and the modes are Muse Code's. Helicon renders them and sends your answer back.",
      },
    ],
    related: ["features/background-tasks", "features/inline-diffs", "compare/muse-code-terminal"],
  },
  {
    slug: "features/cost-and-usage",
    section: "features",
    label: "Cost at API rates",
    title: "Muse Code cost tracking: what each thread would cost",
    h1: "Cost at API rates, per thread",
    description:
      "See what every Muse Code thread would have cost at published per token rates, broken down by day, by model and by thread. A meter reading on your subscription, not a bill.",
    answer:
      "Helicon shows what each Muse Code thread would have cost at Meta's published per token rates, broken down by day, by model and by thread. It is a meter reading rather than an invoice: your subscription already paid, and this is how you find out what it did.",
    keywords: [
      "muse code cost",
      "muse code token usage",
      "muse code api rates",
      "how much does muse code cost per thread",
      "muse code spend tracking",
    ],
    updated: UPDATED,
    blocks: [
      { kind: "h2", text: "What the number means" },
      {
        kind: "p",
        text: "A subscription hides the thing a per token bill makes obvious: which work was expensive. Helicon multiplies the tokens each turn actually used by the published rate for the model that used them. Nobody charges you this. It is the scale reading, and it is the fastest way to learn which habits are costly.",
      },
      { kind: "h2", text: "Three views" },
      {
        kind: "ul",
        items: [
          "By thread, so you can see that one refactor cost more than a week of small edits.",
          "By day, so a spike is visible before it becomes a pattern.",
          "By model, so the difference between reasoning efforts stops being abstract.",
        ],
      },
      { kind: "h2", text: "What it is not" },
      {
        kind: "ul",
        items: [
          "Not a bill. You are on a subscription and Helicon has no billing relationship with you at all.",
          "Not an estimate of your plan limit. That is reported separately, as Muse Code reports it.",
          "Not sent anywhere. The calculation happens locally against local usage data.",
        ],
      },
    ],
    faqs: [
      {
        q: "Does Helicon charge me anything?",
        a: "No. Helicon is free, MIT licensed, with no paid tier. It uses the Muse Code subscription you already have.",
      },
      {
        q: "Are these numbers exact?",
        a: "They are token counts reported by Muse Code multiplied by published per token rates. They are exact as an arithmetic exercise and irrelevant as an invoice, because your subscription is what pays.",
      },
      {
        q: "Can I see usage against my plan limit?",
        a: "Yes, separately. Helicon shows the 5 hour window and the weekly cap as Muse Code reports them, in the sidebar and on the usage page.",
      },
    ],
    related: ["features/plan-limits", "features/session-history", "pricing"],
  },
  {
    slug: "features/plan-limits",
    section: "features",
    label: "Plan meter",
    title: "Muse Code usage limits: the 5 hour window, in the sidebar",
    h1: "Your real plan meter",
    description:
      "Helicon shows the Muse Code 5 hour window and weekly cap exactly as the CLI reports them, in the sidebar and on the usage page, so a limit never arrives as a surprise.",
    answer:
      "Helicon reads the usage Muse Code itself reports and shows the 5 hour rolling window and the weekly cap in the sidebar and on the usage page. It is the same number the CLI has, surfaced where you can see it before a long run rather than after a refusal.",
    keywords: [
      "muse code usage limits",
      "muse code rate limit",
      "muse code 5 hour window",
      "muse code weekly cap",
      "muse code quota",
    ],
    updated: UPDATED,
    blocks: [
      { kind: "h2", text: "Why it is in the sidebar" },
      {
        kind: "p",
        text: "Hitting a cap halfway through a long refactor is the worst time to learn about it. Putting the meter next to the thread list means the information is present when you are deciding whether to start something big.",
      },
      { kind: "h2", text: "What is shown" },
      {
        kind: "ul",
        items: [
          "The 5 hour rolling window, as Muse Code reports it.",
          "The weekly cap, as Muse Code reports it.",
          "Both again on the usage page, next to cost at API rates.",
        ],
      },
      {
        kind: "note",
        text: "Helicon does not calculate or guess these. If Muse Code reports a figure, Helicon shows it. If it does not, Helicon shows nothing rather than inventing one.",
      },
    ],
    faqs: [
      {
        q: "Is this Helicon's estimate of my limit?",
        a: "No. It is the value the Muse Code CLI reports over the protocol, displayed unchanged.",
      },
      {
        q: "Does it work on every plan?",
        a: "It shows whatever Muse Code reports for your plan. Where the CLI reports nothing, the meter is empty rather than guessed.",
      },
      {
        q: "Where do I see it?",
        a: "In the sidebar during normal work, and in detail on the usage page alongside cost at API rates.",
      },
    ],
    related: ["features/cost-and-usage", "features/session-history"],
  },
  {
    slug: "features/projects-and-worktrees",
    section: "features",
    label: "Projects and worktrees",
    title: "Projects and git worktrees in a Muse Code GUI",
    h1: "Projects, grouped by working directory",
    description:
      "Helicon groups every Muse Code thread under the directory the agent worked in, isolated git worktrees included, so parallel work across repositories has one place to live.",
    answer:
      "Helicon's sidebar is organised by working directory. Every Muse Code thread appears under the project it ran in, and isolated git worktrees show up as their own entries with a badge, so running four agents across three repositories stays legible instead of becoming four terminal tabs.",
    keywords: [
      "muse code multiple projects",
      "muse code git worktree",
      "run muse code in parallel",
      "muse code multi repo",
      "coding agent project sidebar",
    ],
    updated: UPDATED,
    blocks: [
      { kind: "h2", text: "The unit is the directory" },
      {
        kind: "p",
        text: "Muse Code sessions belong to a working directory. Helicon takes that seriously and makes the directory the organising object, so the sidebar is a map of where work is happening rather than a flat list of conversations.",
      },
      { kind: "h2", text: "Worktrees are first class" },
      {
        kind: "p",
        text: "An isolated git worktree is a different directory with the same repository behind it. That is exactly the setup people use to run several agents on one codebase without collisions, so Helicon lists each worktree as its own project with a badge showing what it is.",
      },
      { kind: "h2", text: "Telling the state apart" },
      {
        kind: "ul",
        items: [
          "Running threads are marked while they run.",
          "Threads blocked on an approval are marked so you know which one needs you.",
          "Finished threads stay listed with their history rather than disappearing.",
        ],
      },
      { kind: "h2", text: "Adding a project" },
      {
        kind: "p",
        text: "Point Helicon at a directory and it starts a `muse serve` host for that workspace. Sessions already on disk for it, including ones from the terminal, are discovered rather than recreated.",
      },
    ],
    faqs: [
      {
        q: "How many projects can I add?",
        a: "As many as your machine can run hosts for. Each workspace gets one `muse serve` process, the same process the CLI would start.",
      },
      {
        q: "Do worktrees show as one project or several?",
        a: "Several. Each worktree is its own directory and gets its own entry with a badge, because that is how the agent sees it.",
      },
      {
        q: "Can I run several agents at once?",
        a: "Yes. That is the case the sidebar is built for, including seeing which of them is waiting on an approval.",
      },
    ],
    related: ["features/session-history", "features/background-tasks", "use-cases/parallel-agents"],
  },
  {
    slug: "features/command-palette",
    section: "features",
    label: "Keyboard and palette",
    title: "Command palette and keyboard control for Muse Code",
    h1: "Keyboard first, mouse optional",
    description:
      "A command palette, slash commands and a model and reasoning effort picker. Every project, session and action in Helicon is reachable without the mouse.",
    answer:
      "Helicon is fully keyboard operable. A command palette jumps to any project, session or action, slash commands work in the composer the way they do in the CLI, and a picker switches model and reasoning effort mid thread. Nothing in the app requires a pointing device.",
    keywords: [
      "muse code command palette",
      "muse code keyboard shortcuts",
      "muse code slash commands",
      "keyboard driven coding agent gui",
      "muse code reasoning effort picker",
    ],
    updated: UPDATED,
    blocks: [
      { kind: "h2", text: "Why a terminal user cares" },
      {
        kind: "p",
        text: "The most common objection to a GUI from someone happy in a terminal is that it slows them down. It only does if it forces the mouse. Helicon was built so the fast path is the keyboard and the pointer is a convenience.",
      },
      { kind: "h2", text: "What the palette reaches" },
      {
        kind: "ul",
        items: [
          "Any project, by name, including worktrees.",
          "Any session, so history is one search away.",
          "Actions: new thread, stop, background, settings, theme, usage.",
        ],
      },
      { kind: "h2", text: "Slash commands and the picker" },
      {
        kind: "ul",
        items: [
          "Slash commands in the composer, matching what the CLI accepts.",
          "A model and reasoning effort picker you can change without restarting the thread.",
          "Goal controls from the composer as well as the goal panel.",
        ],
      },
    ],
    faqs: [
      {
        q: "Can I use Helicon entirely without a mouse?",
        a: "Yes. Every project, session and action is reachable from the palette or a shortcut.",
      },
      {
        q: "Do slash commands work like the CLI?",
        a: "The composer accepts slash commands, and the goal controls are available there as well as in the goal panel.",
      },
      {
        q: "Can I change the model mid thread?",
        a: "Yes. The model and reasoning effort picker applies to the next turn.",
      },
    ],
    related: ["features/goals", "features/session-history", "guides/keyboard-shortcuts"],
  },
  {
    slug: "features/file-viewer",
    section: "features",
    label: "File viewer",
    title: "A file viewer beside the Muse Code thread",
    h1: "Read what the agent touched",
    description:
      "Browse the project, read highlighted source, preview and edit Markdown, and view images, video and PDFs. Any path Muse Code mentions opens beside the conversation.",
    answer:
      "Helicon puts a file viewer next to the thread. You can browse the project tree, read source with syntax highlighting, preview and edit Markdown, and open images, video and PDFs. Paths the agent mentions in the conversation open there directly, so reviewing a change does not mean switching apps.",
    keywords: [
      "muse code file viewer",
      "muse code browse project",
      "coding agent file preview",
      "muse code markdown preview",
      "read agent changes",
    ],
    updated: UPDATED,
    blocks: [
      { kind: "h2", text: "What it opens" },
      {
        kind: "table",
        head: ["Kind", "What you get"],
        rows: [
          ["Source files", "Syntax highlighted, read oriented"],
          ["Markdown", "Preview, and editing when you want it"],
          ["Images", "Inline preview"],
          ["Video", "Inline playback"],
          ["PDF", "Inline preview"],
        ],
      },
      { kind: "h2", text: "Why it is beside the thread, not instead of it" },
      {
        kind: "p",
        text: "Reviewing agent work is a two column job: what it said and what it did. Putting the file next to the conversation keeps both in view. Helicon is not trying to be your editor, so the viewer optimises for reading rather than for writing.",
      },
      {
        kind: "note",
        text: "Paths Muse Code mentions are clickable. If the agent says it edited a file, that file is one click away.",
      },
    ],
    faqs: [
      {
        q: "Can I edit source in the viewer?",
        a: "Markdown is editable. Source files are read oriented, because Helicon is a client for an agent rather than an editor.",
      },
      {
        q: "Does it index my whole disk?",
        a: "No. It browses the project directories you add, nothing else.",
      },
      {
        q: "Does it work in the web build?",
        a: "Yes. The same UI ships as a web app against a daemon, so the viewer reads files on the daemon's machine.",
      },
    ],
    related: ["features/inline-diffs", "features/remote-daemon", "features/projects-and-worktrees"],
  },
  {
    slug: "features/remote-daemon",
    section: "features",
    label: "Remote daemon and web UI",
    title: "Run Muse Code on a remote machine, drive it from a browser",
    h1: "Remote daemon and the web build",
    description:
      "The same Helicon UI ships as a web app pointed at a daemon on another machine, so a laptop can supervise Muse Code running on a workstation or a server.",
    answer:
      "Helicon is one React codebase that ships two ways: as a Tauri desktop app with a local daemon, and as a web app pointed at a daemon running elsewhere. That means you can run Muse Code on a workstation or a server and supervise it from a browser on a laptop, with the same sidebar, diffs and approvals.",
    keywords: [
      "muse code remote server",
      "muse code web ui",
      "run muse code on a server",
      "muse code headless daemon",
      "muse code browser interface",
    ],
    updated: UPDATED,
    blocks: [
      { kind: "h2", text: "Why one codebase matters" },
      {
        kind: "p",
        text: "Web builds of desktop tools are usually the reduced version. Helicon's web app is the same UI compiled for a browser, so nothing is missing because of where you opened it.",
      },
      { kind: "h2", text: "What this is good for" },
      {
        kind: "ul",
        items: [
          "A big workstation runs the agents, a laptop watches them.",
          "The code lives on a machine that should not leave the office.",
          "Long running work continues when the laptop sleeps.",
          "A Linux server hosts the daemon while you are on Windows or macOS.",
        ],
      },
      { kind: "h2", text: "What it is not" },
      {
        kind: "p",
        text: "There is no hosted Helicon service. The daemon is yours, on a machine you control, and the browser talks to it. Nothing about your code, prompts, threads or files passes through us.",
      },
      {
        kind: "note",
        text: "Running the daemon from source needs Node 22 or newer on that machine. The desktop app bundles its own Node.",
      },
    ],
    faqs: [
      {
        q: "Is there a hosted version of Helicon?",
        a: "No. The web app points at a daemon you run. There is no account and no service in the middle.",
      },
      {
        q: "Can I use it over the internet?",
        a: "The daemon is a normal service you can expose however you expose services. Put it behind your own tunnel, VPN or reverse proxy.",
      },
      {
        q: "Is the web UI feature complete?",
        a: "It is the same React UI as the desktop app, so the interface is the same. The difference is which machine the daemon runs on.",
      },
    ],
    related: ["features/file-viewer", "guides/remote-daemon-setup", "use-cases/remote-development"],
  },
  {
    slug: "features/subagents-and-workflows",
    section: "features",
    label: "Subagents and workflows",
    title: "Watch Muse Code subagents and workflows in one window",
    h1: "Subagents and workflow runs",
    description:
      "Parallel subagents and workflow runs are hard to follow in a terminal. Helicon shows them as structure: what is running, what finished, and what you can cancel or retry.",
    answer:
      "Muse Code can fan work out to parallel subagents and run multi step workflows. In a terminal that is interleaved text. Helicon renders it as structure, so you can see which agents are running, cancel a workflow run, and skip or retry individual agents without restarting the thread.",
    keywords: [
      "muse code subagents",
      "muse code workflow",
      "parallel agents gui",
      "muse code cancel workflow",
      "muse code retry agent",
    ],
    updated: UPDATED,
    blocks: [
      { kind: "h2", text: "The terminal problem" },
      {
        kind: "p",
        text: "Seven agents writing to one stream is not a log, it is noise. The information is all there and none of it is legible. A replayable event log deserves a renderer.",
      },
      { kind: "h2", text: "What Helicon does with it" },
      {
        kind: "ul",
        items: [
          "Shows each subagent separately rather than interleaved.",
          "Cancels a workflow run without killing the whole thread.",
          "Skips an agent, or retries one that failed.",
          "Sends a running tool call to the background, stops one, or stops them all.",
        ],
      },
      { kind: "h2", text: "Why it stays honest" },
      {
        kind: "p",
        text: "Helicon renders the protocol events Muse Code emits. It does not summarise them into something tidier, because the point of watching an agent is seeing what it really did.",
      },
    ],
    faqs: [
      {
        q: "Can I stop one subagent without stopping the thread?",
        a: "Yes. Individual agents in a workflow run can be skipped or retried, and a workflow run can be cancelled on its own.",
      },
      {
        q: "Do subagents cost extra?",
        a: "They use your Muse Code subscription like any other turn. Helicon shows what the thread would have cost at published rates so the fan out is visible.",
      },
      {
        q: "Can I start a workflow from Helicon?",
        a: "Workflow support tracks what the protocol exposes. Where Muse Code surfaces a run, Helicon renders and controls it.",
      },
    ],
    related: ["features/background-tasks", "features/cost-and-usage", "features/approvals"],
  },
  {
    slug: "features/goals",
    section: "features",
    label: "Goals",
    title: "Set, pause and steer a Muse Code goal from the UI",
    h1: "Goals you can steer",
    description:
      "Set, pause, resume, change and clear a Muse Code goal from the goal panel or the composer, without dropping back into the terminal to retype a slash command.",
    answer:
      "Muse Code goals give a thread a standing objective. Helicon exposes the whole lifecycle in the interface: set a goal, pause it, resume it, change it or clear it, from either the goal panel or the composer, so steering a long run does not mean remembering command syntax.",
    keywords: [
      "muse code goal",
      "muse code /goal command",
      "steer coding agent",
      "muse code pause goal",
      "long running agent objective",
    ],
    updated: UPDATED,
    blocks: [
      { kind: "h2", text: "What a goal is for" },
      {
        kind: "p",
        text: "A goal is the difference between a chat and a job. It survives turns, so the agent keeps orienting toward the same objective while the conversation moves around it.",
      },
      { kind: "h2", text: "The controls" },
      {
        kind: "table",
        head: ["Action", "Where"],
        rows: [
          ["Set a goal", "Goal panel or composer"],
          ["Pause", "Goal panel"],
          ["Resume", "Goal panel"],
          ["Change", "Goal panel or composer"],
          ["Clear", "Goal panel"],
        ],
      },
      {
        kind: "p",
        text: "Pausing matters more than it sounds. It lets you interrupt with a side task, deal with it, and put the thread back on its objective without losing the framing you set up.",
      },
    ],
    faqs: [
      {
        q: "Is this different from just sending a message?",
        a: "Yes. A goal persists across turns as a standing objective rather than being one more message in the history.",
      },
      {
        q: "Can I still use the slash command?",
        a: "Yes. The composer accepts it, and the panel is there when you would rather click.",
      },
      {
        q: "Does pausing stop the agent?",
        a: "Pausing suspends the standing objective. Stopping a running tool call or the whole turn is a separate control.",
      },
    ],
    related: ["features/command-palette", "features/background-tasks", "features/session-history"],
  },
  {
    slug: "features/background-tasks",
    section: "features",
    label: "Background work",
    title: "Background and stop controls for running Muse Code tools",
    h1: "Background work under control",
    description:
      "Send a running tool call to the background, stop one, or stop them all. Cancel a workflow run, or skip and retry its agents, without abandoning the thread.",
    answer:
      "When a Muse Code tool call is taking too long, Helicon lets you send it to the background, stop that one call, or stop everything running, without ending the thread. Workflow runs can be cancelled, and individual agents inside them skipped or retried.",
    keywords: [
      "muse code stop command",
      "muse code background task",
      "cancel muse code tool call",
      "muse code long running command",
      "interrupt coding agent",
    ],
    updated: UPDATED,
    blocks: [
      { kind: "h2", text: "Three different kinds of stop" },
      {
        kind: "table",
        head: ["Control", "Effect"],
        rows: [
          ["Background", "The call keeps running, the thread stops waiting on it"],
          ["Stop this call", "That tool call ends, the turn continues"],
          ["Stop all", "Everything currently running ends"],
          ["Cancel run", "A workflow run ends, the thread survives"],
        ],
      },
      {
        kind: "p",
        text: "Conflating these is a common wrapper mistake, and it is why people end up killing a whole session to get out of one stuck test run.",
      },
      { kind: "h2", text: "What survives" },
      {
        kind: "ul",
        items: [
          "The thread and its history, in every case.",
          "The session, so you can resume and carry on.",
          "The record of what you stopped and when.",
        ],
      },
    ],
    faqs: [
      {
        q: "Does backgrounding lose the output?",
        a: "No. The call continues and its output lands in the thread when it finishes.",
      },
      {
        q: "Can I stop everything quickly?",
        a: "Yes. Stop all ends every running call at once, without ending the session.",
      },
      {
        q: "What happens to a cancelled workflow run?",
        a: "The run ends and the thread stays open. Individual agents can be skipped or retried instead if that is what you want.",
      },
    ],
    related: ["features/subagents-and-workflows", "features/approvals", "features/goals"],
  },
];
