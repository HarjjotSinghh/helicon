import Script from "next/script";

/**
 * Google Analytics 4, for the half of the picture PostHog does not give us: the Search Console
 * link, so organic queries and landing pages line up with sessions. It is a no-op until
 * NEXT_PUBLIC_GA_ID is set, and it loads after the page is interactive so it never costs LCP.
 */
export function GoogleAnalytics() {
  const id = process.env.NEXT_PUBLIC_GA_ID;
  if (!id) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${id}',{send_page_view:true});`}
      </Script>
    </>
  );
}
