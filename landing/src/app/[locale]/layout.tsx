import { notFound } from "next/navigation";
import { DocumentShell } from "@/components/document-shell";
import { LOCALES, LOCALE_INFO, isLocale } from "@/lib/i18n";
import "../globals.css";

export { viewport } from "@/components/document-shell";

/**
 * Root layout for the translated pages, so each one gets its own <html lang>. Only the locales in
 * LOCALES exist; any other first segment falls through to the English site's 404.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <DocumentShell lang={LOCALE_INFO[locale].hreflang}>{children}</DocumentShell>;
}
