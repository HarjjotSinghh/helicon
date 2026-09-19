import type { SeoPage } from "../types";

/**
 * Privacy and terms. Short, because there is very little to describe: the desktop app has no
 * account and no telemetry, and the website's analytics are the only place any data is collected
 * at all. Everything here is checked against the code rather than copied from a template, so it
 * has to be updated when `instrumentation-client.ts`, `lib/analytics.ts` or the update check change.
 */

const UPDATED = "2026-09-19";

export const LEGAL_PAGES: SeoPage[] = [
  {
    slug: "legal",
    icon: "gavel",
    section: "page",
    label: "Legal",
    title: "Legal: licence, privacy, terms and trademarks",
    h1: "Legal",
    description:
      "Everything in one place: the MIT licence, what Helicon collects, the terms, the security policy, and the trademark position on Muse and Muse Code.",
    answer:
      "Helicon is MIT licensed, free, and an unofficial community project that is not made, sponsored or endorsed by Meta. It has no account and no telemetry, and it never stores credentials. Muse and Muse Code are Meta trademarks, used here only to describe what Helicon connects to.",
    keywords: [
      "helicon legal",
      "helicon license",
      "helicon privacy policy",
      "helicon terms of use",
      "is helicon affiliated with meta",
    ],
    updated: UPDATED,
    ogEyebrow: "Legal",
    blocks: [
      { kind: "h2", text: "The documents" },
      {
        kind: "table",
        head: ["Document", "What it covers"],
        rows: [
          ["[Privacy](/privacy)", "What the app sends, which is an update check, and what this website's analytics record"],
          ["[Terms](/terms)", "The MIT licence in plain words, no warranty, and who is responsible for what an agent does"],
          [
            "[MIT licence](https://github.com/HarjjotSinghh/helicon/blob/prod/LICENSE)",
            "The licence itself, in the repository. It is the document that governs",
          ],
          [
            "[Security policy](https://github.com/HarjjotSinghh/helicon/blob/prod/SECURITY.md)",
            "How to report a vulnerability. Do not open a public issue for one",
          ],
        ],
      },
      { kind: "h2", text: "The short version" },
      {
        kind: "ul",
        items: [
          "**Free and MIT licensed.** No paid tier, no account, no second bill. Any version you have stays yours.",
          "**Unofficial.** Not made, sponsored or endorsed by Meta, and unrelated to the Muse assistant app for Mac.",
          "**No credential custody.** Authentication stays with your own `muse login`, held by the CLI.",
          "**No telemetry in the app.** One update check, reporting platform, version and a weekly hash of the IP.",
          "**Nothing leaves your machine.** Not your code, prompts, threads or files.",
          "**No warranty.** The MIT licence provides the software as is. You own what you approve.",
        ],
      },
      { kind: "h2", text: "Trademarks" },
      {
        kind: "p",
        text: "Muse and Muse Code are trademarks of Meta. They appear on this site only to say what Helicon works with, which is nominative use: there is no way to describe a client for Muse Code without naming Muse Code. The project is deliberately called Helicon rather than anything containing Muse, and the binary, bundle identifier and domain follow the same rule.",
      },
      {
        kind: "p",
        text: "Other names on this site, including Cursor, Windsurf, Zed, JetBrains, Claude Code, Codex, OpenCode, Aider, Cline and Warp, belong to their respective owners and are used the same way, to compare honestly rather than to imply any relationship.",
      },
      {
        kind: "note",
        text: "These pages describe what the software does, checked against the source. They are not legal advice.",
      },
    ],
    faqs: [
      {
        q: "Is Helicon affiliated with Meta?",
        a: "No. It is an unofficial community project. Muse and Muse Code are Meta trademarks, used here only to describe what Helicon connects to.",
      },
      {
        q: "What licence is Helicon under?",
        a: "MIT. Use, modify, redistribute and sell it, commercially included, as long as the copyright notice and licence text travel with it.",
      },
      {
        q: "Where do I report a security issue?",
        a: "SECURITY.md in the repository has the process. Do not open a public issue for a vulnerability.",
      },
    ],
    related: ["privacy", "terms", "pricing", "muse-code-desktop-app"],
  },
  {
    slug: "privacy",
    icon: "shield",
    section: "page",
    label: "Privacy",
    title: "Privacy: what Helicon collects, and what it never sees",
    h1: "Privacy",
    description:
      "The Helicon desktop app has no account and no telemetry. It checks for updates and nothing else. This site uses analytics. Here is exactly what each one records.",
    answer:
      "The Helicon desktop app has no account, no sign up and no telemetry. Nothing about your code, prompts, threads or files ever leaves your machine. It makes one network request on its own behalf, an update check. This website is separate and does use analytics, described below.",
    keywords: [
      "helicon privacy",
      "muse code gui privacy",
      "does helicon collect data",
      "helicon telemetry",
      "coding agent client privacy",
    ],
    updated: UPDATED,
    ogEyebrow: "Privacy",
    blocks: [
      { kind: "h2", text: "The app and the website are different things" },
      {
        kind: "p",
        text: "Helicon is a desktop and web application you run. helicon.sh is a marketing site. They collect very different amounts, so they are described separately, and installing one does not opt you into the other.",
      },

      { kind: "h2", text: "The desktop app" },
      {
        kind: "table",
        head: ["", "What happens"],
        rows: [
          ["Account", "There is none. No sign up, no email, no profile."],
          ["Your code", "Never leaves your machine."],
          ["Your prompts and threads", "Never leave your machine. They go to Muse Code, through the muse CLI you installed."],
          ["Your files", "Read locally by the daemon, shown locally in the viewer."],
          ["Credentials", "Never stored or handled. Authentication belongs to your own `muse login`."],
          ["Local state", "SQLite on your own disk: projects, sessions, turns."],
          ["Telemetry", "None. There is no analytics SDK in the app."],
          ["Crash reports", "Not collected."],
        ],
      },
      {
        kind: "p",
        text: "The one outbound request the app makes for itself is the update check. It asks helicon.sh whether a newer version exists. That request tells us three things: the platform, the version, and a weekly rotating hash of the IP address it came from. The hash is how an install is counted as alive without keeping an address. It is not linked to anything else, because there is nothing else to link it to.",
      },
      {
        kind: "note",
        text: "Muse Code itself is Meta's product with its own terms. What you send to the agent is governed by those, not by this page. On Contributor-tier models in particular, prompts and completions may be used to improve Meta's products. That is Meta's policy and worth reading before you run one.",
      },

      { kind: "h2", text: "This website" },
      {
        kind: "p",
        text: "helicon.sh uses PostHog for product analytics. It is on, it includes session replay, and pretending otherwise would be the wrong way to open a privacy page.",
      },
      {
        kind: "table",
        head: ["Collected", "Detail"],
        rows: [
          ["Page views", "Which pages, in what order, and when you leave"],
          ["Clicks", "Autocapture, plus named events: downloads, GitHub links, demo plays, copied commands, platform tabs, FAQ toggles"],
          ["Heatmaps and dead clicks", "Where people click, including clicks that do nothing"],
          ["Session replay", "A reconstruction of the page as you used it. Every input field is masked before it is recorded."],
          ["Approximate location", "Derived from IP by PostHog, at country and city level"],
          ["Device and browser", "User agent, and the platform hints your browser sends"],
          ["Installer downloads", "Recorded server side: which installer, your platform, which button, the asset and version"],
        ],
      },
      {
        kind: "h3",
        text: "Cookies",
      },
      {
        kind: "ul",
        items: [
          "`helicon-anon`, set by this site, a random identifier with a one year lifetime, so a returning visit is not counted as a new person.",
          "PostHog's own cookie and local storage entries, for the same purpose.",
          "No advertising cookies, no third-party trackers, and nothing sold or shared with data brokers.",
        ],
      },
      {
        kind: "p",
        text: "Fonts are self-hosted and served from helicon.sh, so reading this page makes no request to Google. The AlternativeTo badge in the footer is a local file for the same reason.",
      },

      { kind: "h2", text: "Who else is involved" },
      {
        kind: "table",
        head: ["Service", "What it sees", "Why"],
        rows: [
          ["Vercel", "Standard request logs for this site", "Hosting"],
          ["PostHog (US)", "The analytics above", "Understanding what the site does and does not explain"],
          ["GitHub", "Your download, when you take a release", "Releases are hosted there, and GitHub counts them"],
          ["Meta", "Whatever you send Muse Code", "The agent is theirs. Helicon is not in that path."],
        ],
      },

      { kind: "h2", text: "What you can do about it" },
      {
        kind: "ul",
        items: [
          "Block the analytics. A content blocker stops PostHog, and the site works identically without it.",
          "Use the app offline from this site entirely. It only needs helicon.sh for the update check.",
          "Ask for deletion. There is no account, so the only identifier is a random cookie value. Send it and it will be removed.",
          "Read the source. Everything described here is in a public MIT repository, including the analytics code.",
        ],
      },

      { kind: "h2", text: "Contact and changes" },
      {
        kind: "p",
        text: "Questions or a deletion request: open an issue on GitHub, or email the address on harjotrana.com. This page is dated, and the date changes when the behaviour does. Material changes are described in the changelog rather than applied quietly.",
      },
      {
        kind: "note",
        text: "This page describes what the software actually does, verified against the source. It is not legal advice and it is not a lawyer-drafted policy.",
      },
    ],
    faqs: [
      {
        q: "Does Helicon send my code anywhere?",
        a: "No. Nothing about your code, prompts, threads or files leaves your machine through Helicon. What you send to Muse Code goes through the muse CLI to Meta, under Meta's terms.",
      },
      {
        q: "Does the desktop app have telemetry?",
        a: "No. There is no analytics SDK in the app. The only request it makes for itself is an update check, reporting platform, version and a weekly hash of the IP.",
      },
      {
        q: "Does Helicon store my Muse Code credentials?",
        a: "No. Authentication stays with the muse CLI, from your own muse login. Helicon never reads or stores it.",
      },
      {
        q: "Does this website record my session?",
        a: "Yes. PostHog session replay is enabled, with all input fields masked before recording. A content blocker stops it and the site still works.",
      },
      {
        q: "Is there an account?",
        a: "No. No sign up, no email, no profile, and no server side record of you beyond the analytics described above.",
      },
    ],
    related: ["muse-code-desktop-app", "terms", "features/approvals", "pricing"],
  },
  {
    slug: "terms",
    icon: "file",
    section: "page",
    label: "Terms",
    title: "Terms: MIT licence, no warranty, unofficial",
    h1: "Terms",
    description:
      "Helicon is MIT licensed and provided without warranty. It is an unofficial community project, not made or endorsed by Meta, and you remain responsible for what the agent does.",
    answer:
      "Helicon is free software under the MIT licence, provided as is and without warranty of any kind. It is an unofficial community project, not made, sponsored or endorsed by Meta. You remain responsible for what a coding agent does on your machine, which is why approvals are never bypassed.",
    keywords: [
      "helicon terms",
      "helicon licence",
      "muse code gui license",
      "is helicon official",
      "helicon mit license",
    ],
    updated: UPDATED,
    ogEyebrow: "Terms",
    blocks: [
      { kind: "h2", text: "The licence" },
      {
        kind: "p",
        text: "Helicon is released under the MIT licence. You may use it, copy it, change it, distribute it and sell it, commercially included, as long as the copyright notice and the licence text travel with it. The full text is in the repository and it is the document that governs; this page only summarises it.",
      },
      {
        kind: "p",
        text: "The MIT licence also says the software is provided **as is, without warranty of any kind**, and that the authors are not liable for any claim, damage or other liability arising from it. That is not boilerplate here. Helicon drives a tool that edits files and runs shell commands.",
      },

      { kind: "h2", text: "It is not official" },
      {
        kind: "ul",
        items: [
          "Helicon is a community project. It is not made, sponsored, endorsed or supported by Meta.",
          "It is a client for the Muse Code CLI, and is unrelated to the Muse assistant app for Mac.",
          "Muse and Muse Code are trademarks of Meta, used on this site only to describe what Helicon connects to.",
          "Nothing here creates any relationship with Meta, and no support commitment from anyone.",
        ],
      },

      { kind: "h2", text: "What you are responsible for" },
      {
        kind: "p",
        text: "A coding agent with file system and shell access can delete work, push commits, spend your plan and run anything you allow it to run. Helicon surfaces every approval Muse Code raises and never bypasses one, and allow all sits behind a deliberate opt in for exactly this reason. Once you approve an action, the consequences are yours.",
      },
      {
        kind: "ul",
        items: [
          "Keep backups and use version control. Isolated git worktrees are the cheapest way to contain a run.",
          "Read what an approval is actually asking before allowing it.",
          "Do not expose a daemon with shell access to the open internet.",
          "Your use of Muse Code is governed by Meta's terms, and your use of any model by that provider's.",
        ],
      },

      { kind: "h2", text: "What is not promised" },
      {
        kind: "ul",
        items: [
          "No uptime, no service level, and no support obligation. There is no paid tier to attach one to.",
          "No guarantee that a future Muse Code release keeps working with a given Helicon version.",
          "No guarantee this project continues. It is MIT licensed, so any version you have stays yours to run and fork.",
          "Cost figures in the app are a meter reading at published rates, not a bill and not a quote.",
        ],
      },

      { kind: "h2", text: "This website" },
      {
        kind: "p",
        text: "The content here is provided for information. Comparisons with other tools are written honestly and updated when they go stale, but other people's products change without telling us, so check anything decision shaping against the source. Links to other sites are not endorsements.",
      },

      { kind: "h2", text: "Changes" },
      {
        kind: "p",
        text: "This page is dated. If it changes materially, the date changes with it and the change is described in the changelog.",
      },
      {
        kind: "note",
        text: "This is a plain summary of the MIT licence and of how Helicon behaves. It is not legal advice, and it does not replace reading the licence itself.",
      },
    ],
    faqs: [
      {
        q: "Is Helicon official or endorsed by Meta?",
        a: "No. It is an unofficial community project. Muse and Muse Code are Meta trademarks, used here only to describe what Helicon connects to.",
      },
      {
        q: "Can I use Helicon commercially?",
        a: "Yes. The MIT licence permits commercial use, modification and redistribution, provided the copyright notice and licence text are included.",
      },
      {
        q: "Is there any warranty?",
        a: "No. The MIT licence provides the software as is, without warranty of any kind, and disclaims liability.",
      },
      {
        q: "Who is responsible if the agent breaks something?",
        a: "You are. Helicon surfaces every approval and never bypasses one, and allow all is an explicit opt in. Use version control and isolated worktrees.",
      },
      {
        q: "Can this project disappear?",
        a: "The project can stop. The software cannot be taken back: it is MIT licensed, so any version you have is yours to keep, run and fork.",
      },
    ],
    related: ["privacy", "pricing", "muse-code-desktop-app", "features/approvals"],
  },
];
