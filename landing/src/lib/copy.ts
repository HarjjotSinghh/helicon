import { installerPath } from "./downloads";
import { audienceFromOs, type Audience, type VisitorOs } from "./os";
import { REPO_URL } from "./site";

export type Cta = {
  label: string;
  href: string;
  kind: "primary" | "outline";
  external?: boolean;
};

export type PageCopy = {
  audience: Audience;
  headline: string;
  /** When set, the hero stacks this under `headline` as its own line. */
  headlineContinue?: string;
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
      headline: "A Windows app for Meta's coding agent, Muse\u00a0Code.",
      lead: "Every session, diff and approval in one window, on the Muse Code plan you already pay for.",
      body: "Free and open source. Native on Windows (no WSL), macOS and Linux, plus VS Code.",
      ctas: [
        { label: "Download for Windows", href: installerPath("windows", "hero"), kind: "primary" },
        source,
      ],
      headerCta: "Download",
      headerHref: installerPath("windows", "header"),
      closingTitle: "Muse Code on Windows, without the WSL terminal juggling.",
      closingBody: "Free, MIT licensed, and running on the Muse Code subscription you already have.",
      featuresTitle: "Seven agents, one window, on Windows",
      featuresBody:
        "Parallel subagents and a replayable event log are wasted in a terminal. Projects, diffs, approvals and cost sit side by side.",
      howExtra:
        "On Windows the daemon runs Muse Code natively, with WSL2 and path translation still there for anyone who prefers it.",
      compareBody:
        "Helicon is a desktop app for Muse Code on Windows, native or in WSL2. It is not the only GUI, and it is not official.",
      faqIntro: "WSL, billing, credentials, and whether any of this is official. Straight answers.",
    };
  }

  if (audience === "macos") {
    return {
      audience,
      headline: "A desktop app for Meta's coding agent, Muse\u00a0Code.",
      lead: "Every session, diff and approval in one window, on the Muse Code plan you already pay for.",
      body: "Free and open source. Native on Windows (no WSL), macOS and Linux, plus VS Code.",
      ctas: [
        { label: "Download for macOS", href: installerPath("macos", "hero"), kind: "primary" },
        source,
      ],
      headerCta: "Download",
      headerHref: installerPath("macos", "header"),
      closingTitle: "Bring your threads out of the terminal.",
      closingBody: "Free, MIT licensed, and running on the Muse Code subscription you already have.",
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
    headline: "A desktop app for Meta's coding agent, Muse\u00a0Code.",
    lead: "Every session, diff and approval in one window, on the Muse Code plan you already pay for.",
    body: "Free and open source. Native on Windows (no WSL), macOS and Linux, plus VS Code.",
    ctas: [
      { label: "Download for Windows", href: installerPath("windows", "hero"), kind: "primary" },
      { label: "Download for macOS", href: installerPath("macos", "hero"), kind: "outline" },
      source,
    ],
    headerCta: "Download",
    headerHref: "#install",
    closingTitle: "Bring your threads out of the terminal.",
    closingBody: "Free, MIT licensed, and running on the Muse Code subscription you already have.",
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
  return primary ?? { label: "Download", href: "#install", kind: "primary" };
}
