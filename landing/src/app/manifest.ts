import type { MetadataRoute } from "next";
import { DESCRIPTION, SITE_NAME, TITLE } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: TITLE,
    short_name: SITE_NAME,
    description: DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#fbfcfe",
    theme_color: "#0a6ddd",
    icons: [
      { src: "/assets/favicon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/assets/logo-light.png", sizes: "300x300", type: "image/png" },
    ],
  };
}
