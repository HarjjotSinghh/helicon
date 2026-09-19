import type { Metadata } from "next";
import { SectionHubRoute } from "@/components/seo/hub-page";
import { metadataForSection } from "@/lib/seo/metadata";
import { sectionBySlug } from "@/lib/seo/catalog";

const SECTION = "guides";

export const metadata: Metadata = metadataForSection(sectionBySlug(SECTION)!);

export default async function Page() {
  return <SectionHubRoute slug={SECTION} />;
}
