import { notFound } from "next/navigation";
import { DocPage } from "./doc-page";
import { pageBySlug, sectionById } from "@/lib/seo/catalog";
import { jsonLd, pageGraph } from "@/lib/seo/schema";
import { latestRelease } from "@/lib/github-release";

/**
 * One generated page, end to end: look it up, build its breadcrumb trail and its schema graph,
 * and render it. Every route file in the app is a two line wrapper around this.
 */
export async function SeoPageRoute({ slug }: { slug: string }) {
  const page = pageBySlug(slug);
  if (!page) notFound();

  const release = await latestRelease();
  const version = release?.version ?? null;
  const section = sectionById(page.section);
  const trail = section
    ? [
        { name: section.label, slug: section.slug },
        { name: page.label, slug: page.slug },
      ]
    : [{ name: page.label, slug: page.slug }];

  return <DocPage page={page} version={version} trail={trail} jsonLdString={jsonLd(pageGraph(page, version, trail))} />;
}
