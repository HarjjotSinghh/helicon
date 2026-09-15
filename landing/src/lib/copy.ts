import { installerPath } from "./downloads";
import { audienceFromOs, type Audience, type VisitorOs } from "./os";
import { REPO_URL, VERSION } from "./site";

export type Cta = {
  label: string;
  href: string;
  kind: "primary" | "outline";
  external?: boolean;
};

export type PageCopy = {
  audience: Audience;
  headline: string;
  lead: string;
  body: string;
  ctas: Cta[];
  headerCta: string;
  headerHref: string;
  closingTitle: string;
  closingBody: string;
  featuresTitle: string;
  featuresBody: string;
  howExtra: string | null;
  compareBody: string;
  faqIntro: string;
};

const source: Cta = {
  label: "View source",
  href: REPO_URL,
  kind: "outline",
  external: true,
};

export function getPageCopy(os: VisitorOs): PageCopy {
  const audience = audienceFromOs(os);

  if (audience === "windows") {
    return {
      audience,
      headline: "Muse Code on Windows, with a real UI.",
      lead: "Signed installer. Your existing Muse plan. No second bill.",
      body: "Muse itself is terminal-only and WSL-only on Windows. Helicon is the desktop app: a sidecar talks to muse in Ubuntu, translates paths, and puts every project, session and diff in one window.",
      ctas: [
        { label: "Download for Windows", href: installerPath("windows", "hero"), kind: "primary" },
        source,
      ],
      headerCta: "Download",
      headerHref: installerPath("windows", "header"),
      closingTitle: "Muse Code on Windows, without living in WSL.",
      closingBody: "Free, MIT licensed, and running on the Muse subscription you already have.",
      featuresTitle: "Seven agents, one window, on Windows",
      featuresBody:
        "Parallel subagents and a replayable event log are wasted in a terminal. Projects, diffs, approvals and cost sit side by side.",
      howExtra:
        "On Windows the daemon reaches Muse through a WSL2 sidecar, with path translation both ways, so Windows paths and Ubuntu paths stay in sync.",
      compareBody:
        "Muse Code has no native Windows build. Helicon is the signed desktop app for that gap. It is not the only GUI, and it is not official.",
      faqIntro: "WSL, billing, credentials, and whether any of this is official. Straight answers.",
    };
  }

  if (audience === "macos") {
    return {
      audience,
      headline: "Muse Code, without living in the terminal.",
      lead: "Same Muse Code. Same subscription. Better interface.",
      body: "A free, open-source Mac app for the muse CLI. One universal DMG for Apple Silicon and Intel, with every project, session and diff in one window.",
      ctas: [
        { label: "Download for macOS", href: installerPath("macos", "hero"), kind: "primary" },
        source,
      ],
      headerCta: "Download",
      headerHref: installerPath("macos", "header"),
      closingTitle: "Bring your threads out of the terminal.",
      closingBody: "Free, MIT licensed, and running on the Muse subscription you already have.",
      featuresTitle: "Everything a session needs, in one window",
      featuresBody:
        "Projects, threads, diffs, approvals and cost live side by side, so you stop hunting through terminal tabs.",
      howExtra: null,
      compareBody: "Helicon is one of several ways to run Muse Code. It is not the only GUI, and it is not official.",
      faqIntro: "Billing, credentials, first-launch on Mac, and whether any of this is official. Straight answers.",
    };
  }

  return {
    audience,
    headline: "Muse Code, without living in the terminal.",
    lead: "Same Muse Code. Same subscription. Better interface.",
    body: `A free, open-source desktop and web app for the muse CLI, with every project, session and diff in one window.`,
    ctas: [
      { label: "Download for Windows", href: installerPath("windows", "hero"), kind: "primary" },
      { label: "Download for macOS", href: installerPath("macos", "hero"), kind: "outline" },
      source,
    ],
    headerCta: "Download",
    headerHref: "#install",
    closingTitle: "Bring your threads out of the terminal.",
    closingBody: "Free, MIT licensed, and running on the Muse subscription you already have.",
    featuresTitle: "Everything a session needs, in one window",
    featuresBody:
      "Projects, threads, diffs, approvals and cost live side by side, so you stop hunting through terminal tabs.",
    howExtra: null,
    compareBody: "Helicon is one of several ways to run Muse Code. It is not the only GUI, and it is not official.",
    faqIntro: "Billing, credentials, Windows, and whether any of this is official. Straight answers.",
  };
}

export function closingCta(copy: PageCopy): Cta {
  const primary = copy.ctas.find((c) => c.kind === "primary");
  return primary ?? { label: `Download v${VERSION}`, href: "#install", kind: "primary" };
}
