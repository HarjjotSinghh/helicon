import type { SeoPage } from "../types";
import { REPO_URL } from "../../site";

/** Platform install pages. These carry HowTo schema and are the highest intent pages on the site. */

const UPDATED = "2026-09-19";

export const INSTALL_PAGES: SeoPage[] = [
  {
    slug: "install/windows",
    section: "install",
    label: "Windows",
    title: "Muse Code for Windows: install the desktop app",
    h1: "Install Helicon on Windows",
    description:
      "A signed Windows installer for a Muse Code desktop app, with auto update. Runs Muse Code natively on Windows, or inside WSL2 with path translation both ways.",
    answer:
      "Install the muse CLI, sign in with muse login, then run the signed Helicon installer from the latest GitHub release. Helicon drives Muse Code natively on Windows using your own Windows paths and PowerShell for shell commands, and falls back to Muse Code inside WSL2 with two way path translation when native Muse Code is not present.",
    keywords: [
      "muse code windows",
      "muse code for windows",
      "muse code windows app",
      "muse code windows installer",
      "muse code gui windows",
      "muse code windows 11",
      "install muse code on windows",
    ],
    updated: UPDATED,
    ogEyebrow: "Install on Windows",
    blocks: [
      { kind: "h2", text: "Before you start" },
      {
        kind: "ul",
        items: [
          "Windows 10 or 11 on x64.",
          "The muse CLI, either natively on Windows or inside WSL2 Ubuntu.",
          "A Muse Code subscription, signed in with your own `muse login`.",
          "Nothing else. The desktop app ships its own Node.js runtime.",
        ],
      },
      { kind: "h2", text: "Two supported setups" },
      {
        kind: "table",
        head: ["Setup", "How Helicon runs it", "Paths"],
        rows: [
          ["Native Windows Muse Code", "Runs `muse` directly, PowerShell for shell commands", "Your own Windows paths, unchanged"],
          ["Muse Code inside WSL2", "Routes through the WSL2 distribution", "Translated both ways automatically"],
        ],
        caption: "Helicon prefers native Muse Code and uses WSL2 when native is not installed.",
      },
      {
        kind: "p",
        text: "This is the part that usually costs Windows users an evening. Mixed Windows and WSL2 paths are the reason agent tooling breaks on Windows, and Helicon translates between them rather than asking you to.",
      },
      { kind: "h2", text: "About the installer" },
      {
        kind: "ul",
        items: [
          "Signed, so SmartScreen does not treat it as an unknown publisher.",
          "Auto update built in: the app checks helicon.sh for a newer version and updates itself.",
          "The file is named Helicon_<version>_x64-setup.exe on the release page.",
        ],
      },
      {
        kind: "note",
        text: "The update check is the only request Helicon makes on its own behalf. It reports the platform, the version and a weekly hash of the IP it came from. No code, prompts, threads or files leave the machine, and there is no account.",
      },
      { kind: "h2", text: "If Helicon cannot find Muse Code" },
      {
        kind: "ul",
        items: [
          "Check `muse --version` in PowerShell for a native install.",
          "Check `muse --version` inside your WSL2 shell for the WSL2 route.",
          "Run `muse login` in whichever shell holds your install. Helicon never stores credentials, so it needs the CLI to be signed in.",
        ],
      },
    ],
    howTo: {
      name: "Install Helicon, a Muse Code desktop app, on Windows",
      steps: [
        {
          name: "Install the muse CLI",
          text: "Install Muse Code natively on Windows, or inside WSL2 Ubuntu if that is your setup.",
        },
        {
          name: "Sign in",
          text: "Authenticate the CLI in the shell that holds your install. Helicon uses this login and stores no credentials of its own.",
          code: "muse login",
        },
        {
          name: "Download the installer",
          text: "Take Helicon_<version>_x64-setup.exe from the latest GitHub release.",
        },
        {
          name: "Run the installer",
          text: "The installer is signed and sets up auto update, so future versions arrive without another download.",
        },
        {
          name: "Add a project",
          text: "Point Helicon at a working directory. It starts a muse serve host for that workspace and lists any sessions already on disk, including ones started in the terminal.",
        },
      ],
    },
    faqs: [
      {
        q: "Do I need WSL2 to run Muse Code on Windows?",
        a: "No. Muse Code runs natively on Windows and Helicon drives it directly, using your Windows paths and PowerShell for shell commands. WSL2 still works, and Helicon uses it when native Muse Code is not installed.",
      },
      {
        q: "Is the Windows installer signed?",
        a: "Yes, and it ships auto update. Releases are published on GitHub.",
      },
      {
        q: "Does Helicon work on Windows on ARM?",
        a: "The published installer is x64. ARM users can run from source, which needs Node 22 or newer on the Windows host.",
      },
      {
        q: "Where do my Muse Code credentials live on Windows?",
        a: "With the muse CLI, from your own muse login, in whichever environment you installed it. Helicon never stores or handles them.",
      },
    ],
    related: ["install/wsl2", "guides/muse-code-windows-without-wsl", "compare/muse-code-terminal", "use-cases/windows-developers"],
  },
  {
    slug: "install/macos",
    section: "install",
    label: "macOS",
    title: "Muse Code desktop app for macOS: install Helicon",
    h1: "Install Helicon on macOS",
    description:
      "One universal DMG for Apple Silicon and Intel, with auto update. Install the muse CLI, sign in, drag Helicon to Applications, and open it the first time with right click.",
    answer:
      "Sign in with muse login, open the universal Helicon DMG from the latest GitHub release, and drag the app into Applications. One build covers Apple Silicon and Intel and updates itself. The builds are not Apple notarized yet, so the first launch needs a right click then Open.",
    keywords: [
      "muse code mac",
      "muse code macos app",
      "muse code desktop app mac",
      "muse code gui macos",
      "install muse code mac",
      "muse code apple silicon",
    ],
    updated: UPDATED,
    ogEyebrow: "Install on macOS",
    blocks: [
      { kind: "h2", text: "Before you start" },
      {
        kind: "ul",
        items: [
          "macOS on Apple Silicon or Intel. One universal DMG covers both.",
          "The muse CLI, signed in with your own `muse login`.",
          "Nothing else. Node.js is bundled inside the app.",
        ],
      },
      { kind: "h2", text: "The Gatekeeper warning, explained" },
      {
        kind: "p",
        text: "The DMG is updater signed but not Apple notarized yet. macOS will warn you on first launch. Right click the app and choose Open, and the warning turns into a dialog with an Open button. After that it launches normally. Notarization is a known gap rather than a decision, and it is stated here rather than buried.",
      },
      { kind: "h2", text: "What happens after install" },
      {
        kind: "ul",
        items: [
          "Helicon looks for the muse CLI and tells you plainly if it cannot find it.",
          "Add a directory and it starts a `muse serve` host for that workspace.",
          "Sessions already on disk for that directory are listed, including ones from the terminal TUI.",
          "Auto update keeps the app current without another download.",
        ],
      },
      {
        kind: "note",
        text: "Helicon is unrelated to the Muse assistant app for Mac. It is a client for the Muse Code CLI.",
      },
    ],
    howTo: {
      name: "Install Helicon, a Muse Code desktop app, on macOS",
      steps: [
        {
          name: "Sign in with the muse CLI",
          text: "Helicon uses this login. It stores no credentials of its own.",
          code: "muse login",
        },
        {
          name: "Open the DMG",
          text: "Take Helicon_<version>_universal.dmg from the latest GitHub release. One build runs on Apple Silicon and Intel.",
        },
        { name: "Drag Helicon into Applications", text: "The standard macOS install step." },
        {
          name: "Open it the first time",
          text: "Right click the app and choose Open, because the builds are not Apple notarized yet. Later launches are normal.",
        },
        {
          name: "Add a project",
          text: "Point Helicon at a working directory to start a muse serve host and list its sessions.",
        },
      ],
    },
    faqs: [
      {
        q: "Why does macOS warn me on first launch?",
        a: "The builds are updater signed but not Apple notarized yet. Right click the app and choose Open the first time.",
      },
      {
        q: "Is there a separate Apple Silicon build?",
        a: "No, one universal DMG covers Apple Silicon and Intel.",
      },
      {
        q: "Is this the Muse app for Mac?",
        a: "No. Helicon is a client for the Muse Code CLI and has nothing to do with the Muse assistant app for Mac.",
      },
      {
        q: "Can I install with Homebrew?",
        a: "The published artifacts are the DMG and the Windows installer on GitHub Releases. Running from source also works and needs Node 22 or newer.",
      },
    ],
    related: ["install/linux", "compare/claude-code-desktop", "features/session-history", "use-cases/macos-power-users"],
  },
  {
    slug: "install/linux",
    section: "install",
    label: "Linux",
    title: "Muse Code GUI on Linux: run Helicon from source",
    h1: "Run Helicon on Linux",
    description:
      "Linux is source only for now. Clone the repository, install dependencies with Node 22 or newer, and run the app against your local muse CLI.",
    answer:
      "Linux has no packaged Helicon build yet, so it runs from source. Clone the repository, install dependencies with Node 22 or newer, and start it against your local muse CLI. The web build is often the better Linux answer: run the daemon on the Linux box and open the UI in a browser.",
    keywords: [
      "muse code linux",
      "muse code gui linux",
      "muse code ubuntu",
      "run muse code from source",
      "muse code appimage",
    ],
    updated: UPDATED,
    ogEyebrow: "Install on Linux",
    blocks: [
      { kind: "h2", text: "State of Linux support" },
      {
        kind: "p",
        text: "There is no packaged Linux build today. That is a gap rather than a policy. Running from source works, and because the same React UI ships as a web app, a Linux machine is a good place to put the daemon even when you look at it from somewhere else.",
      },
      { kind: "h2", text: "Requirements" },
      {
        kind: "ul",
        items: [
          "Node 22 or newer on the machine, since you are not getting the bundled runtime that comes with the desktop app.",
          "The muse CLI, signed in with your own `muse login`.",
          "Standard Tauri build dependencies if you want the desktop shell rather than the web build.",
        ],
      },
      { kind: "h2", text: "The remote daemon route" },
      {
        kind: "p",
        text: "If the Linux box is a server rather than your desktop, run the daemon there and open the web UI from your laptop. You get the same sidebar, diffs, approvals and cost view, and the agent runs next to the code.",
      },
    ],
    howTo: {
      name: "Run Helicon on Linux from source",
      steps: [
        { name: "Clone the repository", text: "Get the source from GitHub.", code: `git clone ${REPO_URL}` },
        { name: "Install dependencies", text: "Node 22 or newer is required.", code: "cd helicon && npm install" },
        { name: "Start the app", text: "This runs the daemon and the UI.", code: "npm run dev" },
        {
          name: "Sign in with the muse CLI",
          text: "Helicon uses your own login and stores no credentials.",
          code: "muse login",
        },
      ],
    },
    faqs: [
      {
        q: "Is there an AppImage or a deb?",
        a: "Not yet. Linux is source only today. The web build against a local daemon is the lightest way to use it in the meantime.",
      },
      {
        q: "What Node version do I need?",
        a: "Node 22 or newer. The desktop app bundles its own Node, but running from source does not.",
      },
      {
        q: "Can the daemon run headless on a server?",
        a: "Yes. That is what the web build is for: daemon on the server, UI in a browser.",
      },
    ],
    related: ["features/remote-daemon", "guides/remote-daemon-setup", "install/windows"],
  },
  {
    slug: "install/wsl2",
    section: "install",
    label: "WSL2",
    title: "Muse Code in WSL2 with a Windows GUI",
    h1: "Muse Code inside WSL2, driven from Windows",
    description:
      "If your muse CLI lives in WSL2 Ubuntu, Helicon routes to it from the Windows desktop app and translates paths both ways, so the agent and the UI agree on where files are.",
    answer:
      "When Muse Code is installed inside WSL2 rather than natively on Windows, Helicon routes to the WSL2 distribution and translates paths in both directions. The agent sees Linux paths, the Windows UI shows Windows paths, and you stop hand converting between /mnt/c and C:\\ every time something breaks.",
    keywords: [
      "muse code wsl2",
      "muse code wsl",
      "muse code windows subsystem for linux",
      "wsl2 path translation coding agent",
      "muse cli wsl ubuntu",
    ],
    updated: UPDATED,
    ogEyebrow: "WSL2 setup",
    blocks: [
      { kind: "h2", text: "When you need this page" },
      {
        kind: "p",
        text: "Muse Code runs natively on Windows now, and if you have that, Helicon uses it and this page is optional. WSL2 still matters for people whose toolchain, dotfiles or project already live inside a distribution, and for anyone who set Muse Code up before native Windows support existed.",
      },
      { kind: "h2", text: "What breaks without translation" },
      {
        kind: "ul",
        items: [
          "The agent reports /home/you/project and the GUI cannot open it.",
          "You open C:\\Users\\you\\project in the GUI and the agent cannot find it.",
          "Diffs point at paths that exist on one side of the boundary only.",
        ],
      },
      { kind: "h2", text: "What Helicon does" },
      {
        kind: "ul",
        items: [
          "Detects the WSL2 distribution holding your muse install.",
          "Starts the `muse serve` host inside it.",
          "Translates paths both ways so the file viewer, the diffs and the agent agree.",
          "Prefers native Windows Muse Code when it is installed, and says which route it took.",
        ],
      },
      { kind: "h2", text: "Checklist" },
      {
        kind: "ol",
        items: [
          "Open your WSL2 shell and confirm `muse --version` answers.",
          "Run `muse login` in that same shell.",
          "Install Helicon on Windows with the signed installer.",
          "Add your project. If the project lives inside the distribution, add its WSL2 path.",
        ],
      },
      {
        kind: "note",
        text: "Running the daemon from source on Windows needs Node 22 or newer on the Windows host, not inside WSL2. The packaged desktop app brings its own.",
      },
    ],
    faqs: [
      {
        q: "Do I still need WSL2?",
        a: "Not for Muse Code itself, which runs natively on Windows. Keep WSL2 if your project or toolchain lives there. Helicon supports both and prefers native when it finds it.",
      },
      {
        q: "Which paths should I add as projects?",
        a: "Add the path as the side you work on. Helicon translates, so either works, and the diffs and file viewer follow.",
      },
      {
        q: "Does it work with distributions other than Ubuntu?",
        a: "The routing is per distribution rather than Ubuntu specific. Whichever one holds a working, logged in muse CLI is the one to use.",
      },
    ],
    related: ["install/windows", "guides/muse-code-windows-without-wsl", "use-cases/windows-developers"],
  },
];
