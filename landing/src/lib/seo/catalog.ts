import type { Section, SectionId, SeoPage } from "./types";
import { COMPARE_PAGES } from "./content/compare";
import { FEATURE_PAGES } from "./content/features";
import { GUIDE_PAGES } from "./content/guides";
import { GLOSSARY_PAGES } from "./content/glossary";
import { INSTALL_PAGES } from "./content/install";
import { USE_CASE_PAGES } from "./content/use-cases";
import { PILLAR_PAGES } from "./content/pillars";
import { LEGAL_PAGES } from "./content/legal";

/**
 * Every generated page on the site, in one place. The sitemap, the internal link grids, the
 * llms.txt index and the Markdown mirrors all read from here, so adding a page to a content file
 * is the only step needed to make it exist everywhere.
 */

export const SECTIONS: Section[] = [
  {
    id: "install",
    icon: "download",
    slug: "install",
    label: "Install",
    title: "Install a Muse Code desktop app on Windows, macOS or Linux",
    h1: "Install Helicon",
    description:
      "Platform by platform install guides for the Muse Code desktop app: signed Windows installer, universal macOS DMG, Linux AppImage, and WSL2 routing.",
    answer:
      "Helicon installs from a signed Windows installer, a universal macOS DMG or an x86_64 Linux AppImage, all on the latest GitHub release, and all self updating. Every route needs the muse CLI installed and signed in with your own muse login, because Helicon drives Muse Code rather than replacing it.",
    intro:
      "Pick your platform. Every route needs one thing first: a muse CLI that answers `muse --version` and is signed in.",
    keywords: ["install muse code gui", "muse code desktop app download", "muse code installer", "muse code setup"],
  },
  {
    id: "compare",
    icon: "scales",
    slug: "compare",
    label: "Compare",
    title: "Muse Code GUI comparisons: Helicon vs the alternatives",
    h1: "Comparisons",
    description:
      "Honest comparisons between a standalone Muse Code desktop app and the terminal, editor extensions, ACP bridges, other agent GUIs and other coding agents.",
    answer:
      "These pages compare a standalone Muse Code desktop app with the alternatives people actually weigh it against: the muse terminal, VS Code extensions, Agent Client Protocol bridges, other open-source Muse GUIs, and coding agents with their own billing such as Cursor, Windsurf and Aider.",
    intro:
      "Several of these are not competitors at all, because they run a different agent on different billing. The comparisons say so.",
    keywords: ["muse code gui comparison", "muse code alternatives", "best muse code client", "coding agent gui comparison"],
  },
  {
    id: "features",
    icon: "squares",
    slug: "features",
    label: "Features",
    title: "Muse Code GUI features: sessions, diffs, approvals, cost",
    h1: "What the app does",
    description:
      "Session history and resume, inline diffs, an approval queue, cost at API rates, projects and worktrees, a file viewer, a remote daemon and full keyboard control.",
    answer:
      "Helicon's capabilities come from reading the Muse Code Session Protocol directly: session history with resume, inline diffs, an approval queue mapped one to one, cost at published per token rates, projects grouped by working directory, a file viewer, subagent and workflow controls, and full keyboard operation.",
    intro: "One page per capability, written for the thing you would actually search for.",
    keywords: ["muse code gui features", "coding agent gui capabilities", "muse code client features"],
  },
  {
    id: "guides",
    icon: "book",
    slug: "guides",
    label: "Guides",
    title: "Muse Code how-to guides",
    h1: "Guides",
    description:
      "Task guides for Muse Code: running it on Windows without WSL, resuming a session, setting up a remote daemon, reviewing agent changes, and fixing common failures.",
    answer:
      "These are task guides for running Muse Code through a graphical client: Windows without WSL, resuming past sessions, remote daemon setup, parallel agents in git worktrees, reading what an agent changed, and the two failures people hit most, a missing muse CLI and the macOS first launch warning.",
    intro: "Each guide is one task, with the steps and the failure modes.",
    keywords: ["muse code how to", "muse code tutorial", "muse code setup guide", "muse code troubleshooting"],
  },
  {
    id: "use-cases",
    icon: "people",
    slug: "use-cases",
    label: "Use cases",
    title: "Who a Muse Code desktop app is for",
    h1: "Use cases",
    description:
      "Windows developers, macOS power users, people running parallel agents, remote development, open-source maintainers, freelancers, monorepos and terminal loyalists.",
    answer:
      "A graphical Muse Code client earns its place when the number of agent threads exceeds what you can hold in your head. These pages cover the situations where that happens: Windows setup friction, parallel agents across repositories, remote execution, client work, monorepos, and maintainers reviewing what an agent did.",
    intro: "If none of these describe you, the terminal is probably still the right answer.",
    keywords: ["muse code for windows developers", "coding agent for maintainers", "ai agent workflow use cases"],
  },
  {
    id: "glossary",
    icon: "bookmark",
    slug: "glossary",
    label: "Glossary",
    title: "Muse Code glossary: MSP, muse serve, ADE, approvals",
    h1: "Glossary",
    description:
      "Plain definitions for the terms around Muse Code and agent tooling: the Muse Code Session Protocol, muse serve, ACP, ADEs, approvals, worktrees, subagents and more.",
    answer:
      "Plain definitions for the vocabulary around Muse Code: the muse CLI, muse serve, the Muse Code Session Protocol, the Agent Client Protocol, agentic development environments, agent approvals, git worktrees, subagents, reasoning effort, TUIs, llms.txt and Tauri.",
    intro: "Each definition is self contained, so it reads correctly quoted on its own.",
    keywords: ["muse code glossary", "what is msp", "agent tooling terms", "coding agent glossary"],
  },
];

