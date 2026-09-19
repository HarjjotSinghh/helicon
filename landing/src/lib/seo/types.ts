/**
 * The content model behind every generated page on the site.
 *
 * A page is a list of blocks. The same blocks render as React for people and as Markdown for
 * answer engines at `<path>.md`, so the two can never drift apart. Everything here is plain data
 * with no JSX, which keeps it importable from route handlers, the sitemap and the llms.txt files.
 */

/**
 * Every glyph a generated page can carry. The registry in components/seo/icons.tsx is typed as
 * Record<IconKey, Glyph>, so adding a key here without drawing it is a type error rather than a
 * blank square on a live page.
 */
export type IconKey =
  | "windows"
  | "apple"
  | "linux"
  | "github"
  | "terminal"
  | "terminalWindow"
  | "code"
  | "lightning"
  | "browsers"
  | "appWindow"
  | "robot"
  | "cursor"
  | "wind"
  | "gitBranch"
  | "gitCommit"
  | "gitDiff"
  | "gitFork"
  | "puzzle"
  | "squares"
  | "tag"
  | "clock"
  | "shield"
  | "chart"
  | "gauge"
  | "folder"
  | "folderOpen"
  | "command"
  | "file"
  | "globe"
  | "tree"
  | "target"
  | "queue"
  | "rewind"
  | "drives"
  | "currency"
  | "search"
  | "keyboard"
  | "warning"
  | "swap"
  | "stack"
  | "broadcast"
  | "briefcase"
  | "sparkle"
  | "plugsConnected"
  | "plugs"
  | "cube"
  | "scales"
  | "bookmark"
  | "book"
  | "people"
  | "download"
  | "question";

export type SectionId =
  | "compare"
  | "features"
  | "guides"
  | "glossary"
  | "install"
  | "use-cases"
  | "page";

export type Faq = { q: string; a: string };

export type Step = { name: string; text: string; code?: string };

export type Block =
  | { kind: "p"; text: string }
  | { kind: "h2"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "table"; head: string[]; rows: string[][]; caption?: string }
  | { kind: "code"; lang?: string; code: string }
  | { kind: "note"; text: string }
  | { kind: "quote"; text: string; cite?: string }
  | { kind: "stats"; items: { value: string; label: string; source?: string }[] }
  | { kind: "steps"; steps: Step[] };

export type SeoPage = {
  /** Path under the origin, with no leading or trailing slash. "compare/cursor". */
  slug: string;
  section: SectionId;
  /** The glyph this page carries, in its header and on every card that links to it. */
  icon: IconKey;
  /** Breadcrumb label and card label. Short. */
  label: string;
  /** The <title>, written for the SERP. Keep under 60 characters where possible. */
  title: string;
  h1: string;
  /** Meta description, 140 to 165 characters, written to earn the click. */
  description: string;
  /**
   * The direct answer, 40 to 60 words. It is the first paragraph on the page, the `description`
   * of the page's schema.org node, and the opening of the Markdown mirror, because that is the
   * passage answer engines lift.
   */
  answer: string;
  /** Search terms this page is written for. Used for internal reporting and the keyword map. */
  keywords: string[];
  /** ISO date. Rendered as "Last updated" and emitted as dateModified. */
  updated: string;
  blocks: Block[];
  faqs?: Faq[];
  /** Slugs of related pages, rendered as an internal link grid and emitted in the Markdown. */
  related?: string[];
  /** When set, the page emits HowTo schema in addition to its other nodes. */
  howTo?: { name: string; steps: Step[] };
  /** When set, the page emits ItemList schema over these names. */
  itemList?: { name: string; items: string[] };
  /** Overrides the default og image line. */
  ogEyebrow?: string;
};

export type Section = {
  id: SectionId;
  icon: IconKey;
  /** Hub path, with no leading slash. */
  slug: string;
  label: string;
  title: string;
  h1: string;
  description: string;
  answer: string;
  intro: string;
  keywords: string[];
};
