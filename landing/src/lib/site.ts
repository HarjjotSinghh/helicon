/**
 * The public origin, used for canonical URLs, sitemaps, Open Graph and the llms.txt files.
 * Set NEXT_PUBLIC_SITE_URL once the domain is live; Vercel's production URL is the fallback.
 */
const CANONICAL_ORIGIN = "https://helicon.sh";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : // A production build with no Vercel environment still has to emit real canonicals, real
      // Open Graph URLs and a real sitemap, so it falls back to the domain we own rather than to
      // localhost. Development keeps localhost so links stay clickable.
      process.env.NODE_ENV === "production"
      ? CANONICAL_ORIGIN
      : "http://localhost:3000")
).replace(/\/$/, "");

export const SITE_NAME = "Helicon";
export const TITLE = "Helicon: Muse Code desktop app for Windows and macOS";
export const TAGLINE = "Same Muse Code. Same subscription. Better interface.";
export const DESCRIPTION =
  "Free, open-source desktop and web app for Meta's Muse Code CLI. Every project, session, diff, approval and cost in one window, on the subscription you already have.";
export const AUTHOR = { name: "Harjot Singh Rana", url: "https://harjotrana.com" };

/**
 * The terms the home page is written for. Meta keywords are not a ranking signal for Google and
 * have not been for years; this list is here because several answer engines and site-search
 * indexers still read it, and because keeping the target set in one place makes it reviewable.
 * Everything here has to be true of the page it is on.
 */
export const SITE_KEYWORDS = [
  // Brand
  "Helicon",
  "Helicon app",
  "Helicon Muse Code",
  "helicon.sh",
  // Head terms
  "Muse Code GUI",
  "Muse Code desktop app",
  "Muse Code UI",
  "Muse Code app",
  "Muse Code client",
  "Muse Code interface",
  "GUI for Muse Code",
  "desktop app for Muse Code",
  "muse CLI GUI",
  "muse CLI desktop app",
  // Platform
  "Muse Code for Windows",
  "Muse Code Windows app",
  "Muse Code Windows GUI",
  "Muse Code Windows 11",
  "Muse Code WSL2",
  "Muse Code macOS app",
  "Muse Code Mac",
  "Muse Code Linux",
  "Muse Code web UI",
  // Capability
  "Muse Code session history",
  "resume Muse Code session",
  "Muse Code approvals",
  "Muse Code inline diffs",
  "Muse Code cost tracking",
  "Muse Code usage limits",
  "Muse Code remote daemon",
  "Muse Code subagents",
  // Category
  "AI coding agent GUI",
  "coding agent desktop app",
  "agentic development environment",
  "ADE",
  "open source coding agent client",
  // Technology
  "Muse Code Session Protocol",
  "MSP client",
  "muse serve",
  "Tauri 2 app",
  "MIT licensed",
];

export const REPO_URL = "https://github.com/HarjjotSinghh/helicon";
export const RELEASES_URL = `${REPO_URL}/releases/latest`;
export const ISSUES_URL = `${REPO_URL}/issues`;

/**
 * How to reach the people behind Helicon, and where they are. Published in the Organization
 * JSON-LD, on /contact and in facts.json, because an answer engine that cannot verify who
 * publishes a thing will not recommend it. Helicon is one maintainer rather than a company, so
 * the address is the publisher's city, not an office you can visit.
 */
export const CONTACT = {
  email: "me@harjotrana.com",
  /** Anything reproducible belongs here rather than in email: it is public, and it gets fixed. */
  issues: ISSUES_URL,
  security: `${REPO_URL}/security/advisories/new`,
  address: {
    locality: "New Delhi",
    region: "Delhi",
    country: "IN",
    countryName: "India",
  },
} as const;

/** The AlternativeTo listing. The utm parameters are the ones their badge snippet ships with. */
export const ALTERNATIVETO_URL =
  "https://alternativeto.net/software/helicon/about/?utm_source=badge&utm_medium=referral";

export type OsId = "windows" | "macos" | "linux";

export type InstallStep = {
  text: string;
  /** A literal command the reader can copy. */
  command?: string;
};

export type OsInfo = {
  id: OsId;
  label: string;
  summary: string;
  steps: InstallStep[];
  note?: string;
};

