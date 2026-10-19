import type { Metadata } from "next";
import { DocumentShell, baseMetadata } from "@/components/document-shell";
import { SITE_NAME } from "@/lib/site";
import NotFound, { metadata as notFoundMetadata } from "./(site)/not-found";
import "./globals.css";

/**
 * The 404 for URLs no route matches. With two root layouts there is no single layout to wrap
 * not-found.tsx in, so this renders the same page inside its own document.
 */
export const metadata: Metadata = {
  ...baseMetadata,
  ...notFoundMetadata,
  title: `${notFoundMetadata.title} | ${SITE_NAME}`,
};

export { viewport } from "@/components/document-shell";

export default function GlobalNotFound() {
  return (
    <DocumentShell lang="en">
      <NotFound />
    </DocumentShell>
  );
}
