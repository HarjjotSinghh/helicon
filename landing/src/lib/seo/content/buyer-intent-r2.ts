import type { SeoPage } from "../types";
import { MUSE_CODE_DOCS_URL } from "../../tested";

/**
 * Buyer-intent pages from the 21 Oct 2026 SEO round 2 brief. One page per product this round.
 * Facts come from the repo (cited in the PR body) and from marketing/seo/pr217-facts-2026-10-20.md.
 */

const UPDATED = "2026-10-21";

export const BUYER_INTENT_R2_PAGES: SeoPage[] = [
  {
    slug: "guides/muse-code-review",
    section: "guides",
    icon: "currency",
    label: "Muse Code review",
    title: "Muse Code review: plans, limits and what Helicon adds",
    h1: "Muse Code review: plans, limits and what Helicon adds",
    description:
      "A plain Muse Code review covering plans and prices, usage limits, platforms, when the plain terminal wins, and what the Helicon desktop app adds on top.",
    answer:
      "Muse Code is Meta's coding agent, run from the terminal as the muse command. Meta lists four paid plans, from $5 to $200 a month, and no free plan or trial on the pages checked on 20 October 2026. Helicon is a free, MIT licensed desktop app that drives the same CLI and adds no bill of its own.",
    keywords: ["muse code review", "muse code subscription review"],
    updated: UPDATED,
    blocks: [
      {
        kind: "p",
        text: "I built Helicon, so read the Helicon parts as the maker's view.",
      },
      { kind: "h2", text: "What Muse Code costs" },
      {
        kind: "p",
        text: "Meta lists four paid plans, from $5 to $200 a month. The pages checked on 20 October 2026 list no free plan and no free trial. A subscription covers only the key the CLI sets up when you sign in. Any other API key, including one in META_API_KEY, is billed per token. To see what your own threads cost at published rates, read [how to see what a thread cost](/guides/see-muse-code-cost).",
      },
      { kind: "h2", text: "Usage limits" },
      {
        kind: "p",
        text: "Muse Code reports a 5 hour rolling window and a weekly cap. Helicon shows both in the sidebar and on the usage page, as the CLI reports them. The cost figures on the usage page are a separate meter reading, not a bill. The limits are explained in [Muse Code usage limits](/features/plan-limits).",
      },
      { kind: "h2", text: "Platforms" },
      {
        kind: "p",
        text: "Muse Code runs natively on Windows. Helicon's desktop app installs on Windows, macOS and Linux. Muse Code inside WSL2 still works, and Helicon uses it when the native install is missing.",
      },
      { kind: "h2", text: "When the plain terminal is the better pick" },
      {
        kind: "p",
        text: "The muse terminal is the official way to run Muse Code, and it stays the fastest path for one task in one repo. Stick with it if:",
      },
      {
        kind: "ul",
        items: [
          "You work in one repo at a time, and one terminal tab is enough.",
          "You run Muse Code in scripts or a shell pipeline, with no window.",
          "You want the fewest moving parts. Helicon is one more app on top of the CLI.",
        ],
      },
      { kind: "h2", text: "What Helicon adds" },
      {
        kind: "p",
        text: "Helicon is an unofficial, community client. It is not affiliated with Meta. It adds:",
      },
      {
        kind: "ul",
        items: [
          "Sessions from every project in one sidebar, including sessions you started in the terminal.",
          "Inline diffs and approval prompts that show the real command, with waiting threads marked in the sidebar.",
          "A cost view that shows what each thread would have cost at Meta's published per token rates. It is a meter reading, not a bill.",
          "No account, no paid tier and no second bill. It uses your existing Muse Code login.",
        ],
      },
      { kind: "h2", text: "What this review does not cover" },
      {
        kind: "p",
        text: "It does not rate how good the model is. I have not benchmarked Muse Code, and this page quotes no benchmark numbers.",
      },
      { kind: "h2", text: "Before you buy" },
      {
        kind: "ol",
        items: [
          `Read the plan list on [Meta's Muse Code page](${MUSE_CODE_DOCS_URL}).`,
          "Install the muse CLI and run `muse login`. Helicon reuses that login.",
          "Install Helicon, work for a few days, then read the usage page to see what your threads cost at published rates.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is Muse Code free?",
        a: "Not on the pages checked on 20 October 2026. Meta lists four paid plans, from $5 to $200 a month, and no free plan or trial. Helicon itself is free.",
      },
      {
        q: "Is Muse Code made by Meta?",
        a: "Yes. Muse Code is Meta's coding agent CLI. Helicon is an unofficial client and is not affiliated with Meta.",
      },
      {
        q: "Does Helicon add a second bill?",
        a: "No. Helicon uses the login from `muse login` and your existing Muse Code subscription. It has no paid tier.",
      },
    ],
    related: ["compare/muse-code-terminal", "guides/muse-code-login", "guides/see-muse-code-cost", "features/plan-limits", "muse-code-gui"],
  },
];
