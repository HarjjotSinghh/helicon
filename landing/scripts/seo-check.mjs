// Walks every URL in the sitemap and checks the things that silently break SEO: a canonical that
// does not match the sitemap entry, a missing or oversized title, a description outside the range
// search engines will render, more than one h1, an accidental noindex, unparseable JSON-LD, and a
// missing social image. Also checks that each page's Markdown mirror answers.
//
//   npm run build && npx next start -p 3111
//   node scripts/seo-check.mjs                       # defaults to http://127.0.0.1:3111
//   BASE=https://helicon.sh node scripts/seo-check.mjs
//
// Exits non-zero when anything is wrong, so it can gate a deploy.

const base = (process.env.BASE ?? "http://127.0.0.1:3111").replace(/\/$/, "");
const problems = [];
const note = (path, message) => problems.push(`${path}: ${message}`);

const sitemapRes = await fetch(`${base}/sitemap.xml`);
if (!sitemapRes.ok) {
  console.error(`Could not read ${base}/sitemap.xml: ${sitemapRes.status}`);
  process.exit(1);
}
const urls = [...(await sitemapRes.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
console.log(`sitemap: ${urls.length} URLs`);

let pages = 0;
let mirrors = 0;

for (const url of urls) {
  const { pathname } = new URL(url);
  // The plain-text surfaces are checked for existence only; they have no head to inspect.
  if (/\.(txt|md|json|xml)$/.test(pathname)) {
    const res = await fetch(base + pathname);
    if (!res.ok) note(pathname, `status ${res.status}`);
    continue;
  }

  const res = await fetch(base + pathname);
  const html = await res.text();
  pages++;
  if (!res.ok) note(pathname, `status ${res.status}`);

  const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];
  if (!canonical) note(pathname, "no canonical");
  else if (canonical !== url) note(pathname, `canonical ${canonical} does not match sitemap ${url}`);

  const title = /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? "";
  if (!title) note(pathname, "no title");
  else if (title.length > 75) note(pathname, `title is ${title.length} characters`);

  const description = /<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? "";
  if (description.length < 80 || description.length > 185) {
    note(pathname, `description is ${description.length} characters`);
  }

  const h1Count = [...html.matchAll(/<h1[\s>]/g)].length;
  if (h1Count !== 1) note(pathname, `${h1Count} h1 elements`);

  if (/\bnoindex\b/i.test(html)) note(pathname, "contains noindex");
  if (!/<meta property="og:image"/.test(html)) note(pathname, "no og:image");

  const blocks = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  if (!blocks.length) note(pathname, "no JSON-LD");
  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block[1].replaceAll("\\u003c", "<"));
      if (!parsed["@graph"] && !parsed["@type"]) note(pathname, "JSON-LD has neither @graph nor @type");
    } catch (error) {
      note(pathname, `JSON-LD does not parse: ${error.message}`);
    }
  }

  if (pathname !== "/") {
    const mirror = await fetch(`${base}${pathname}.md`);
    const type = mirror.headers.get("content-type") ?? "";
    if (!mirror.ok) note(`${pathname}.md`, `status ${mirror.status}`);
    else if (!type.includes("text/markdown")) note(`${pathname}.md`, `content-type ${type}`);
    else mirrors++;
  }
}

console.log(`checked ${pages} HTML pages and ${mirrors} Markdown mirrors`);

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log("no problems");
