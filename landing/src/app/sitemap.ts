import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: SITE_URL, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/llms.txt`, lastModified, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/llms-full.txt`, lastModified, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/agents.md`, lastModified, changeFrequency: "weekly", priority: 0.5 },
  ];
}