export function osesFor(version: string | null): OsInfo[] {
  const win = version
    ? `Run Helicon_${version}_x64-setup.exe from the latest release.`
    : "Run the Windows installer from the latest GitHub release.";
  const dmg = version
    ? `Open Helicon_${version}_universal.dmg from the latest release.`
    : "Open the macOS DMG from the latest GitHub release.";
  const appImage = version
    ? `Download Helicon_${version}_amd64.AppImage from the latest release.`
    : "Download the x86_64 AppImage from the latest GitHub release.";
  return [
    {
      id: "windows",
      label: "Windows",
      summary:
        "Signed installer with auto-update. Muse Code runs natively on Windows; WSL2 still works, with path translation both ways.",
      steps: [
        { text: "Install Muse Code for Windows in PowerShell.", command: "irm https://dev.meta.ai/install.ps1 | iex" },
        { text: "Sign in once.", command: "muse login" },
        { text: win },
      ],
      note: "Already running Muse inside WSL2? Helicon uses that when native Muse is not installed. Set HELICON_MUSE_RUNTIME=wsl to keep WSL when both are.",
    },
    {
      id: "macos",
      label: "macOS",
      summary: "One universal DMG for Apple Silicon and Intel, with auto-update.",
      steps: [
        { text: "Sign in with the muse CLI.", command: "muse login" },
        { text: dmg },
        { text: "Drag Helicon into Applications." },
      ],
      note: "Builds are not Apple-notarized yet. On first launch, right-click the app and choose Open.",
    },
    {
      id: "linux",
      label: "Linux",
      summary: "An x86_64 AppImage that runs on most distributions, with auto-update.",
      steps: [
        { text: "Sign in with the muse CLI.", command: "muse login" },
        { text: appImage },
        { text: "Make it executable, then run it.", command: "chmod +x Helicon_*.AppImage && ./Helicon_*.AppImage" },
      ],
      note: "Some distributions need FUSE (libfuse2). There is no ARM build yet; running from source instead needs Node 22 or newer.",
    },
  ];
}

export const FAQS: [string, string][] = [
  ["Is this official?", "No. Helicon is an unofficial community project, MIT licensed. It is not made, sponsored or endorsed by Meta. It is a client for the Muse Code CLI, and has nothing to do with the Muse assistant app for Mac. \"Muse\" and \"Muse Code\" are trademarks of Meta, used here only to say what Helicon works with."],
  ["Do I need a separate API key?", "No. Helicon uses your existing Muse Code subscription through the muse CLI. There is no second bill."],
  ["Where do my credentials live?", "With the muse CLI, from your own muse login. Helicon never stores or handles them."],
  ["Does it see sessions I started in the terminal?", "Yes. Sessions started in the terminal TUI show up in the sidebar with full history, and you can resume them."],
  ["Why does macOS warn me on first launch?", "The macOS builds are not Apple-notarized yet. Right-click the app and choose Open the first time."],
  ["Can I run it against a remote machine?", "Yes. The same UI ships as a web app that can point at a daemon running elsewhere."],
  ["How does it work on Windows?", "Muse Code runs natively on Windows now, and Helicon runs it directly: your own Windows paths, PowerShell for shell commands, no WSL. Muse Code inside WSL2 still works, and Helicon uses it when native Muse Code is not installed."],
  ["What does the cost view actually show?", "What each thread would have cost at Meta's published per-token rates. It is not a bill, just the meter reading, so you can see what your subscription did."],
  ["Can I drive it without a mouse?", "Yes. Command palette, slash commands, and a model and reasoning-effort picker cover everything, with full keyboard operation throughout."],
  ["What do I need installed?", "Just the muse CLI, logged in with your own muse login. The desktop app ships its own Node.js. Running from source or hosting the web app needs Node 22+ yourself."],
  ["Does Helicon phone home?", "Only to check for updates. The desktop app asks helicon.sh whether a newer version exists, and that request tells us an install is alive: the platform, the version, and a weekly hash of the IP it came from. Nothing about your code, prompts, threads or files ever leaves your machine, and there is no account."],
  ["Is it really free?", "Yes. MIT licensed, no paid tier, source on GitHub. It uses your existing Muse Code subscription, so there is no second bill."],
];
