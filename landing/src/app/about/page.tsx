import type { Metadata } from "next";
import { SeoPageRoute } from "@/components/seo/render";
import { metadataFor } from "@/lib/seo/metadata";
import { pageBySlug } from "@/lib/seo/catalog";

const SLUG = "about";

export const metadata: Metadata = metadataFor(pageBySlug(SLUG)!);

export default async function Page() {
  return <SeoPageRoute slug={SLUG} />;
}
