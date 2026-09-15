/**
 * The public origin, used for canonical URLs, sitemaps, Open Graph and the llms.txt files.
 * Set NEXT_PUBLIC_SITE_URL once the domain is live; Vercel's production URL is the fallback.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
).replace(/\/$/, "");

export const SITE_NAME = "Helicon";
export const TITLE = "Helicon: Muse Code, without living in the terminal";
export const TAGLINE = "Same Muse Code. Same subscription. Better interface.";
export const DESCRIPTION =
  "Helicon is a free, open-source desktop and web app for the Muse Code CLI. Every project, session and diff in one window, with approvals, inline diffs and cost at API rates, on your existing Muse subscription.";
export const AUTHOR = { name: "Harjot Singh Rana", url: "https://harjotrana.com" };

export const REPO_URL = "https://github.com/HarjjotSinghh/helicon";
export const RELEASES_URL = `${REPO_URL}/releases/latest`;
export const ISSUES_URL = `${REPO_URL}/issues`;

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
    ? `Run Helicon-${version}-setup.exe from the latest release.`
    : "Run the Windows installer from the latest GitHub release.";
  const dmg = version
    ? `Open Helicon-${version}-universal.dmg from the latest release.`
    : "Open the macOS DMG from the latest GitHub release.";
  const linux = version ? `Linux is source-only at v${version}.` : "Linux is source-only; there is no packaged build yet.";
  return [
    {
      id: "windows",
      label: "Windows",
      summary:
        "Signed installer with auto-update. Muse runs inside WSL2 Ubuntu; a sidecar routes calls through it and translates paths.",
      steps: [
        { text: "Install the muse CLI inside WSL2 Ubuntu." },
        { text: "Sign in from the WSL2 shell.", command: "muse login" },
        { text: win },
      ],
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
      summary: "Run from source for now. There is no packaged build yet.",
      steps: [
        { text: "Clone the repository.", command: `git clone ${REPO_URL}` },
        { text: "Install dependencies.", command: "cd helicon && npm install" },
        { text: "Start the app.", command: "npm run dev" },
      ],
      note: linux,
    },
  ];
}

export const FAQS: [string, string][] = [
  ["Is this official?", "No. Helicon is an unofficial community project, MIT licensed. It is not made, sponsored or endorsed by Meta."],
  ["Do I need a separate API key?", "No. Helicon uses your existing Muse subscription through the muse CLI. There is no second bill."],
  ["Where do my credentials live?", "With the muse CLI, from your own muse login. Helicon never stores or handles them."],
  ["Does it see sessions I started in the terminal?", "Yes. Sessions started in the terminal TUI show up in the sidebar with full history, and you can resume them."],
  ["Why does macOS warn me on first launch?", "The macOS builds are not Apple-notarized yet. Right-click the app and choose Open the first time."],
  ["Can I run it against a remote machine?", "Yes. The same UI ships as a web app that can point at a daemon running elsewhere."],
  ["How does it work on Windows?", "Muse has no native Windows build, so it runs inside WSL2 Ubuntu. Helicon ships a signed installer with a sidecar that routes through WSL2 and translates paths both ways."],
  ["What does the cost view actually show?", "What each thread would have cost at Meta's published per-token rates. It is not a bill, just the meter reading, so you can see what your subscription did."],
  ["Can I drive it without a mouse?", "Yes. Command palette, slash commands, and a model and reasoning-effort picker cover everything, with full keyboard operation throughout."],
  ["What do I need installed?", "Node 22+ and the muse CLI, logged in with your own muse login. That is the whole list."],
  ["Is it really free?", "Yes. MIT licensed, no paid tier, source on GitHub. It uses your existing Muse subscription, so there is no second bill."],
];
