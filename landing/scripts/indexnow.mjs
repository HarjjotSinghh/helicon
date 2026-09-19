// Tells IndexNow (Bing, Yandex, Seznam, Naver and anyone else on the protocol) that URLs changed.
// Google does not participate; for Google, the sitemap plus Search Console is the path.
//
//   node scripts/indexnow.mjs               # submit every URL in the sitemap
//   node scripts/indexnow.mjs /pricing /faq # submit specific paths
//
// The key file must be reachable at https://<host>/<key>.txt and contain exactly the key.
import { readdirSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const host = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://helicon.sh").replace(/\/$/, "");
const hostname = new URL(host).hostname;

function findKey() {
  if (process.env.INDEXNOW_KEY) return process.env.INDEXNOW_KEY;
  const file = readdirSync(join(root, "public")).find((name) => /^[0-9a-f]{32}\.txt$/.test(name));
  if (!file) throw new Error("No IndexNow key file in public/. Set INDEXNOW_KEY or add <key>.txt.");
  return file.replace(/\.txt$/, "");
}

async function sitemapUrls() {
  const res = await fetch(`${host}/sitemap.xml`);
  if (!res.ok) throw new Error(`Could not read ${host}/sitemap.xml: ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

const key = findKey();
const args = process.argv.slice(2);
const urlList = args.length ? args.map((path) => `${host}${path.startsWith("/") ? path : `/${path}`}`) : await sitemapUrls();

// IndexNow accepts up to 10,000 URLs per request. This site will not get close.
const body = { host: hostname, key, keyLocation: `${host}/${key}.txt`, urlList };

const res = await fetch("https://api.indexnow.org/IndexNow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(body),
});

console.log(`IndexNow: ${res.status} ${res.statusText} for ${urlList.length} URL(s)`);
if (!res.ok) {
  console.log(await res.text());
  process.exitCode = 1;
}