export const ALL_PAGES: SeoPage[] = [
  ...PILLAR_PAGES,
  ...LEGAL_PAGES,
  ...INSTALL_PAGES,
  ...COMPARE_PAGES,
  ...FEATURE_PAGES,
  ...GUIDE_PAGES,
  ...USE_CASE_PAGES,
  ...GLOSSARY_PAGES,
];

const BY_SLUG = new Map(ALL_PAGES.map((page) => [page.slug, page]));

export function pageBySlug(slug: string): SeoPage | undefined {
  return BY_SLUG.get(slug);
}

export function pagesInSection(id: SectionId): SeoPage[] {
  return ALL_PAGES.filter((page) => page.section === id);
}

export function sectionBySlug(slug: string): Section | undefined {
  return SECTIONS.find((section) => section.slug === slug);
}

export function sectionById(id: SectionId): Section | undefined {
  return SECTIONS.find((section) => section.id === id);
}

/** Slugs of the section hubs, used by the sitemap and the Markdown mirror. */
export const HUB_SLUGS = SECTIONS.map((section) => section.slug);

/** Slugs of everything the site can serve as a page, hubs and the FAQ page included. */
export const ALL_SLUGS = [...HUB_SLUGS, "faq", ...ALL_PAGES.map((page) => page.slug)];

/**
 * Related pages for a page, falling back to its own section when the content did not name any.
 * Never returns the page itself, and never more than six.
 */
export function relatedPages(page: SeoPage): SeoPage[] {
  const named = (page.related ?? []).map((slug) => BY_SLUG.get(slug)).filter((p): p is SeoPage => Boolean(p));
  if (named.length >= 3) return named.slice(0, 6);
  const siblings = pagesInSection(page.section).filter(
    (candidate) => candidate.slug !== page.slug && !named.some((n) => n.slug === candidate.slug),
  );
  return [...named, ...siblings].slice(0, 6);
}

/** Every keyword this site is written for, deduplicated. Used by /keywords.json and reporting. */
export function keywordMap(): { slug: string; title: string; keywords: string[] }[] {
  return ALL_PAGES.map((page) => ({ slug: page.slug, title: page.title, keywords: page.keywords }));
}
