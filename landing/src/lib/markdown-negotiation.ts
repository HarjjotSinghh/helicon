/**
 * Which requests get Markdown instead of HTML, and where those requests are rewritten to.
 *
 * Kept out of proxy.ts so that the rules can be tested directly. Two things trigger the Markdown
 * mirror: a `.md` suffix on any page path, and an `Accept: text/markdown` header, which is the
 * acceptmarkdown.com convention. The home page is included: an agent handed helicon.sh and nothing
 * else has to be able to ask for Markdown at the URL it was given.
 */

/** Paths that already serve their own plain-text or Markdown document. */
export const OWN_TEXT_ROUTES = new Set(["/agents.md", "/llms.txt", "/llms-full.txt"]);

/**
 * Paths that are documents or machinery rather than pages. Rewriting these would turn a JSON API
 * response into a Markdown 404 for any client that happens to accept Markdown.
 */
const NEVER_MARKDOWN = ["/api", "/download", "/openapi.json", "/_next", "/md/"];

/** Where the home page's Markdown mirror lives, since a catch-all cannot match an empty path. */
export const HOME_MARKDOWN_SLUG = "index";

/** True when the caller would rather have Markdown than HTML. */
export function prefersMarkdown(accept: string | null): boolean {
  if (!accept) return false;
  if (!/text\/markdown/i.test(accept)) return false;
  // An HTML-first browser sends text/html before anything else; only rewrite when it does not.
  return !/text\/html/i.test(accept);
}

function isExcluded(pathname: string): boolean {
  return NEVER_MARKDOWN.some((prefix) => {
    const base = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
    return pathname === base || pathname.startsWith(`${base}/`);
  });
}

/**
 * The path a request should be rewritten to, or null to leave it alone. The result is always
 * under /md, which is where the Markdown mirror route lives.
 */
export function markdownRewriteTarget(pathname: string, accept: string | null): string | null {
  if (OWN_TEXT_ROUTES.has(pathname)) return null;
  if (pathname.startsWith("/md/")) return null;

  if (pathname.endsWith(".md")) {
    const target = pathname.slice(0, -3);
    if (target === "" || target === "/") return `/md/${HOME_MARKDOWN_SLUG}`;
    return `/md${target}`;
  }

  if (isExcluded(pathname)) return null;
  if (!prefersMarkdown(accept)) return null;

  if (pathname === "/") return `/md/${HOME_MARKDOWN_SLUG}`;
  const clean = pathname.replace(/\/$/, "");
  return clean === "" ? `/md/${HOME_MARKDOWN_SLUG}` : `/md${clean}`;
}
