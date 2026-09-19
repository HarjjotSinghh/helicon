// The weekly scorecard. Pulls Search Console, compares the last 7 days against the 7 before it,
// and prints the handful of numbers worth acting on. No dependencies: it borrows an access token
// from gcloud, which is already authenticated for the Search Console MCP server.
//
//   node scripts/seo-report.mjs              # last 7 days vs the 7 before
//   DAYS=28 node scripts/seo-report.mjs      # any window
//   node scripts/seo-report.mjs --coverage   # also inspect every sitemap URL (slow, ~90s)
//
// Search Console data lags about 2 days, so "yesterday" is usually empty. That is normal.

import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "seo-data");
const HISTORY = join(DATA, "history.csv");

const SITE = process.env.GSC_SITE ?? "https://helicon.sh/";
const DAYS = Number(process.env.DAYS ?? 7);
const WITH_COVERAGE = process.argv.includes("--coverage");
/** --record appends a row to seo-data/history.csv and writes a dated report beside it. */
const RECORD = process.argv.includes("--record");
const GCLOUD = process.env.GCLOUD_BIN ?? "/opt/homebrew/share/google-cloud-sdk/bin/gcloud";

function token() {
  try {
    return execFileSync(GCLOUD, ["auth", "application-default", "print-access-token"], {
      encoding: "utf8",
    }).trim();
  } catch {
    console.error(
      `Could not get a token from ${GCLOUD}.\n` +
        "Run: gcloud auth application-default login --scopes=https://www.googleapis.com/auth/webmasters.readonly,https://www.googleapis.com/auth/cloud-platform",
    );
    process.exit(1);
  }
}

/**
 * A raw bearer token from user credentials is not enough: Google bills these APIs to a quota
 * project, and the client libraries attach it for you. Doing this by hand means sending it too.
 */
