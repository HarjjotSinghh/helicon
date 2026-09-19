import { homeMarkdown } from "@/lib/ai-docs";
import { HOME_MARKDOWN_SLUG } from "@/lib/markdown-negotiation";
import { ALL_PAGES, pageBySlug, pagesInSection, sectionBySlug } from "@/lib/seo/catalog";
import { notFoundMarkdown, pageToMarkdown, sectionToMarkdown } from "@/lib/seo/markdown";
import { FAQ_PAGE_META, faqGroups } from "@/lib/seo/faq";
import { latestRelease, releaseNotes, type ChangeGroups } from "@/lib/github-release";
import { RELEASES_URL, SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * The Markdown mirror of every page. `proxy.ts` rewrites `<path>.md` here, and also rewrites any
 * request that asks for `text/markdown` in its Accept header, so an agent can fetch the page it
 * was given the URL for and receive something it does not have to parse out of HTML.
 */

export const revalidate = 3600;

function markdownResponse(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      // The same URL answers in HTML or in Markdown depending on Accept, so caches have to key on
      // it. Set here rather than in the page response because this route handler owns its headers.
      Vary: "Accept",
      "Access-Control-Allow-Origin": "*",
      "X-Robots-Tag": "index, follow",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

function faqMarkdown() {
  const groups = faqGroups();
  return [
    "---",
    `title: ${JSON.stringify(FAQ_PAGE_META.title)}`,
    `url: ${SITE_URL}/faq`,
    `description: ${JSON.stringify(FAQ_PAGE_META.description)}`,
    `updated: ${FAQ_PAGE_META.updated}`,
    `site: ${SITE_NAME}`,
    "---",
    "",
    `# ${FAQ_PAGE_META.h1}`,
    "",
    FAQ_PAGE_META.answer,
    "",
    groups
      .map((group) => `## ${group.title}\n\n${group.faqs.map((faq) => `### ${faq.q}\n\n${faq.a}`).join("\n\n")}`)
      .join("\n\n"),
    "",
  ].join("\n");
}

const CHANGE_SECTIONS: Array<[keyof ChangeGroups, string]> = [
  ["added", "Added"],
  ["fixed", "Fixed"],
  ["changed", "Changed"],
  ["removed", "Removed"],
];

async function changelogMarkdown() {
  const releases = await releaseNotes(14);
  const body = releases.length
    ? releases
        .map((release) => {
          const date = release.publishedAt ? release.publishedAt.slice(0, 10) : "";
          const head = `## ${release.name}${date ? ` (${date})` : ""}${release.prerelease ? " [pre-release]" : ""}`;
          const sections = CHANGE_SECTIONS.filter(([key]) => release.changes[key].length)
            .map(([key, label]) => {
              const items = release.changes[key]
                .map((c) => {
                  const refs = [
                    ...(c.pr ? [`#${c.pr}`] : []),
                    ...c.closes.filter((n) => n !== c.pr).map((n) => `closes #${n}`),
                  ];
                  return `- ${c.text}${refs.length ? ` (${refs.join(", ")})` : ""}`;
                })
                .join("\n");
              return `### ${label}\n\n${items}`;
            })
            .join("\n\n");
          return [head, "", sections || "_Packaging only._", "", release.notesUrl].join("\n");
        })
        .join("\n\n")
    : `GitHub did not answer. The releases are at ${RELEASES_URL}.`;

  return [
    "---",
    'title: "Helicon changelog"',
    `url: ${SITE_URL}/changelog`,
    'description: "Every Helicon release, newest first, with the notes as written."',
    `site: ${SITE_NAME}`,
    "---",
    "",
    "# Changelog",
    "",
    "Every Helicon release is published on GitHub with a signed Windows installer, a universal macOS DMG and a Linux AppImage. Newest first, with what was added, fixed, changed and removed in each one.",
    "",
    body,
    "",
  ].join("\n");
}

export function generateStaticParams() {
  const hubs = ["compare", "features", "guides", "glossary", "install", "use-cases"].map((slug) => ({ slug: [slug] }));
  const pages = ALL_PAGES.map((page) => ({ slug: page.slug.split("/") }));
  return [...hubs, ...pages, { slug: ["faq"] }, { slug: ["changelog"] }, { slug: [HOME_MARKDOWN_SLUG] }];
}

export async function GET(_request: Request, context: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await context.params;
  const path = (slug ?? []).join("/");

  // The home page. `/` and `/index.md` both land here, because a catch-all cannot match nothing.
  if (path === HOME_MARKDOWN_SLUG) {
    const release = await latestRelease();
    return markdownResponse(homeMarkdown(release?.version ?? null));
  }
  if (path === "faq") return markdownResponse(faqMarkdown());
  if (path === "changelog") return markdownResponse(await changelogMarkdown());

  const page = pageBySlug(path);
  if (page) return markdownResponse(pageToMarkdown(page));

  const section = sectionBySlug(path);
  if (section) return markdownResponse(sectionToMarkdown(section, pagesInSection(section.id)));

  return markdownResponse(notFoundMarkdown(`/${path}`), 404);
}
