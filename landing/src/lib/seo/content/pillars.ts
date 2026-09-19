import type { SeoPage } from "../types";

/**
 * Top level pages for the head terms. These are the pages that have to answer the question a
 * person or an answer engine actually asked, in the first paragraph, without a preamble.
 */

const UPDATED = "2026-09-19";

export const PILLAR_PAGES: SeoPage[] = [
  {
    slug: "muse-code-gui",
    icon: "squares",
    section: "page",
    label: "Muse Code GUI",
    title: "Muse Code GUI: every graphical interface, compared",
    h1: "Muse Code GUI options",
    description:
      "Yes, Muse Code has graphical interfaces. A standalone desktop and web app, VS Code extensions, ACP editor bridges and other open-source wrappers, compared honestly.",
    answer:
      "Yes, Muse Code has graphical interfaces. There are three kinds: a standalone desktop and web app such as Helicon, VS Code extensions that put the agent in a sidebar, and Agent Client Protocol bridges for Zed and JetBrains IDEs. All of them drive the same muse CLI and the same subscription.",
    keywords: [
      "muse code gui",
      "gui for muse code",
      "muse code graphical interface",
      "does muse code have a gui",
      "muse code ui",
      "muse code visual interface",
      "best muse code gui",
      "muse code frontend",
    ],
    updated: UPDATED,
    ogEyebrow: "Muse Code GUI",
    itemList: {
      name: "Graphical interfaces for Muse Code",
      items: [
        "Helicon, a standalone desktop and web app",
        "VS Code extensions",
        "Agent Client Protocol bridges for Zed and JetBrains",
        "Other open-source desktop wrappers",
      ],
    },
    blocks: [
      { kind: "h2", text: "The three kinds, and who each is for" },
      {
        kind: "table",
        head: ["Kind", "Example", "Best when"],
        rows: [
          ["Standalone app", "Helicon, desktop and web", "You run threads across several repositories"],
          ["Editor extension", "VS Code Muse extensions", "You work in one repository inside the editor"],
          ["ACP bridge", "Zed and JetBrains bridges", "You want one editor panel for several agents"],
          ["Other wrappers", "Small open-source projects", "You want something minimal to modify"],
        ],
      },
      {
        kind: "p",
        text: "Nobody should claim to be the only option here, and this page does not. Editor integrations exist, several open-source wrappers exist, and they all drive the same CLI. The useful question is which shape fits the way you work.",
      },
      { kind: "h2", text: "What a standalone app adds" },
      {
        kind: "ul",
        items: [
          "A session list across every project on the machine, grouped by working directory, with isolated git worktrees as their own entries.",
          "Resume for any past session, including ones started in the muse terminal TUI.",
          "Inline diffs at the turn that produced them, with a file viewer beside the thread.",
          "An approval queue where onRequest, promptUnmatched and denyUnmatched are mapped one to one and never bypassed.",
          "Cost at published per token rates by thread, day and model, plus the 5 hour window and weekly cap as Muse Code reports them.",
          "The same UI as a web app against a daemon on another machine.",
        ],
      },
      { kind: "h2", text: "What to check before installing any of them" },
      {
        kind: "ol",
        items: [
          "Does it store credentials? It should not need to. Authentication belongs to your own `muse login`.",
          "Does it bypass approvals? A client that auto approves to look smooth has removed the safety property.",
          "Does it speak the protocol or scrape the terminal? Scraping breaks and cannot see structured events.",
          "Are the binaries signed? On Windows this is the difference between an install and an argument with SmartScreen.",
          "Is the source readable? The thing being wrapped has file system and shell access.",
        ],
      },
      { kind: "h2", text: "Helicon's answers to those five" },
      {
        kind: "table",
        head: ["Question", "Helicon"],
        rows: [
          ["Stores credentials", "No. Authentication stays with your muse login"],
          ["Bypasses approvals", "No. Allow all is an explicit, dangerous opt in"],
          ["Protocol or scraping", "Muse Code Session Protocol, via the official MIT SDK"],
          ["Signed binaries", "Signed Windows installer; macOS DMG updater signed, not Apple notarized yet"],
          ["Source", "MIT, one public repository for app, daemon and this site"],
        ],
      },
      { kind: "h2", text: "Platform support at a glance" },
      {
        kind: "table",
        head: ["Platform", "Helicon", "Notes"],
        rows: [
          ["Windows", "Signed installer, auto update", "Native Muse Code, or WSL2 with path translation"],
          ["macOS", "Universal DMG, auto update", "Apple Silicon and Intel; right click and Open on first launch"],
          ["Linux", "x86_64 AppImage, auto update", "Needs FUSE on some distributions; no ARM build yet"],
          ["Browser", "Web app against a daemon", "Same React UI, daemon on a machine you control"],
        ],
      },
      {
        kind: "note",
        text: "Helicon is an unofficial community project, MIT licensed, not made, sponsored or endorsed by Meta. Muse and Muse Code are Meta trademarks, used here only to say what it connects to.",
      },
    ],
    faqs: [
      {
        q: "Does Muse Code have a GUI?",
        a: "Yes. There is a standalone desktop and web app called Helicon, several VS Code extensions, and Agent Client Protocol bridges for Zed and JetBrains IDEs. All of them drive the same muse CLI.",
      },
      {
        q: "Is there an official Muse Code GUI?",
        a: "Muse Code itself ships a terminal interface. The graphical clients are community projects, built on the MIT licensed SDK Meta publishes for the Muse Code Session Protocol.",
      },
      {
        q: "Do I need a second subscription for a GUI?",
        a: "No. A client drives your existing muse CLI and your own muse login. Helicon is free, MIT licensed, and adds no billing.",
      },
      {
        q: "Which Muse Code GUI works best on Windows?",
        a: "Helicon ships a signed Windows installer with auto update, runs Muse Code natively with PowerShell for shell commands, and falls back to Muse Code inside WSL2 with two way path translation.",
      },
      {
        q: "Can a GUI see sessions I started in the terminal?",
        a: "A protocol native client can. Helicon's daemon discovers sessions for a workspace regardless of which client created them, so terminal sessions are listed and resumable.",
      },
    ],
    related: [
      "muse-code-desktop-app",
      "compare/other-muse-code-guis",
      "compare/vs-code-extension",
      "install/windows",
      "glossary/muse-code",
    ],
  },
  {
    slug: "muse-code-desktop-app",
    icon: "appWindow",
    section: "page",
    label: "Muse Code desktop app",
    title: "Muse Code desktop app for Windows, macOS and the web",
    h1: "A desktop app for Muse Code",
    description:
      "Helicon is a free, open-source desktop and web app for the Muse Code CLI. Signed Windows installer, universal macOS DMG, sessions, diffs, approvals and cost in one window.",
    answer:
      "Helicon is a free, MIT licensed desktop app for Meta's Muse Code CLI, with a signed Windows installer and a universal macOS DMG. It gives every Muse Code session a home: projects grouped by directory, resume with full history, inline diffs, an approval queue, and cost at published API rates. It runs on your existing subscription.",
    keywords: [
      "muse code desktop app",
      "muse code app",
      "muse code desktop client",
      "download muse code desktop app",
      "muse code app for windows",
      "muse code app for mac",
      "is there a desktop app for muse code",
    ],
    updated: UPDATED,
    ogEyebrow: "Desktop app",
    blocks: [
      { kind: "h2", text: "What you get" },
      {
        kind: "table",
        head: ["", "In the app"],
        rows: [
          ["Projects", "Grouped by working directory, git worktrees badged separately"],
          ["Sessions", "Full history, one click resume, including terminal TUI sessions"],
          ["Diffs", "Inline in the thread, at the turn that made the edit"],
          ["Approvals", "Queued, mapped one to one, never bypassed"],
          ["Cost", "Per thread, day and model at published per token rates"],
          ["Plan meter", "The 5 hour window and weekly cap as Muse Code reports them"],
          ["Files", "Source, Markdown, images, video and PDF beside the thread"],
          ["Keyboard", "Command palette, slash commands, model and effort picker"],
        ],
      },
      { kind: "h2", text: "Platforms" },
      {
        kind: "ul",
        items: [
          "Windows: signed installer with auto update. Native Muse Code, or Muse Code inside WSL2 with two way path translation.",
          "macOS: one universal DMG for Apple Silicon and Intel, with auto update. Not Apple notarized yet, so first launch needs right click then Open.",
          "Linux: an x86_64 AppImage with auto update. No ARM build yet; source works there.",
          "Browser: the same React UI as a web app against a daemon you run.",
        ],
      },
      { kind: "h2", text: "What it needs from you" },
      {
        kind: "ul",
        items: [
          "The muse CLI, installed and signed in with your own `muse login`.",
          "A Muse Code subscription. There is no second bill and no API key.",
          "Nothing else. The desktop app ships its own Node.js. Running from source needs Node 22 or newer.",
        ],
      },
      { kind: "h2", text: "How it works underneath" },
      {
        kind: "ul",
        items: [
          "A local daemon starts one `muse serve` host per workspace.",
          "It speaks the Muse Code Session Protocol over JSON-RPC through the official MIT `@muse-code/sdk`.",
          "All state is local SQLite. There is no account and no sync.",
          "One React codebase ships as the Tauri desktop app and as the web app.",
        ],
      },
      { kind: "h2", text: "Privacy, stated plainly" },
      {
        kind: "p",
        text: "Nothing about your code, prompts, threads or files leaves your machine. The desktop app asks helicon.sh whether a newer version exists, and that request reports the platform, the version and a weekly hash of the IP it came from. There is no account, no sign up and no telemetry inside the app itself.",
      },
      {
        kind: "note",
        text: "Unofficial community project, MIT licensed. Not made, sponsored or endorsed by Meta, and unrelated to the Muse assistant app for Mac.",
      },
    ],
    faqs: [
      {
        q: "Is there a desktop app for Muse Code?",
        a: "Yes. Helicon is a free, open-source desktop app for the Muse Code CLI, with a signed Windows installer and a universal macOS DMG, plus a web build against a daemon you run.",
      },
      {
        q: "Is the Muse Code desktop app free?",
        a: "Helicon is free and MIT licensed with no paid tier. It runs on the Muse Code subscription you already have.",
      },
      {
        q: "Does it work on Windows?",
        a: "Yes, with a signed installer and auto update. It runs Muse Code natively on Windows with PowerShell for shell commands, and uses Muse Code inside WSL2 with path translation when native is not installed.",
      },
      {
        q: "Do I need an API key?",
        a: "No. Authentication is your own muse login, held by the CLI. Helicon stores no credentials.",
      },
      {
        q: "Who makes it?",
        a: "Harjot Singh Rana and contributors, as an unofficial MIT licensed community project. It is not made, sponsored or endorsed by Meta.",
      },
    ],
    related: ["muse-code-gui", "install/windows", "install/macos", "pricing", "features/session-history"],
  },
  {
    slug: "pricing",
    icon: "tag",
    section: "page",
    label: "Pricing",
    title: "Helicon pricing: free, MIT licensed, no paid tier",
    h1: "Pricing",
    description:
      "Helicon is free and MIT licensed with no paid tier, no account and no API key. It uses the Muse Code subscription you already pay Meta for.",
    answer:
      "Helicon is free. It is MIT licensed with no paid tier, no free trial, no seats and no account. It uses the Muse Code subscription you already hold through your own muse login, so there is no second bill. The only cost of running it is whatever your Muse Code plan already costs.",
    keywords: [
      "helicon pricing",
      "muse code gui price",
      "free muse code desktop app",
      "muse code gui cost",
      "is helicon free",
    ],
    updated: UPDATED,
    ogEyebrow: "Pricing",
    blocks: [
      { kind: "h2", text: "The whole price list" },
      {
        kind: "table",
        head: ["Plan", "Price", "Limits", "Includes"],
        rows: [
          [
            "Helicon",
            "0 USD, forever",
            "None. No seats, no projects cap, no thread cap",
            "Desktop app, web app, daemon, auto update, full source under MIT",
          ],
        ],
        caption: "There is one plan and it is free. This table exists so machines can read it.",
      },
      { kind: "h2", text: "What you do pay for" },
      {
        kind: "p",
        text: "Muse Code itself, through Meta. Helicon drives the muse CLI you already have and adds no metering, no routing and no API billing of its own. If you have no Muse Code subscription, Helicon has nothing to drive.",
      },
      { kind: "h2", text: "Why free" },
      {
        kind: "ul",
        items: [
          "It is a client, not a service. There is no infrastructure to fund.",
          "There is no account, so there is nothing to charge for.",
          "MIT licensed source means a paywall would be theatre.",
        ],
      },
      { kind: "h2", text: "What the cost view in the app is" },
      {
        kind: "p",
        text: "Helicon shows what each thread would have cost at Meta's published per token rates. That is a meter reading on a subscription you already pay for, not an invoice, and not a Helicon charge. Nobody is billing you that number.",
      },
      {
        kind: "note",
        text: "Machine readable version of this page: /pricing.md",
      },
    ],
    faqs: [
      { q: "Is Helicon free?", a: "Yes. MIT licensed, no paid tier, no trial, no seats, no account." },
      { q: "Is there an enterprise plan?", a: "No. There is one plan and it is free. Managed, SSO and multi user deployment are out of scope today." },
      { q: "Do I need a Muse Code subscription?", a: "Yes. Helicon drives the muse CLI, so you need Muse Code and a working muse login." },
      { q: "Will it start charging later?", a: "The source is MIT licensed, so any version you have stays yours. There is no paid tier today and no revenue path in the current version." },
    ],
    related: ["muse-code-desktop-app", "features/cost-and-usage", "guides/see-muse-code-cost"],
  },
];