function quotaProject() {
  if (process.env.GOOGLE_CLOUD_QUOTA_PROJECT) return process.env.GOOGLE_CLOUD_QUOTA_PROJECT;
  try {
    const adc = JSON.parse(
      readFileSync(join(homedir(), ".config/gcloud/application_default_credentials.json"), "utf8"),
    );
    if (adc.quota_project_id) return adc.quota_project_id;
  } catch {}
  try {
    return execFileSync(GCLOUD, ["config", "get-value", "project"], { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

const project = quotaProject();
const auth = {
  Authorization: `Bearer ${token()}`,
  "Content-Type": "application/json",
  ...(project ? { "x-goog-user-project": project } : {}),
};

const transcript = [];
const print = (line = "") => {
  transcript.push(line);
  console.log(line);
};

/** Search Console reports in the property's own timezone and lags roughly two days. */
function day(offset) {
  return new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10);
}

async function query(body) {
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`,
    { method: "POST", headers: auth, body: JSON.stringify(body) },
  );
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return (await res.json()).rows ?? [];
}

function totals(rows) {
  const t = rows.reduce(
    (acc, r) => ({
      clicks: acc.clicks + r.clicks,
      impressions: acc.impressions + r.impressions,
      posSum: acc.posSum + r.position * r.impressions,
    }),
    { clicks: 0, impressions: 0, posSum: 0 },
  );
  return {
    clicks: t.clicks,
    impressions: t.impressions,
    ctr: t.impressions ? (t.clicks / t.impressions) * 100 : 0,
    position: t.impressions ? t.posSum / t.impressions : 0,
  };
}

function delta(now, before) {
  if (!before) return now ? "  new" : "    0";
  const pct = ((now - before) / before) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(0)}%`.padStart(5);
}

const thisWindow = { startDate: day(DAYS + 2), endDate: day(2) };
const lastWindow = { startDate: day(DAYS * 2 + 2), endDate: day(DAYS + 3) };

print(`Search Console: ${SITE}`);
print(`${thisWindow.startDate} to ${thisWindow.endDate}, against the ${DAYS} days before\n`);

const [nowRows, beforeRows] = await Promise.all([
  query({ ...thisWindow, dimensions: ["date"], rowLimit: 500 }),
  query({ ...lastWindow, dimensions: ["date"], rowLimit: 500 }),
]);
const now = totals(nowRows);
const before = totals(beforeRows);

print("HEADLINE");
print(`  clicks        ${String(now.clicks).padStart(7)}   ${delta(now.clicks, before.clicks)}`);
print(`  impressions   ${String(now.impressions).padStart(7)}   ${delta(now.impressions, before.impressions)}`);
print(`  ctr           ${now.ctr.toFixed(2).padStart(7)}%  ${delta(now.ctr, before.ctr)}`);
print(`  avg position  ${now.position.toFixed(1).padStart(7)}   ${delta(before.position, now.position)} (lower is better)`);

if (!now.impressions) {
  print("\nNo impressions yet. On a property this young that means Google has not started");
  print("serving the pages, not that anything is wrong. Index coverage is the metric to");
  print("watch until this fills in: run with --coverage.\n");
}

const [queries, pages] = await Promise.all([
  query({ ...thisWindow, dimensions: ["query"], rowLimit: 1000 }),
  query({ ...thisWindow, dimensions: ["page"], rowLimit: 1000 }),
]);

if (queries.length) {
  print("\nTOP QUERIES");
  for (const r of queries.slice(0, 15)) {
    print(
      `  ${String(r.clicks).padStart(4)} clicks ${String(r.impressions).padStart(6)} impr  pos ${r.position.toFixed(1).padStart(5)}  ${r.keys[0]}`,
    );
  }

  // Position 4 to 20 with real impressions: one rank improvement here is worth more than a new page.
  const striking = queries
    .filter((r) => r.position >= 4 && r.position <= 20 && r.impressions >= 5)
    .sort((a, b) => b.impressions - a.impressions);
  if (striking.length) {
    print("\nSTRIKING DISTANCE (position 4 to 20, the cheapest wins)");
    for (const r of striking.slice(0, 15)) {
      print(`  pos ${r.position.toFixed(1).padStart(5)} ${String(r.impressions).padStart(6)} impr  ${r.keys[0]}`);
    }
  }

  // High impressions and a low click-through rate means the title and description are the problem.
  const poorCtr = queries
    .filter((r) => r.impressions >= 50 && r.clicks / r.impressions < 0.02 && r.position <= 10)
    .sort((a, b) => b.impressions - a.impressions);
  if (poorCtr.length) {
    print("\nRANKING BUT NOT CLICKED (rewrite the title and description)");
    for (const r of poorCtr.slice(0, 10)) {
      print(
        `  pos ${r.position.toFixed(1).padStart(5)} ${String(r.impressions).padStart(6)} impr  ${(100 * r.clicks / r.impressions).toFixed(1)}% ctr  ${r.keys[0]}`,
      );
    }
  }
}

if (pages.length) {
  print("\nTOP PAGES");
  for (const r of pages.slice(0, 15)) {
    print(
      `  ${String(r.clicks).padStart(4)} clicks ${String(r.impressions).padStart(6)} impr  pos ${r.position.toFixed(1).padStart(5)}  ${new URL(r.keys[0]).pathname}`,
    );
  }
}

const smRes = await fetch(
  `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/sitemaps`,
  { headers: auth },
);
const sitemaps = (await smRes.json()).sitemap ?? [];
print("\nSITEMAPS");
for (const s of sitemaps) {
  const c = s.contents?.[0] ?? {};
  print(
    `  ${s.path}  submitted ${c.submitted ?? "?"}  indexed ${c.indexed ?? "?"}  errors ${s.errors}  warnings ${s.warnings}  last read ${s.lastDownloaded?.slice(0, 10) ?? "never"}`,
  );
}

let coverage = null;
if (WITH_COVERAGE) {
  const xml = await (await fetch(`${SITE}sitemap.xml`)).text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1])
    .filter((u) => !/\.(txt|md|json|xml)$/.test(new URL(u).pathname));

  const buckets = new Map();
  const notIndexed = [];
  for (let i = 0; i < urls.length; i += 6) {
    const results = await Promise.all(
      urls.slice(i, i + 6).map(async (url) => {
        try {
          const r = await fetch("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", {
            method: "POST",
            headers: auth,
            body: JSON.stringify({ inspectionUrl: url, siteUrl: SITE }),
          });
          const d = await r.json();
          return [url, d.inspectionResult?.indexStatusResult?.coverageState ?? "unknown"];
        } catch {
          return [url, "error"];
        }
      }),
    );
    for (const [url, state] of results) {
      buckets.set(state, (buckets.get(state) ?? 0) + 1);
      if (!/^Submitted and indexed$/.test(state)) notIndexed.push([new URL(url).pathname, state]);
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  coverage = {
    total: urls.length,
    indexed: buckets.get("Submitted and indexed") ?? 0,
    discovered: buckets.get("Discovered - currently not indexed") ?? 0,
    unknown: buckets.get("URL is unknown to Google") ?? 0,
  };
  print(`\nINDEX COVERAGE (${urls.length} pages)`);
  for (const [state, n] of [...buckets].sort((a, b) => b[1] - a[1])) {
    print(`  ${String(n).padStart(3)}  ${state}`);
  }
  const unknown = notIndexed.filter(([, s]) => /unknown/i.test(s));
  if (unknown.length) {
    print(`\n  Not yet discovered, request indexing on these first (${unknown.length}):`);
    for (const [p] of unknown.slice(0, 12)) print(`    ${SITE.replace(/\/$/, "")}${p}`);
  }
}

print();

if (RECORD) {
  mkdirSync(join(DATA, "reports"), { recursive: true });

  const sm = sitemaps[0]?.contents?.[0] ?? {};
  const row = {
    recorded: new Date().toISOString().slice(0, 10),
    window_start: thisWindow.startDate,
    window_end: thisWindow.endDate,
    days: DAYS,
    clicks: now.clicks,
    impressions: now.impressions,
    ctr: now.ctr.toFixed(3),
    avg_position: now.position.toFixed(2),
    top_query: queries[0]?.keys[0] ?? "",
    top_page: pages[0] ? new URL(pages[0].keys[0]).pathname : "",
    pages_total: coverage?.total ?? "",
    pages_indexed: coverage?.indexed ?? "",
    pages_discovered: coverage?.discovered ?? "",
    pages_unknown: coverage?.unknown ?? "",
    sitemap_submitted: sm.submitted ?? "",
    sitemap_indexed: sm.indexed ?? "",
  };

  const columns = Object.keys(row);
  // A CSV field can contain a comma or a quote; a query certainly can.
  const escape = (v) => {
    const str = String(v ?? "");
    return /[",\n]/.test(str) ? `"${str.replaceAll('"', '""')}"` : str;
  };
  if (!existsSync(HISTORY)) writeFileSync(HISTORY, `${columns.join(",")}\n`);
  appendFileSync(HISTORY, `${columns.map((c) => escape(row[c])).join(",")}\n`);

  const reportPath = join(DATA, "reports", `${row.recorded}.md`);
  writeFileSync(
    reportPath,
    [
      `# SEO report, ${row.recorded}`,
      "",
      `Window: ${thisWindow.startDate} to ${thisWindow.endDate} (${DAYS} days).`,
      coverage ? "" : "Index coverage not measured. Re-run with --coverage to include it.",
      "",
      "```",
      transcript.join("\n").trimEnd(),
      "```",
      "",
      "## What I changed because of this",
      "",
      "_Write it here or the next report has no baseline to compare against._",
      "",
    ]
      .filter((l) => l !== null)
      .join("\n"),
  );

  console.log(`recorded → seo-data/history.csv`);
  console.log(`report   → seo-data/reports/${row.recorded}.md`);
  console.log(`dashboard: npm run seo:dashboard`);
}
