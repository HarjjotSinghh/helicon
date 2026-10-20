import { formatDate } from "../freshness";
import type { SeoPage } from "../types";

/**
 * Pages written for buying intent queries that no other content file answers. Kept apart from
 * guides.ts so a new page here never touches a file another change is editing.
 */

/** When the prices on these pages were read from Meta's Muse Code page. */
const PRICES_CHECKED = "2026-10-20";
const META_MUSE_CODE_URL = "https://dev.meta.ai/products/muse-code/";

export const BUYER_INTENT_PAGES: SeoPage[] = [
  {
    slug: "guides/muse-code-pricing",
    icon: "currency",
    section: "guides",
    label: "Muse Code pricing",
    title: "Muse Code pricing: plans, API rates and the free app",
    h1: "Muse Code pricing",
    description:
      "Muse Code pricing as Meta lists it: four monthly plans from $5 to $200, per-token Model API rates and no free tier. Helicon, the desktop client, adds no cost.",
    answer:
      "Meta lists four Muse Code plans: Everyday Usage at $5 a month, High Usage at $15, Power Usage at $50 and Maximum Usage at $200. It also lists per-token Model API rates. The page shows no free tier. Helicon, a desktop client for Muse Code, is free and adds no cost on top.",
    keywords: [
      "muse code pricing",
      "muse code pricing plans",
      "muse code subscription cost",
      "muse code cost",
      "muse code free tier",
      "muse code free trial",
    ],
    updated: PRICES_CHECKED,
    blocks: [
      {
        kind: "p",
        text: `Prices below are copied from [Meta's Muse Code page](${META_MUSE_CODE_URL}), checked ${formatDate(PRICES_CHECKED)}. They change, so confirm on that page before you buy.`,
      },
      { kind: "h2", text: "What are the Muse Code plans?" },
      {
        kind: "table",
        head: ["Plan", "Price per month", "What Meta lists"],
        rows: [
          [
            "Everyday Usage",
            "$5.00",
            "Muse Spark, Muse Wonder and Muse Image. 10 to 50 prompts every 5 hours, including image and video uploads. Voice mode and web search",
          ],
          ["High Usage", "$15.00", "Everything in Everyday Usage, 5x its usage, and more multimodal inputs"],
          [
            "Power Usage",
            "$50.00",
            "Everything in High Usage, the most powerful Muse models including Muse Wonder Full, 20x Everyday Usage, early access to new features and higher file uploads",
          ],
          ["Maximum Usage", "$200.00", "Everything in Power Usage, and 80x Everyday Usage"],
        ],
        caption: "Muse Code subscription plans, as listed on Meta's Muse Code page.",
      },
      { kind: "h2", text: "What does the Model API cost?" },
      {
        kind: "p",
        text: "Meta also lists Model API rates per million tokens, with a 1M token context window. The two Spark versions it lists are priced the same.",
      },
      {
        kind: "table",
        head: ["Model", "Input", "Cached input", "Output", "Data use"],
        rows: [
          ["muse-spark-1.3", "$1.25", "$0.15", "$4.25", "Not used to improve Meta's products"],
          ["muse-spark-1.3-contributor", "$0.10", "$0.002", "$0.20", "Used to improve Meta's products"],
          ["muse-spark-1.2", "$1.25", "$0.15", "$4.25", "Not used to improve Meta's products"],
          ["muse-spark-1.2-contributor", "$0.10", "$0.002", "$0.20", "Used to improve Meta's products"],
        ],
        caption: "Model API rates per million tokens, as listed on Meta's Muse Code page.",
      },
      { kind: "h2", text: "Does Muse Code have a free tier?" },
      {
        kind: "p",
        text: "The page checked lists four paid plans and no free tier. It does not mention a free trial either.",
      },
      { kind: "h2", text: "Plan or pay-as-you-go billing?" },
      {
        kind: "p",
        text: "Helicon's install guides say Muse Code needs a Muse Code plan or pay-as-you-go billing on Meta's Model API. The Meta page checked shows the plans and the per-token rates, but it does not walk through the billing steps. A subscription covers only the key the CLI sets up at sign-in. Any other API key, including one in META_API_KEY, bills per token.",
      },
      { kind: "h2", text: "What does Helicon cost on top?" },
      {
        kind: "p",
        text: "Nothing. [Helicon is free](/pricing), MIT licensed, with no paid tier, no account and no API key. It drives the muse CLI you already have, so the only bill is the one from Meta.",
      },
      {
        kind: "p",
        text: "Helicon can show you what you are using. The sidebar carries the 5 hour window and the weekly cap as Muse Code reports them, which is useful because the plan limits above are counted per 5 hour window. The usage page shows what each thread would have cost at Meta's published per-token rates. That figure is a meter reading, not a bill. See [your plan meter](/features/plan-limits) and [how to see what a thread cost](/guides/see-muse-code-cost).",
      },
    ],
    faqs: [
      {
        q: "How much does Muse Code cost?",
        a: "Meta's Muse Code page lists plans at $5, $15, $50 and $200 a month, called Everyday, High, Power and Maximum Usage. It also lists per-token Model API rates, from $1.25 per million input tokens for muse-spark-1.3.",
      },
      {
        q: "Does Muse Code have a free tier?",
        a: "The Muse Code page checked on 20 October 2026 lists none, and it does not mention a free trial.",
      },
      {
        q: "Is Helicon free?",
        a: "Yes. It is MIT licensed with no paid tier, no trial and no account. You pay Meta for Muse Code and nothing extra for Helicon.",
      },
      {
        q: "Does Helicon need an API key?",
        a: "No. It uses the login from your own `muse login` and stores no credentials.",
      },
      {
        q: "Does the cost view in Helicon show my bill?",
        a: "No. It shows what each thread would have cost at Meta's published per-token rates. Meta bills you under your plan or your API usage, not Helicon.",
      },
    ],
    related: ["pricing", "features/plan-limits", "features/cost-and-usage", "guides/see-muse-code-cost", "muse-code-download"],
  },
];
