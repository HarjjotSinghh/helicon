import { DESKTOP_OS_TEXT, MUSE_CODE_DOCS_URL, MUSE_CODE_TESTED } from "../../tested";
import { formatDate } from "../freshness";
import type { Block, SeoPage } from "../types";

/**
 * Top level pages for the head terms. These are the pages that have to answer the question a
 * person or an answer engine actually asked, in the first paragraph, without a preamble.
 */

const UPDATED = "2026-09-19";

/** The build these pages describe, and what it was tested against. Read from lib/tested.ts. */
const TESTED: Block = {
  kind: "note",
  text: `Tested with [Muse Code](${MUSE_CODE_DOCS_URL}) ${MUSE_CODE_TESTED.version} on ${DESKTOP_OS_TEXT}, ${formatDate(MUSE_CODE_TESTED.date)}.`,
};

export const PILLAR_PAGES: SeoPage[] = [
  {
    slug: "muse-code-gui",
    icon: "squares",
    section: "page",
    label: "Muse Code GUI",
    title: "Muse Code GUI: Helicon and every other option",
    h1: "Muse Code GUI: every graphical interface, compared",
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
    updated: "2026-10-18",
    ogEyebrow: "Muse Code GUI",
    answerCta: true,
    itemList: {
      name: "Graphical interfaces for Muse Code",
      items: [
        "VS Code extensions",
        "Agent Client Protocol bridges for Zed and JetBrains",
        "Standalone desktop and web apps, such as Helicon",
        "Other open-source desktop wrappers",
      ],
    },
    blocks: [
      {
        kind: "image",
        src: "/assets/thread.png",
        alt: "Helicon, a Muse Code GUI, showing a thread with an inline diff next to the session list",
        width: 1440,
        height: 900,
        caption: "Helicon, one Muse Code GUI: the session list, a live thread and its diff in one window.",
      },
      { kind: "h2", text: "Install a Muse Code GUI in three steps" },
      {
        kind: "steps",
        steps: [
          {
            name: "Install the muse CLI",
            text: "Every Muse Code GUI drives this CLI. Skip the step if `muse` already runs in your terminal. On Windows, [download Muse Code](/muse-code-download) with the PowerShell installer instead.",
            code: "curl -fsSL https://dev.meta.ai/install.sh | bash",
          },
          { name: "Sign in", text: "Authentication stays with your own account. Helicon never stores credentials.", code: "muse login" },
          {
            name: "Download Helicon",
            text: "Pick the Windows installer, the universal macOS DMG or the Linux AppImage from the [install page](/install). It is free and MIT licensed.",
          },
        ],
      },
      { kind: "h2", text: "The three kinds, and who each is for" },
      {
        kind: "table",
        head: ["Kind", "Example", "Best when"],
        rows: [
          ["Editor extension", "VS Code Muse extensions", "You work in one repository inside the editor"],
          ["ACP bridge", "Zed and JetBrains bridges", "You want one editor panel for several agents"],
          ["Standalone app", "Helicon, desktop and web", "You run threads across several repositories"],
          ["Other wrappers", "Small open-source projects", "You want something minimal to modify"],
        ],
      },
      {
        kind: "p",
        text: "Nobody should claim to be the only option here, and this page does not. Editor integrations exist, several open-source wrappers exist, and they all drive the same CLI. The useful question is which shape fits the way you work.",
      },
      { kind: "h2", text: "What does a standalone app add?" },
      {
        kind: "p",
        text: "The list below describes Helicon. The [Muse Code desktop app](/muse-code-desktop-app) page has each platform build, and you can [try Helicon in your browser](/try) on sample data without installing anything.",
      },
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
      { kind: "h2", text: "What does a Muse Code GUI cost?" },
      {
        kind: "p",
        text: "[Helicon is free](/pricing) and adds no billing: it runs on the Muse Code subscription you already have. It shows what each thread would have cost at Meta's published per token rates, by day, model and thread, as a meter reading rather than a bill. The 5 hour window and weekly cap sit in the sidebar exactly as the CLI reports them. See [cost at API rates](/features/cost-and-usage) and [usage limits](/features/plan-limits).",
      },
      { kind: "h2", text: "What to check before installing any of them" },
      {
        kind: "ol",
        items: [
          "Does it store credentials? It should not need to. Authentication belongs to your own `muse login`.",
          "Does it bypass approvals? A client that auto approves to look smooth has removed the safety property.",
          "Does it speak the protocol or scrape the terminal? Scraping breaks and cannot see structured events.",
          "Are the binaries signed? On Windows an unsigned installer means a SmartScreen warning on first run. Helicon's is not code signed yet, and says so.",
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
          ["Signed binaries", "Not yet. Windows installer is not Authenticode signed and macOS DMG is not Apple notarized; updates are signature checked by the app"],
          ["Source", "MIT, one public repository for app, daemon and this site"],
        ],
      },
      { kind: "h2", text: "Platform support at a glance" },
      {
        kind: "table",
        head: ["Platform", "Helicon", "Notes"],
        rows: [
          ["Windows", "Installer, auto update", "Native Muse Code, or WSL2 with path translation; installer not code signed yet, so SmartScreen warns once"],
          ["macOS", "Universal DMG, auto update", "Apple Silicon and Intel; Open Anyway in Privacy & Security on first launch"],
          ["Linux", "x86_64 AppImage, auto update", "Needs FUSE on some distributions; no ARM build yet"],
          ["Browser", "Web app against a daemon", "Same React UI, daemon on a machine you control"],
        ],
      },
      {
        kind: "p",
        text: "When you want the full app, [install Helicon](/install) on Windows, macOS or Linux.",
      },
      {
        kind: "note",
        text: "Helicon is an unofficial community project, MIT licensed, not made, sponsored or endorsed by Meta. Muse and Muse Code are Meta trademarks, used here only to say what it connects to.",
      },
      TESTED,
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
        a: "Helicon ships a Windows installer with auto update, runs Muse Code natively with PowerShell for shell commands, and falls back to Muse Code inside WSL2 with two way path translation.",
      },
      {
        q: "Can a GUI see sessions I started in the terminal?",
        a: "A protocol native client can. Helicon's daemon discovers sessions for a workspace regardless of which client created them, so terminal sessions are listed and resumable.",
      },
    ],
    related: [
      "muse-code-desktop-app",
      "compare/other-muse-code-guis",
      "compare/t3-code",
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
    title: "Muse Code desktop app: Windows, macOS, Linux, web",
    h1: "A desktop app for Muse Code",
    description:
      "Helicon is a free, open-source desktop app for the Muse Code CLI: Windows installer, macOS DMG, Linux AppImage. Sessions, diffs, approvals and cost in one window.",
    answer:
      "Helicon is a free, MIT licensed desktop app for Meta's Muse Code CLI, with a Windows installer, a universal macOS DMG and a Linux AppImage. It gives every Muse Code session a home: projects grouped by directory, resume with full history, inline diffs, an approval queue, and cost at published API rates. It runs on your existing subscription.",
    keywords: [
      "muse code desktop app",
      "muse code app",
      "muse code desktop client",
      "download muse code desktop app",
      "muse code app for windows",
      "muse code app for mac",
      "is there a desktop app for muse code",
    ],
    updated: "2026-10-18",
    ogEyebrow: "Desktop app",
    blocks: [
      { kind: "h2", text: "What does the desktop app do?" },
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
      { kind: "h2", text: "Which platforms does it run on?" },
      {
        kind: "p",
        text: "Every build below comes from the same release. To pick one, [install Helicon](/install) from the page that matches your machine.",
      },
      {
        kind: "ul",
        items: [
          "Windows: installer with auto update (not code-signed yet, so SmartScreen may warn). Native Muse Code, or Muse Code inside WSL2 with two way path translation.",
          "macOS: one universal DMG for Apple Silicon and Intel, with auto update. Not Apple notarized yet, so first launch needs System Settings > Privacy & Security > Open Anyway.",
          "Linux: an x86_64 AppImage with auto update. No ARM build yet; source works there.",
          "Browser: the same React UI as a web app against a daemon you run.",
        ],
      },
      { kind: "h2", text: "What do you need before installing it?" },
      {
        kind: "ul",
        items: [
          "The muse CLI, installed and signed in with your own `muse login`. [Download Muse Code](/muse-code-download) has Meta's command for each platform.",
          "A Muse Code subscription. [Helicon is free](/pricing), so there is no second bill and no API key.",
          "Nothing else. The desktop app ships its own Node.js. Running from source needs Node 22 or newer.",
        ],
      },
      { kind: "h2", text: "How does it work underneath?" },
      {
        kind: "ul",
        items: [
          "A local daemon starts one `muse serve` host per workspace.",
          "It speaks the Muse Code Session Protocol over JSON-RPC through the official MIT `@muse-code/sdk`.",
          "All state is local SQLite. There is no account and no sync.",
          "One React codebase ships as the Tauri desktop app and as the web app.",
        ],
      },
      { kind: "h2", text: "What leaves your machine?" },
      {
        kind: "p",
        text: "Nothing about your code, prompts, threads or files leaves your machine. The desktop app asks helicon.sh whether a newer version exists, and that request reports the platform, the version and a weekly hash of the IP it came from. There is no account, no sign up and no telemetry inside the app itself.",
      },
      {
        kind: "p",
        text: "Not sure a desktop app is the right shape? The [Muse Code GUI](/muse-code-gui) page compares it with editor extensions and ACP bridges, or you can [try Helicon in your browser](/try) on sample data first.",
      },
      {
        kind: "note",
        text: "Unofficial community project, MIT licensed. Not made, sponsored or endorsed by Meta, and unrelated to the Muse assistant app for Mac.",
      },
      TESTED,
    ],
    faqs: [
      {
        q: "Is there a desktop app for Muse Code?",
        a: "Yes. Helicon is a free, open-source desktop app for the Muse Code CLI, with a Windows installer, a universal macOS DMG and a Linux AppImage, plus a web build against a daemon you run.",
      },
      {
        q: "Is the Muse Code desktop app free?",
        a: "Helicon is free and MIT licensed with no paid tier. It runs on the Muse Code subscription you already have.",
      },
      {
        q: "Does it work on Windows?",
        a: "Yes, with an installer and auto update (not code-signed yet, so SmartScreen may warn: click More info, then Run anyway). It runs Muse Code natively on Windows with PowerShell for shell commands, and uses Muse Code inside WSL2 with path translation when native is not installed.",
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
    slug: "muse-code-download",
    icon: "download",
    section: "page",
    label: "Download Muse Code",
    title: "Download Muse Code: the muse CLI and a desktop app",
    h1: "Download Muse Code, then add a desktop app",
    description:
      "Muse Code ships from Meta as the muse CLI. Install it with one command on Windows, macOS or Linux, run muse login, then add Helicon, a free desktop app for it.",
    answer:
      "Muse Code is Meta's AI coding agent, and you download it as the muse command line tool. On macOS and Linux, run Meta's curl installer. On Windows, run the PowerShell installer. Sign in once with muse login. If you want a desktop window for Muse Code, Helicon is a free, open-source app that runs on that same login.",
    keywords: [
      "muse cli download",
      "muse code download",
      "download muse code",
      "muse code install",
      "install muse cli",
      "musecli",
      "muse code cli download windows",
    ],
    updated: "2026-10-18",
    ogEyebrow: "Download Muse Code",
    answerCta: true,
    blocks: [
      { kind: "h2", text: "Install the muse CLI" },
      {
        kind: "p",
        text: "Meta publishes the muse CLI with a one-line installer for each platform. Helicon does not bundle or redistribute it. The commands below are the ones in Meta's Muse Code docs.",
      },
      {
        kind: "table",
        head: ["Platform", "Command", "Shell"],
        rows: [
          ["macOS", "`curl -fsSL https://dev.meta.ai/install.sh | bash`", "Terminal"],
          ["Linux", "`curl -fsSL https://dev.meta.ai/install.sh | bash`", "Any POSIX shell"],
          ["Windows", "`irm https://dev.meta.ai/install.ps1 | iex`", "Windows PowerShell"],
        ],
        caption: "Source: Meta's Muse Code docs at dev.meta.ai/products/muse-code.",
      },
      {
        kind: "note",
        text: "On Windows, run the installer from Windows PowerShell, as Meta's docs show. Muse Code also runs inside WSL2 if that is where you work.",
      },
      { kind: "h2", text: "How do you sign in?" },
      { kind: "code", lang: "bash", code: "muse login\nmuse --version" },
      {
        kind: "p",
        text: "muse login needs a Muse Code plan or pay-as-you-go billing. The CLI keeps the credentials. Every app that drives Muse Code, Helicon included, uses that login and stores none of its own.",
      },
      { kind: "h2", text: "Is there a desktop app for Muse Code?" },
      {
        kind: "p",
        text: "The CLI runs in a terminal. Helicon is a free, MIT licensed [Muse Code desktop app](/muse-code-desktop-app) that drives the same CLI through muse serve and gives each session a window: projects grouped by directory, resume with full history, inline diffs, an approval queue, and cost at published API rates.",
      },
      {
        kind: "table",
        head: ["Platform", "Helicon download", "Notes"],
        rows: [
          ["Windows", "x64 installer (Helicon_<version>_x64-setup.exe)", "Not Authenticode signed yet: SmartScreen may warn, click More info, then Run anyway"],
          ["macOS", "Universal DMG, Apple Silicon and Intel", "Not Apple notarized yet: first launch needs Privacy & Security > Open Anyway on macOS 15 or later"],
          ["Linux", "x86_64 AppImage", "Needs FUSE (libfuse2) on some distributions"],
          ["VS Code, Cursor, Windsurf", "Editor extension", "Marketplace and Open VSX"],
        ],
        caption: "All three desktop builds update themselves. Tested with Muse Code 1.4.11 on 21 Oct 2026.",
      },
      {
        kind: "p",
        text: "[Install Helicon](/install) from the page for your machine, or [try Helicon in your browser](/try) on sample data before you download anything.",
      },
      { kind: "h2", text: "Who makes Helicon?" },
      {
        kind: "ul",
        items: [
          "Helicon is an unofficial community project. It is not made by Meta or affiliated with Meta.",
          "It runs on your Muse Code subscription. [Helicon is free](/pricing), with no API key, account or paid tier of its own.",
          "It is one [Muse Code GUI](/muse-code-gui) among several, a client for the Muse Code CLI, and it has nothing to do with the Muse assistant app for Mac.",
        ],
      },
    ],
    howTo: {
      name: "Download and set up Muse Code with a desktop app",
      steps: [
        { name: "Install the muse CLI", text: "Run Meta's installer for your platform. On Windows, use Windows PowerShell.", code: "curl -fsSL https://dev.meta.ai/install.sh | bash" },
        { name: "Sign in", text: "Authenticate once. The CLI holds the credentials.", code: "muse login" },
        { name: "Check the install", text: "Confirm the CLI is on your PATH.", code: "muse --version" },
        { name: "Download Helicon", text: "Take the build for your platform from helicon.sh/download or the latest GitHub release." },
        { name: "Add a project", text: "Point Helicon at a working directory. It lists the sessions already on disk, including ones started in the terminal." },
      ],
    },
    faqs: [
      { q: "Is there a Muse Code desktop app from Meta?", a: "Meta ships Muse Code as the muse CLI. Helicon is an unofficial, open-source desktop app that drives that CLI. Other community GUIs and editor extensions exist too." },
      { q: "Does Helicon include the muse CLI?", a: "No. Install the muse CLI from Meta first. The Helicon desktop app bundles its own Node.js, so the CLI and a signed-in muse login are the only things it needs." },
      { q: "Does Helicon cost anything?", a: "No. Helicon is free and MIT licensed. It runs on your existing Muse Code subscription, with no API key and no second bill." },
      { q: "Where does the muse CLI install on Windows?", a: "Meta's PowerShell installer puts it in %LOCALAPPDATA%\\Programs\\muse and adds that folder to your user PATH. Open a new terminal before running muse login." },
    ],
    related: ["glossary/muse-cli", "install/windows", "install/macos", "install/linux", "muse-code-desktop-app", "guides/muse-cli-not-found"],
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
    updated: "2026-10-18",
    ogEyebrow: "Pricing",
    blocks: [
      { kind: "h2", text: "How much does Helicon cost?" },
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
      { kind: "h2", text: "What do you pay for?" },
      {
        kind: "p",
        text: "Muse Code itself, through Meta. Helicon drives the muse CLI you already have and adds no metering, no routing and no API billing of its own. If you have no Muse Code subscription, Helicon has nothing to drive. The [Muse Code download](/muse-code-download) page covers getting the CLI itself.",
      },
      { kind: "h2", text: "Why is it free?" },
      {
        kind: "ul",
        items: [
          "It is a client, not a service. There is no infrastructure to fund.",
          "There is no account, so there is nothing to charge for.",
          "MIT licensed source means a paywall would be theatre.",
        ],
      },
      { kind: "h2", text: "What is the cost view in the app?" },
      {
        kind: "p",
        text: "Helicon shows what each thread would have cost at Meta's published per token rates. That is a meter reading on a subscription you already pay for, not an invoice, and not a Helicon charge. Nobody is billing you that number. The [cost and usage](/features/cost-and-usage) page shows how the meter reads.",
      },
      { kind: "h2", text: "How do you get it?" },
      {
        kind: "p",
        text: "The free [Muse Code desktop app](/muse-code-desktop-app) runs on Windows, macOS and Linux. [Install Helicon](/install) from the page for your machine, or [try Helicon in your browser](/try) on sample data first.",
      },
      TESTED,
      {
        kind: "note",
        text: "Machine readable version of this page: /pricing.md",
      },
    ],
    faqs: [
      { q: "Is Helicon free?", a: "Yes. MIT licensed, no paid tier, no trial, no seats, no account." },
      { q: "Is there an enterprise plan?", a: "No. There is one plan and it is free. Managed, SSO and multi user deployment are out of scope today." },
      { q: "Do I need a Muse Code subscription?", a: "Yes. Helicon drives the muse CLI, so you need Muse Code and a working muse login." },
      { q: "Do I need an API key?", a: "No. Helicon uses your existing Muse Code subscription through your own muse login. There is no API key and no second bill." },
      { q: "Does Helicon store my credentials?", a: "No. Your muse login stays with the muse CLI. Helicon has no account and stores no credentials." },
      { q: "Will it start charging later?", a: "The source is MIT licensed, so any version you have stays yours. There is no paid tier today and no revenue path in the current version." },
    ],
    related: ["muse-code-desktop-app", "features/cost-and-usage", "guides/see-muse-code-cost"],
  },
];
