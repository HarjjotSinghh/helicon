import type { Metadata } from "next";
import { SeoPageRoute } from "@/components/seo/render";
import { metadataFor } from "@/lib/seo/metadata";
import { pageBySlug, pagesInSection } from "@/lib/seo/catalog";

const SECTION = "use-cases";

export const dynamicParams = false;

export function generateStaticParams() {
  return pagesInSection(SECTION).map((page) => ({ slug: page.slug.slice(SECTION.length + 1) }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = pageBySlug(`${SECTION}/${slug}`);
  return page ? metadataFor(page) : {};
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <SeoPageRoute slug={`${SECTION}/${slug}`} />;
}
