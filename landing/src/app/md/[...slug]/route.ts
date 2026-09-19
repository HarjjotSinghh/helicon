import { ALL_PAGES, pageBySlug, pagesInSection, sectionBySlug } from "@/lib/seo/catalog";
import { pageToMarkdown, sectionToMarkdown } from "@/lib/seo/markdown";
import { FAQ_PAGE_META, faqGroups } from "@/lib/seo/faq";
import { recentReleases } from "@/lib/github-release";
import { RELEASES_URL, SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * The Markdown mirror of every page. `proxy.ts` rewrites `<path>.md` here, and also rewrites any
 * request that asks for `text/markdown` in its Accept header, so an agent can fetch the page it
 * was given the URL for and receive something it does not have to parse out of HTML.
 */

export const revalidate = 3600;

function markdownResponse(body: string) {
  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
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

async function changelogMarkdown() {
  const releases = await recentReleases(20);
  const body = releases.length
    ? releases
        .map((release) => {
          const date = release.publishedAt ? release.publishedAt.slice(0, 10) : "";
          const head = `## ${release.name}${date ? ` (${date})` : ""}${release.prerelease ? " [pre-release]" : ""}`;
          return [head, "", release.body || "_No notes._", "", release.notesUrl].join("\n");
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
    "Every Helicon release is published on GitHub with a signed Windows installer and a universal macOS DMG. Newest first.",
    "",
    body,
    "",
  ].join("\n");
}

export function generateStaticParams() {
  const hubs = ["compare", "features", "guides", "glossary", "install", "use-cases"].map((slug) => ({ slug: [slug] }));
  const pages = ALL_PAGES.map((page) => ({ slug: page.slug.split("/") }));
  return [...hubs, ...pages, { slug: ["faq"] }, { slug: ["changelog"] }];
}

export async function GET(_request: Request, context: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await context.params;
  const path = (slug ?? []).join("/");

  if (path === "faq") return markdownResponse(faqMarkdown());
  if (path === "changelog") return markdownResponse(await changelogMarkdown());

  const page = pageBySlug(path);
  if (page) return markdownResponse(pageToMarkdown(page));

  const section = sectionBySlug(path);
  if (section) return markdownResponse(sectionToMarkdown(section, pagesInSection(section.id)));

  return new Response(`Not found: /${path}.md\n\nIndex of everything: ${SITE_URL}/llms.txt\n`, {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
