import type { Block, SeoPage, Section } from "./types";
import { SITE_NAME, SITE_URL } from "../site";
import { relatedPages } from "./catalog";

/**
 * The Markdown mirror of every page, served at `<path>.md` and linked from the HTML with a
 * `Link: rel="alternate" type="text/markdown"` header. Answer engines and agents that ask for
 * Markdown get the page without having to parse a React render of it.
 */

function renderBlock(block: Block): string {
  switch (block.kind) {
    case "h2":
      return `## ${block.text}`;
    case "h3":
      return `### ${block.text}`;
    case "p":
      return block.text;
    case "ul":
      return block.items.map((item) => `- ${item}`).join("\n");
    case "ol":
      return block.items.map((item, i) => `${i + 1}. ${item}`).join("\n");
    case "code":
      return "```" + (block.lang ?? "") + "\n" + block.code + "\n```";
    case "note":
      return `> ${block.text}`;
    case "quote":
      return `> ${block.text}${block.cite ? `\n>\n> ${block.cite}` : ""}`;
    case "stats":
      return block.items.map((s) => `- **${s.value}** ${s.label}${s.source ? ` (${s.source})` : ""}`).join("\n");
    case "steps":
      return block.steps
        .map((step, i) => `${i + 1}. **${step.name}** ${step.text}${step.code ? "\n   ```sh\n   " + step.code + "\n   ```" : ""}`)
        .join("\n");
    case "table": {
      const head = `| ${block.head.join(" | ")} |`;
      const rule = `| ${block.head.map(() => "---").join(" | ")} |`;
      const rows = block.rows.map((row) => `| ${row.join(" | ")} |`).join("\n");
      return [head, rule, rows, block.caption ? `\n_${block.caption}_` : ""].filter(Boolean).join("\n");
    }
  }
}

export function blocksToMarkdown(blocks: Block[]): string {
  return blocks.map(renderBlock).join("\n\n");
}

/** One page, as Markdown, front matter included so an agent can read the metadata without guessing. */
export function pageToMarkdown(page: SeoPage): string {
  const url = `${SITE_URL}/${page.slug}`;
  const related = relatedPages(page);
  const parts: string[] = [
    "---",
    `title: ${JSON.stringify(page.title)}`,
    `url: ${url}`,
    `description: ${JSON.stringify(page.description)}`,
    `updated: ${page.updated}`,
    `site: ${SITE_NAME}`,
    "---",
    "",
    `# ${page.h1}`,
    "",
    page.answer,
    "",
    blocksToMarkdown(page.blocks),
  ];

  if (page.howTo) {
    parts.push(
      "",
      `## ${page.howTo.name}`,
      "",
      page.howTo.steps
        .map((step, i) => `${i + 1}. **${step.name}** ${step.text}${step.code ? "\n   ```sh\n   " + step.code + "\n   ```" : ""}`)
        .join("\n"),
    );
  }

  if (page.faqs?.length) {
    parts.push("", "## Frequently asked questions", "");
    parts.push(page.faqs.map((faq) => `### ${faq.q}\n\n${faq.a}`).join("\n\n"));
  }

  if (related.length) {
    parts.push("", "## Related", "");
    parts.push(related.map((r) => `- [${r.label}](${SITE_URL}/${r.slug}): ${r.description}`).join("\n"));
  }

  parts.push(
    "",
    "---",
    "",
    `Helicon is a free, MIT licensed, unofficial community client for Meta's Muse Code CLI. Not made, sponsored or endorsed by Meta. Source: ${SITE_URL}/. Machine readable index: ${SITE_URL}/llms.txt`,
    "",
  );

  return parts.join("\n");
}

/** A section hub, as Markdown. */
export function sectionToMarkdown(section: Section, pages: SeoPage[]): string {
  const url = `${SITE_URL}/${section.slug}`;
  return [
    "---",
    `title: ${JSON.stringify(section.title)}`,
    `url: ${url}`,
    `description: ${JSON.stringify(section.description)}`,
    `site: ${SITE_NAME}`,
    "---",
    "",
    `# ${section.h1}`,
    "",
    section.answer,
    "",
    section.intro,
    "",
    "## Pages",
    "",
    pages.map((page) => `- [${page.label}](${SITE_URL}/${page.slug}): ${page.description}`).join("\n"),
    "",
  ].join("\n");
}
