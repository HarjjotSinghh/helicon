import type { SeoPage } from "../types";
import { MUSE_CODE_DOCS_URL } from "../../tested";

/**
 * SEO batch of 22 Oct 2026: two task guides and two long-form guides. Product claims come from
 * lib/facts.ts and the existing feature pages. Muse Code and Claude Code claims were checked
 * against the vendors' own docs on 22 Oct 2026 and link to them.
 */

const UPDATED = "2026-10-22";

const MUSE_SUBSCRIPTIONS = "https://dev.meta.ai/docs/muse-code/subscriptions";
const MUSE_INTERACTIVE = "https://dev.meta.ai/docs/muse-code/interactive";
const MUSE_REWIND = "https://dev.meta.ai/docs/muse-code/rewind";
const MUSE_PERMISSIONS = "https://dev.meta.ai/docs/muse-code/permissions";
const CLAUDE_CODE_OVERVIEW = "https://code.claude.com/docs/en/overview";

export const BURN_2026_10_22_PAGES: SeoPage[] = [
  {
    slug: "guides/muse-code-usage-limit",
    section: "guides",
    icon: "gauge",
    label: "Muse Code usage limit reached",
    title: "Muse Code usage limit reached: what to do next",
    h1: "You hit the Muse Code usage limit. What now?",
    description:
      "What happens when Muse Code hits your plan's usage limit, how the 5 hour window works, when upgrading helps, and how to keep a long run from stalling halfway.",
    answer:
      "When Muse Code hits your plan's usage limit, Meta's docs give two options: upgrade to the next plan, or wait until the limit refreshes. On the $200 Maximum Usage plan you can only wait. Typing /upgrade in a session opens Accounts Center, and an upgrade takes effect at once with a prorated charge.",
    keywords: [
      "muse code usage limit",
      "muse code usage limits",
      "muse code plan usage",
      "muse code limit reached",
      "muse code 5 hour limit",
    ],
    updated: UPDATED,
    blocks: [
      { kind: "h2", text: "How the limit is measured" },
      {
        kind: "p",
        text: `Muse Code plans are sized in prompts per 5 hours. Meta's [subscriptions page](${MUSE_SUBSCRIPTIONS}) gives the Everyday Usage plan 10 to 50 prompts every 5 hours, image and video uploads included. The other plans are multiples of that.`,
      },
      {
        kind: "table",
        caption: "Muse Code plans, from Meta's Muse Code page and subscriptions docs, checked 22 October 2026.",
        head: ["Plan", "Price a month", "Usage"],
        rows: [
          ["Everyday Usage", "$5", "10 to 50 prompts every 5 hours"],
          ["High Usage", "$15", "5x Everyday Usage"],
          ["Power Usage", "$50", "20x Everyday Usage"],
          ["Maximum Usage", "$200", "80x Everyday Usage"],
        ],
      },
      {
        kind: "p",
        text: "The range of 10 to 50 matters. A prompt that sends the agent through a long tool loop does not cost the same as a one line question, so two people on the same plan hit the wall at different points.",
      },
      { kind: "h2", text: "Your three options when the limit hits" },
      {
        kind: "ol",
        items: [
          "Wait for the window to refresh. Nothing is lost: the session log stays on disk, and `/resume` picks the thread up in the same workspace.",
          "Upgrade. Type `/upgrade` in a Muse Code session to open Accounts Center. Meta says an upgrade takes effect immediately, with a prorated charge for the rest of the billing cycle.",
          "Use an API key for the rest of the job. Meta bills usage through any extra API key pay as you go, per token, outside the subscription.",
        ],
      },
      {
        kind: "note",
        text: "On the Maximum Usage plan there is no plan above you. Meta's docs say you must wait for the limit to refresh.",
      },
      { kind: "h2", text: "Downgrades and cancelling" },
      {
        kind: "p",
        text: "A downgrade starts at the next billing cycle, and your current limit holds until then. Cancelling keeps access to the end of the cycle. Meta asks you to cancel at least 24 hours before the billing date to avoid the next charge.",
      },
      { kind: "h2", text: "How to stop a long run from stalling" },
      {
        kind: "ul",
        items: [
          "Check the meter before you start a long task, not after. In Helicon the 5 hour window sits in the sidebar, as the CLI reports it.",
          "Give the agent one clear, complete prompt instead of five corrections. Each follow-up counts.",
          "Run `/compact` before a long session grows unwieldy, so the agent works from a summary.",
          "Split big jobs into tasks that each finish inside one window, and commit between them.",
          "Watch parallel agents. Three threads in three worktrees draw on the same plan.",
        ],
      },
      { kind: "h2", text: "What Helicon shows, and what it does not" },
      {
        kind: "p",
        text: "Helicon is a free, MIT licensed desktop app for Muse Code. It shows the 5 hour window and weekly cap exactly as the muse CLI reports them, in the sidebar and on the usage page. It also shows what each thread would have cost at Meta's published per token rates. That figure is a meter reading for comparison, not a bill. Helicon has no plan of its own and cannot raise or reset your limit. The full feature is described in [Muse Code usage limits](/features/plan-limits), and the plan prices in [Muse Code pricing](/guides/muse-code-pricing).",
      },
    ],
    howTo: {
      name: "What to do when Muse Code hits your usage limit",
      steps: [
        { name: "Check how close you are", text: "Read the 5 hour window in the CLI or in Helicon's sidebar before a long task." },
        { name: "Decide: wait or upgrade", text: "Waiting costs nothing and the session resumes. Upgrading takes effect at once." },
        { name: "Upgrade from the session", text: "Type /upgrade to open Accounts Center.", code: "/upgrade" },
        { name: "Resume the thread", text: "When the window refreshes, pick the thread up where it stopped.", code: "/resume --last" },
      ],
    },
    faqs: [
      {
        q: "How long is the Muse Code usage window?",
        a: "Meta sizes plans in prompts every 5 hours. Everyday Usage is 10 to 50 prompts per 5 hours, and the other plans are 5x, 20x and 80x that.",
      },
      {
        q: "Do I lose my session when I hit the limit?",
        a: "No. Muse Code keeps the session as a log on disk, and /resume reopens it in the same workspace once the limit refreshes.",
      },
      {
        q: "Does Helicon use up my Muse Code limit?",
        a: "Helicon drives the same muse CLI, so the prompts you send through it count against your plan as they would in the terminal. Helicon adds no usage or bill of its own.",
      },
      {
        q: "Can I keep working with an API key?",
        a: "Yes. Meta bills usage through any extra API key pay as you go, per token, separate from the subscription.",
      },
    ],
    related: ["features/plan-limits", "guides/muse-code-pricing", "guides/see-muse-code-cost", "features/cost-and-usage", "guides/muse-code-session-manager"],
    source: { title: "Muse Code subscriptions (Meta developer docs)", url: MUSE_SUBSCRIPTIONS },
  },
  {
    slug: "guides/muse-code-session-manager",
    section: "guides",
    icon: "stack",
    label: "Manage Muse Code sessions",
    title: "Muse Code session manager: name, resume and fork",
    h1: "How to manage many Muse Code sessions",
    description:
      "Name, resume, fork and rewind Muse Code sessions in the CLI, then see every session from every project in one sidebar, with terminal sessions included.",
    answer:
      "In the muse CLI, /name labels a session, /resume reopens one, /resume --last reopens the newest, and /fork branches a copy. Resume only sees the current workspace. To see sessions from every project in one list, Helicon's sidebar groups them by working directory, terminal sessions included, with one click resume.",
    keywords: [
      "muse code session manager",
      "muse code resume session",
      "muse code sessions",
      "muse code fork session",
      "manage muse code sessions",
    ],
    updated: UPDATED,
    blocks: [
      { kind: "h2", text: "The session commands in the CLI" },
      {
        kind: "p",
        text: `Muse Code records each run as an append-only event log: model calls, tool calls and results, and approval decisions. These commands work on those logs. All are from Meta's [Working with the agent](${MUSE_INTERACTIVE}) page, checked 22 October 2026.`,
      },
      {
        kind: "table",
        head: ["Command", "What it does"],
        rows: [
          ["`/name <name>`", "Gives the current session a stable name that other live sessions can find."],
          ["`/resume`", "Reopens a retained session in the current workspace and continues it."],
          ["`/resume --last`", "Reopens the most recent session in this workspace."],
          ["`/new`", "Starts a fresh session and keeps the terminal scrollback."],
          ["`/clear`", "Starts a fresh session and wipes the scrollback."],
          ["`/fork`", "Branches a new session from the latest stable point. The source stays as it was."],
          ["`/rewind`", "Branches from an earlier message. Workspace files are not restored."],
        ],
      },
      { kind: "h2", text: "Where the CLI stops" },
      {
        kind: "p",
        text: "Resume is scoped to the workspace you are in. With five repos and three sessions each, you have to remember which directory each thread lives in and `cd` there first. A thread that is blocked on an approval in another terminal tab gives you no sign until you look at that tab.",
      },
      {
        kind: "note",
        text: `Starting with \`muse --no-session-log\` skips the retained log. Those sessions cannot be resumed or rewound later, per Meta's [rewind docs](${MUSE_REWIND}).`,
      },
      { kind: "h2", text: "A naming habit that pays off" },
      {
        kind: "ul",
        items: [
          "Name a session for the task, not the date: `/name fix-login-redirect`.",
          "Fork before a risky change, so the plan you agreed on survives if the attempt goes wrong.",
          "Start a new session per task. One thread per change keeps the diff review short.",
          "Run parallel tasks in separate git worktrees, so each has its own workspace and its own resume list.",
        ],
      },
      { kind: "h2", text: "All sessions in one sidebar" },
      {
        kind: "p",
        text: "Helicon is a free, MIT licensed desktop app for Muse Code on Windows, macOS and Linux. It reads the same session logs the CLI writes and lists every session under its project, keyed by working directory. Sessions you started in the muse terminal show up there too, and resume with one click. Threads that are running or waiting on your approval are marked, so you can see which one needs you without opening each tab. More in [session history](/features/session-history) and [resuming a session](/guides/resume-a-muse-session).",
      },
      {
        kind: "p",
        text: "Helicon keeps its own state in a local SQLite file and has no account, so the session list never leaves your machine.",
      },
    ],
    howTo: {
      name: "Manage several Muse Code sessions",
      steps: [
        { name: "Name each session", text: "Label the task so you can find it later.", code: "/name fix-login-redirect" },
        { name: "Fork before a risky change", text: "Keep the source session untouched.", code: "/fork" },
        { name: "Resume the newest session in a workspace", text: "Pick up where you stopped.", code: "/resume --last" },
        { name: "See every project at once", text: "Open Helicon. Sessions from every working directory, terminal ones included, sit in one sidebar." },
      ],
    },
    faqs: [
      {
        q: "Can I resume a Muse Code session from another folder?",
        a: "Not with the CLI's /resume, which is scoped to the current workspace. Helicon lists sessions from every working directory in one sidebar and resumes any of them.",
      },
      {
        q: "Does /rewind undo file changes?",
        a: "No. Meta's docs say rewind changes conversation history only. Restore files with git.",
      },
      {
        q: "Will Helicon see sessions I start in the terminal?",
        a: "Yes. Sessions started in the muse terminal are discovered and can be resumed from Helicon.",
      },
    ],
    related: ["features/session-history", "guides/resume-a-muse-session", "guides/run-parallel-agents", "guides/from-terminal-to-gui", "guides/muse-code-usage-limit"],
    source: { title: "Working with the agent (Meta developer docs)", url: MUSE_INTERACTIVE },
  },
  {
    slug: "guides/review-ai-agent-diffs",
    section: "guides",
    icon: "gitDiff",
    label: "Review AI agent diffs",
    title: "How to review AI agent diffs before you merge",
    h1: "How to review AI agent diffs before you merge",
    description:
      "A routine for reviewing code a coding agent wrote: isolate the run, read approvals, check git diff in a fixed order, run tests yourself, commit in pieces.",
    answer:
      "Give the agent its own branch or worktree, then review in a fixed order: git diff --stat for scope, then config, dependencies and tests, then the logic. Compare what the agent said it did with the diff, check what its commands touched outside git, run the tests yourself, and stage with git add -p so each piece gets a look.",
    keywords: [
      "how to review ai generated code",
      "review ai agent diffs",
      "muse code diff review",
      "review coding agent changes",
      "ai code review checklist",
    ],
    updated: UPDATED,
    ogEyebrow: "Long read",
    blocks: [
      {
        kind: "p",
        text: "A coding agent can change forty files in the time it takes you to refill a coffee. Reading those changes is now the slow part of the job, and the part that decides whether the work ships or gets reverted on Friday. This guide is the routine I use for Muse Code runs. The git steps work the same for any agent.",
      },
      {
        kind: "p",
        text: "I build Helicon, a free, open-source desktop app for Muse Code, so where the guide mentions it, read that as the maker's view. Nothing here needs it.",
      },
      { kind: "h2", text: "Why agent diffs need their own routine" },
      {
        kind: "p",
        text: "A human pull request comes with a human who can explain it. An agent's diff comes with a transcript, and the transcript is a claim, not proof. The agent will say it ran the tests. It may have run a subset, or run them before its last edit. You review an agent's work the way you would review a contractor's: check the work against the ticket, not against the report.",
      },
      {
        kind: "p",
        text: `There is a second reason that is specific to how Muse Code is built. Meta's [permissions docs](${MUSE_PERMISSIONS}) say that file reads and in-workspace \`write_file\` and \`edit_file\` writes pass in any approval mode. Approvals gate shell commands and new network connections. They do not gate edits inside your project. So for the code itself, the diff review is the check. Nothing earlier in the pipeline asked you.`,
      },
      { kind: "h2", text: "Before the run: set it up so the diff is readable" },
      {
        kind: "p",
        text: "Most painful reviews are painful because of setup, not because the agent did something strange. Three habits fix most of it.",
      },
      { kind: "h3", text: "Start from a clean tree" },
      {
        kind: "p",
        text: "If your own half-finished edits sit in the working tree, you cannot tell your lines from the agent's. Commit or stash first.",
      },
      { kind: "code", lang: "sh", code: "git status --short\ngit stash push -m \"before agent run\"" },
      { kind: "h3", text: "Give each task its own branch or worktree" },
      {
        kind: "p",
        text: "One task per branch keeps the diff about one thing. If you run agents in parallel, give each one a git worktree, so two agents never edit the same checkout. The worktree is a separate directory backed by the same repository.",
      },
      { kind: "code", lang: "sh", code: "git worktree add ../app-login-fix -b agent/login-fix" },
      {
        kind: "p",
        text: "In Helicon each worktree shows up as its own project with a worktree badge, so the sessions and diffs for each task stay apart. The setup is in [running agents in parallel](/guides/run-parallel-agents).",
      },
      { kind: "h3", text: "Write the acceptance test into the prompt" },
      {
        kind: "p",
        text: "Tell the agent what done looks like: which test must pass, which command must exit 0, which files it should not touch. You will reuse that sentence as your review checklist.",
      },
      { kind: "h2", text: "During the run: read approvals as part of the review" },
      {
        kind: "p",
        text: "Approvals are the only point where you see a change before it lands. In Muse Code's default approval mode, dangerous or external shell patterns stop for review, and the first connection to a new host, port or protocol stops too. New sessions also default to the Auto-review profile, where an automated judge decides eligible requests before they reach you. Pick the Ask me profile, or start with `--approval-judge off`, if you want to see every one. Then read the real command, not the agent's description of it.",
      },
      {
        kind: "ul",
        items: [
          "A package install adds a dependency your diff will show only as a lockfile change.",
          "A migration or seed script changes a database that git does not track.",
          "A curl to an unknown host is a new network dependency, or a leak.",
          "An `rm -rf` on a build folder is fine. On a path built from a variable, look twice.",
        ],
      },
      {
        kind: "p",
        text: "Muse Code runs shell commands inside an OS sandbox that limits writes to the workspace and a temp folder, and keeps `.git`, `.muse` and `.agents` read-only. The agent cannot rewrite your history. It can still change anything else in the project. `--yolo` turns off both the approvals and the sandbox, so treat any run started with it as unreviewed until you have read the whole diff. More on that trade in [YOLO mode](/guides/muse-code-yolo-mode).",
      },
      { kind: "h2", text: "After the run: review in a fixed order" },
      {
        kind: "p",
        text: "Reading a diff top to bottom in file order is how small, important changes get skimmed. A fixed order puts the risky files first, while your attention is fresh.",
      },
      { kind: "h3", text: "Step 1. Check the scope" },
      { kind: "code", lang: "sh", code: "git diff --stat\ngit status --short" },
      {
        kind: "p",
        text: "Compare the file list with the task. A login fix that touches twelve files, including a CI workflow, needs a reason before you read a single line. `git status` also shows new untracked files, which `git diff` leaves out.",
      },
      { kind: "h3", text: "Step 2. Read config, dependencies and CI first" },
      { kind: "code", lang: "sh", code: "git diff -- package.json '*.lock' '*.toml' '*.yml' '.github/'" },
      {
        kind: "p",
        text: "These files change behaviour far from where the agent was working. Look for a new dependency, a version bump nobody asked for, a disabled lint rule, a loosened TypeScript setting, or a CI step that now skips a job.",
      },
      { kind: "h3", text: "Step 3. Read the tests before the code" },
      { kind: "code", lang: "sh", code: "git diff -- '*test*' '*spec*'" },
      {
        kind: "p",
        text: "Agents under pressure to make tests pass sometimes change the test. Watch for deleted assertions, a skip or only marker, a widened snapshot, a mocked function that used to be real, or an expected value edited to match a new wrong result. A test change is fine when the task asked for it. Otherwise it needs an explanation.",
      },
      { kind: "h3", text: "Step 4. Read the logic, one file at a time" },
      {
        kind: "p",
        text: "Now read the source changes. For each file, ask what it did before and what it does now. The patterns that show up most in agent code:",
      },
      {
        kind: "ul",
        items: [
          "Error handling that catches everything and logs nothing.",
          "A new helper that duplicates one already in the codebase.",
          "A fallback default that hides a missing value instead of failing.",
          "Comments that describe the change history instead of the code.",
          "Dead code left behind from an approach the agent abandoned.",
          "A hardcoded value, path or secret that belonged in config.",
        ],
      },
      { kind: "h3", text: "Step 5. Compare the transcript with the diff" },
      {
        kind: "p",
        text: "Read the agent's final summary, then check each claim against the diff. If it says it updated three call sites, count them. If it says the tests pass, look in the thread for the actual test command and its output, and note whether it ran after the last edit. In Helicon, tool calls show the command and its output inline, and each edit is a diff at the turn that made it, so you can trace a line back to the moment it was written. See [reviewing what the agent changed](/guides/review-agent-changes).",
      },
      { kind: "h3", text: "Step 6. Check what changed outside git" },
      {
        kind: "p",
        text: "The diff covers tracked files. It does not cover a local database, a global package, a running process, an environment variable or a file outside the repo. Scan the thread's tool calls for installs, migrations, background servers and network calls. Muse Code's `/tasks` command lists background work that is still running.",
      },
      { kind: "h3", text: "Step 7. Run the checks yourself" },
      {
        kind: "p",
        text: "Run the test suite, the type checker and the linter from a fresh shell. Do not trust a green result from inside the agent's session, because it may have run with a different environment or before its last edit. If the project has a build step, run that too.",
      },
      { kind: "h3", text: "Step 8. Stage in pieces" },
      { kind: "code", lang: "sh", code: "git add -p\ngit diff --cached" },
      {
        kind: "p",
        text: "`git add -p` walks you through every hunk and asks yes or no. It is slower than `git add .` and that is the point: you cannot stage a hunk you did not see. Leave out anything you do not understand, and ask the agent about it in the same thread.",
      },
      { kind: "h2", text: "When the diff is wrong" },
      {
        kind: "p",
        text: `Muse Code's \`/rewind\` branches the conversation from an earlier message. Meta's [rewind docs](${MUSE_REWIND}) say plainly that it does not restore, revert or delete workspace files. Undo file changes with git, then rewind the conversation if you want to retry from that point.`,
      },
      { kind: "code", lang: "sh", code: "git restore --staged --worktree path/to/file\n# or throw away the whole attempt\ngit worktree remove ../app-login-fix" },
      {
        kind: "p",
        text: "If the approach was right but the details were off, keep the branch and ask for a narrow follow-up: name the file, the line and the expected behaviour. A vague \"fix the tests\" invites a second large diff.",
      },
      { kind: "h2", text: "How long a review should take" },
      {
        kind: "p",
        text: "Budget review time by risk, not by line count. A 400 line diff that only adds a test file can take five minutes. A 12 line change to an auth check deserves twenty. A rough rule that works for me: if you cannot explain each changed file in one sentence, you have not reviewed it yet.",
      },
      { kind: "h2", text: "The checklist" },
      {
        kind: "ol",
        items: [
          "Clean tree and one branch or worktree per task before the run.",
          "Acceptance test written into the prompt.",
          "Every approval read as the real command.",
          "`git diff --stat` and `git status` match the task's scope.",
          "Config, lockfiles and CI read first.",
          "Test changes read before code changes, each one explained.",
          "Logic read file by file for swallowed errors, duplicates and hidden defaults.",
          "Each claim in the agent's summary checked against the diff.",
          "Side effects outside git checked in the tool calls.",
          "Tests, types, lint and build run from a fresh shell.",
          "Staged with `git add -p`, then `git diff --cached` read once more.",
        ],
      },
      { kind: "h2", text: "Where a GUI helps, and where it does not" },
      {
        kind: "p",
        text: "A terminal and git are enough for every step above. A GUI helps with the parts that are hard to hold in your head: which thread made which edit, what the exact command was three hours ago, and which of five parallel agents is waiting on you. Helicon shows inline diffs at the turn that produced them, approvals with the real command, and a file viewer beside the thread. It does not commit for you, and it should not. The commit is your signature on the review.",
      },
      {
        kind: "p",
        text: "Helicon is free, MIT licensed and unofficial. It is not affiliated with Meta, and it runs on your existing Muse Code login with no account and no second bill.",
      },
    ],
    howTo: {
      name: "Review a coding agent's diff before you merge",
      steps: [
        { name: "Isolate the run", text: "Start from a clean tree on its own branch or worktree.", code: "git worktree add ../app-login-fix -b agent/login-fix" },
        { name: "Check scope", text: "Compare the changed files with the task.", code: "git diff --stat" },
        { name: "Read risky files first", text: "Config, lockfiles, CI, then tests, then logic." },
        { name: "Check the transcript against the diff", text: "Verify each claim in the agent's summary, and scan tool calls for side effects outside git." },
        { name: "Run checks yourself", text: "Tests, types, lint and build from a fresh shell." },
        { name: "Stage hunk by hunk", text: "Look at every hunk before it goes in.", code: "git add -p" },
      ],
    },
    faqs: [
      {
        q: "Does Muse Code ask before it edits a file?",
        a: "Not for files inside the workspace. Meta's permissions docs say in-workspace write_file and edit_file writes pass in any approval mode. Approvals cover shell commands and new network connections.",
      },
      {
        q: "Does /rewind undo the agent's changes?",
        a: "No. Rewind changes the conversation only. Use git restore or drop the branch or worktree to undo file changes.",
      },
      {
        q: "Should I let the agent commit?",
        a: "You can, but review before it does. Muse Code's sandbox keeps .git read-only for shell commands, and Helicon never commits for you.",
      },
      {
        q: "How do I review several agents' work at once?",
        a: "Give each agent its own git worktree and review each one as a separate branch. Helicon lists each worktree as its own project, so the diffs never mix.",
      },
    ],
    related: ["guides/review-agent-changes", "features/inline-diffs", "features/approvals", "guides/run-parallel-agents", "guides/muse-code-yolo-mode", "guides/choose-a-coding-agent-gui"],
    source: { title: "Permissions and safety (Meta developer docs)", url: MUSE_PERMISSIONS },
  },
  {
    slug: "guides/choose-a-coding-agent-gui",
    section: "guides",
    icon: "appWindow",
    label: "Choose a coding agent GUI",
    title: "Best GUI for Claude Code or Muse Code: a checklist",
    h1: "How to choose a GUI for Claude Code or Muse Code",
    description:
      "Twelve checks for picking a GUI for a terminal coding agent: billing, open source, credentials, approvals, diffs, sessions, Windows, remote use, exit cost.",
    answer:
      "Pick the GUI that drives your agent's official CLI on the subscription you already pay for, shows approvals and diffs exactly as they happened, finds sessions you started in the terminal, keeps state on your machine, and runs on your OS. For Claude Code, Anthropic ships its own desktop app. For Muse Code, Meta ships none, so the options are community clients.",
    keywords: [
      "best gui for claude code",
      "claude code gui",
      "claude code gui alternative",
      "muse code gui",
      "coding agent gui",
      "claude code gui vs terminal",
    ],
    updated: UPDATED,
    ogEyebrow: "Long read",
    blocks: [
      {
        kind: "p",
        text: "Terminal coding agents got good enough that people now run three or four at once. The terminal did not get better at showing three or four at once. That gap is why GUIs for Claude Code and Muse Code keep appearing, and why searching for one returns a mix of official apps, editor extensions, wrappers and weekend projects.",
      },
      {
        kind: "p",
        text: "This guide is the checklist I would use to choose one. I build Helicon, a free, open-source desktop app for Muse Code, so read the Helicon parts as the maker's view. The checklist itself applies to any agent and any client.",
      },
      { kind: "h2", text: "First: what is on offer for each agent" },
      {
        kind: "p",
        text: `For Claude Code, Anthropic ships the interfaces itself. Its [overview page](${CLAUDE_CODE_OVERVIEW}), checked 22 October 2026, lists the terminal CLI, a VS Code extension (which also installs in Cursor), a JetBrains plugin, a desktop app for macOS and Windows with Linux in beta on Ubuntu and Debian, and a web version. The page says most surfaces need a Claude subscription or an Anthropic Console account, and the desktop app needs a paid subscription.`,
      },
      {
        kind: "p",
        text: `For Muse Code, Meta ships the \`muse\` CLI and an SDK for its session protocol, per its [Muse Code docs](${MUSE_CODE_DOCS_URL}). It does not ship a desktop app or an editor extension of its own. Graphical options come from the community: Helicon, VS Code extensions, Agent Client Protocol bridges for editors such as Zed and JetBrains IDEs, and other open-source wrappers. The [Muse Code GUI](/muse-code-gui) page lists them.`,
      },
      {
        kind: "table",
        caption: "Checked against Anthropic's and Meta's docs on 22 October 2026.",
        head: ["", "Claude Code", "Muse Code"],
        rows: [
          ["Official CLI", "Yes, `claude`", "Yes, `muse`"],
          ["Official desktop app", "Yes, macOS and Windows; Linux beta", "No"],
          ["Official editor extension", "VS Code and JetBrains", "No"],
          ["Official web version", "Yes", "No"],
          ["Community GUIs", "Many", "Helicon, Paseo, VS Code extensions, ACP bridges, others"],
        ],
      },
      {
        kind: "p",
        text: "So the question differs by agent. A Claude Code user is mostly choosing between Anthropic's own surfaces, and a third party GUI has to beat a first party one. A Muse Code user is choosing between community clients, and the checks below matter more, because none of them comes from the vendor.",
      },
      { kind: "h2", text: "The 12 checks" },
      { kind: "h3", text: "1. Does it drive the official CLI, or replace it?" },
      {
        kind: "p",
        text: "A good client starts the vendor's own agent and talks to it through a supported interface. Muse Code has one: `muse serve` speaks the Muse Code Session Protocol, and Meta publishes an MIT licensed SDK for it. A client built on that gets new CLI features without rewriting itself. A client that reimplements the agent loop, or scrapes the terminal output, breaks when the CLI changes and may behave differently from the agent you tested.",
      },
      { kind: "h3", text: "2. Does it use the subscription you already pay for?" },
      {
        kind: "p",
        text: "Some clients route your work through their own API key or their own metering, which turns a flat subscription into a second, per token bill. Check whether the client signs in with the CLI's own login. Helicon reuses `muse login` and has no API key, no account and no paid tier.",
      },
      { kind: "h3", text: "3. Can you read the source?" },
      {
        kind: "p",
        text: "A coding agent client holds your repository, your shell and your sign-in. If it is closed source, you are trusting a stranger with all three. For an official app the vendor is accountable. For a community app, an open repository under a known licence is the minimum. Helicon is MIT licensed with the desktop app, web app and daemon in one public repository.",
      },
      { kind: "h3", text: "4. Where do credentials live?" },
      {
        kind: "p",
        text: "The safest answer is that the client stores none. The CLI keeps its own login and the client asks the CLI to act. Avoid any community client that asks you to paste a token into its settings, unless you can read exactly where it goes.",
      },
      { kind: "h3", text: "5. Do approvals show the real command?" },
      {
        kind: "p",
        text: "An approval prompt that says \"the agent wants to run a command\" is useless. You need the exact command, the working directory, and for a network request the host. The client should map the agent's approvals one to one and never approve on your behalf. Muse Code holds dangerous shell stages and first connections to new hosts for review, and its default Auto-review profile lets an automated judge decide eligible requests first. A GUI that hides the details of what does reach you removes the one check you have.",
      },
      { kind: "h3", text: "6. Are diffs shown where they happened?" },
      {
        kind: "p",
        text: "A single combined diff at the end tells you what changed. A diff at each turn tells you why, because you can read the request and the reasoning that came before it. Check that the client shows file edits inline in the thread and lets you open the touched file beside it. Our [guide to reviewing agent diffs](/guides/review-ai-agent-diffs) covers what to do with them.",
      },
      { kind: "h3", text: "7. Does it find sessions you started in the terminal?" },
      {
        kind: "p",
        text: "You will not move every task into a GUI. Some will start in a terminal tab, over SSH or from a script. A client that only knows its own sessions gives you two half lists. Check whether it reads the CLI's session logs and lets you resume any of them. Helicon discovers sessions started in the muse terminal and resumes them in one click.",
      },
      { kind: "h3", text: "8. Can you see many agents at once?" },
      {
        kind: "p",
        text: "This is the main reason to leave the terminal. Look for a sidebar that groups sessions by project and marks which threads are running and which are blocked waiting on you. Bonus if it understands git worktrees, so parallel agents on one repository stay apart.",
      },
      { kind: "h3", text: "9. Does it show your plan usage?" },
      {
        kind: "p",
        text: "A long unattended run that hits the plan limit halfway through wastes the evening. Check whether the client shows the usage window the CLI reports, before you start. For Muse Code that is the 5 hour window. Be wary of any cost figure dressed up as a bill: Helicon's per thread cost is what the thread would have cost at published per token rates, and it says so.",
      },
      { kind: "h3", text: "10. Does it run natively on your OS?" },
      {
        kind: "p",
        text: "Windows is where most clients cut corners. Muse Code runs natively on Windows and inside WSL2, and a client should handle both, including path translation between them. Check for a real installer with auto update rather than a build-it-yourself note. Helicon ships a Windows installer, a universal macOS DMG and a Linux AppImage. The Windows installer is not Authenticode signed yet, so SmartScreen may warn on first run.",
      },
      { kind: "h3", text: "11. Can it reach a remote machine?" },
      {
        kind: "p",
        text: "If your code lives on a dev box or a cloud VM, the agent should run there and only the window should be local. Look for a daemon you can run on the remote machine with the same interface in a browser. Helicon's web app is the same React UI pointed at a daemon you run.",
      },
      { kind: "h3", text: "12. What does leaving cost?" },
      {
        kind: "p",
        text: "A client that keeps your history in its own cloud makes leaving expensive. A client that reads the CLI's own session logs and keeps its state in a local file costs nothing to drop: uninstall it and every session is still there in the terminal. Helicon keeps its state in local SQLite and makes one network call of its own, an update check.",
      },
      { kind: "h2", text: "Red flags" },
      {
        kind: "ul",
        items: [
          "It asks for an API key when the CLI already has a login.",
          "It calls itself official without the vendor's name on the download page.",
          "It has an auto approve toggle on by default.",
          "The installer comes from a link with no source repository behind it.",
          "It shows a monthly cost total with no word on how it is calculated.",
        ],
      },
      {
        kind: "p",
        text: "On the second point, Helicon is not official. It is a community project, and it is not affiliated with Meta.",
      },
      { kind: "h2", text: "GUI or terminal?" },
      {
        kind: "p",
        text: "The terminal stays the better tool in plenty of cases: one task in one repo, scripted runs in CI, or a machine where you cannot install anything. A GUI earns its place when you run more threads than you can hold in your head, review long unattended runs, or work on Windows. If you are unsure, start in the terminal and switch when you notice yourself hunting through tabs. The longer comparison is in [Helicon vs the muse terminal](/compare/muse-code-terminal).",
      },
      { kind: "h2", text: "A 10 minute test before you commit to one" },
      {
        kind: "ol",
        items: [
          "Install it and check that it signs in with your existing CLI login, without a new account or key.",
          "Start a session in the terminal first, then open the GUI. Check that the session appears and resumes.",
          "Ask the agent to run a harmless shell command that needs approval. Check that the prompt shows the exact command.",
          "Ask for a two file edit. Check that you can read each diff at the turn that made it.",
          "Look for the usage meter and read how it describes cost.",
          "Quit the GUI and confirm the session still resumes from the terminal.",
        ],
      },
      { kind: "h2", text: "Where Helicon fits" },
      {
        kind: "p",
        text: "Helicon is for Muse Code only. It cannot run Claude Code, and if Claude Code is your agent, Anthropic's own desktop app is the natural first choice. If you pay for Muse Code and want it out of the terminal, Helicon is a free, MIT licensed desktop app for Windows, macOS and Linux, plus a VS Code extension, built to pass the checks above. The side by side with Anthropic's app is in [Helicon vs Claude Code desktop](/compare/claude-code-desktop), and the other Muse Code clients are compared in [Muse Code GUI comparison](/compare/other-muse-code-guis).",
      },
    ],
    itemList: {
      name: "Checks for choosing a coding agent GUI",
      items: [
        "Drives the official CLI",
        "Uses your existing subscription",
        "Open source",
        "Stores no credentials",
        "Approvals show the real command",
        "Diffs inline at each turn",
        "Finds terminal sessions",
        "Many agents at once",
        "Shows plan usage",
        "Native on your OS",
        "Reaches a remote machine",
        "Cheap to leave",
      ],
    },
    faqs: [
      {
        q: "What is the best GUI for Claude Code?",
        a: "Start with Anthropic's own surfaces: the desktop app, the VS Code extension or the JetBrains plugin. A third party client has to beat them on the checks in this guide to be worth it.",
      },
      {
        q: "Does Muse Code have an official GUI?",
        a: "No. Meta ships the muse CLI and a session protocol SDK. Desktop apps, editor extensions and ACP bridges for Muse Code come from the community.",
      },
      {
        q: "Can Helicon run Claude Code?",
        a: "No. Helicon drives the muse CLI and nothing else.",
      },
      {
        q: "Is a GUI slower than the terminal?",
        a: "A client that drives the official CLI runs the same agent, so the agent's speed is the same. The GUI adds a window on top.",
      },
    ],
    related: ["muse-code-gui", "compare/claude-code-desktop", "compare/other-muse-code-guis", "compare/muse-code-terminal", "guides/review-ai-agent-diffs", "compare/vs-code-extension"],
    source: { title: "Claude Code overview (Anthropic docs)", url: CLAUDE_CODE_OVERVIEW },
  },
];
