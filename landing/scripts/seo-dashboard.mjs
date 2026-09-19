// Renders seo-data/*.csv into one self-contained HTML page with charts. No dependencies and no
// network: the SVG is generated here, so the file opens from disk and keeps working offline.
//
//   npm run seo:dashboard
//   open seo-data/dashboard.html

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "seo-data");

/** Minimal CSV reader: handles quoted fields and doubled quotes, which is all these files use. */
function readCsv(name) {
  const path = join(DATA, name);
  if (!existsSync(path)) return [];
  const text = readFileSync(path, "utf8").trim();
  if (!text) return [];
  const rows = [];
  let field = "";
  let row = [];
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [header, ...body] = rows;
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

const history = readCsv("history.csv");
const links = readCsv("links.csv");
const aeo = readCsv("aeo.csv");

const W = 720;
const H = 200;
const PAD = { top: 16, right: 16, bottom: 28, left: 48 };

function lineChart(title, points, { invert = false, format = (n) => n } = {}) {
  const values = points.map((p) => p.y).filter((v) => Number.isFinite(v));
  if (values.length < 1) {
    return `<figure class="chart"><figcaption>${title}</figcaption><p class="empty">No data recorded yet.</p></figure>`;
  }
  const max = Math.max(...values, invert ? 0 : 1);
  const min = invert ? 0 : Math.min(...values, 0);
  const span = max - min || 1;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i) => PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  // An inverted axis is for average position, where a smaller number is a better result.
  const y = (v) => PAD.top + (invert ? ((v - min) / span) * innerH : innerH - ((v - min) / span) * innerH);

  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join(" ");
  const area = `${path} L${x(points.length - 1).toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${x(0).toFixed(1)},${(PAD.top + innerH).toFixed(1)} Z`;
  const ticks = [max, min + span / 2, min].map(
    (v) => `<text class="tick" x="${PAD.left - 8}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${format(Math.round(v * 100) / 100)}</text>`,
  );
  const dots = points.map(
    (p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.y).toFixed(1)}" r="3"><title>${p.x}: ${format(p.y)}</title></circle>`,
  );
  const labels = points.map((p, i) =>
    i === 0 || i === points.length - 1 || points.length < 8
      ? `<text class="tick" x="${x(i).toFixed(1)}" y="${H - 8}" text-anchor="middle">${p.x.slice(5)}</text>`
      : "",
  );
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  const change =
    prev && Number.isFinite(prev.y) && prev.y !== 0
      ? `${((last.y - prev.y) / prev.y) * 100 >= 0 ? "+" : ""}${(((last.y - prev.y) / prev.y) * 100).toFixed(0)}%`
      : "";

  return `<figure class="chart">
  <figcaption>${title} <b>${format(last.y)}</b> <span class="delta">${change}</span></figcaption>
  <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}">
    <path class="area" d="${area}" />
    <path class="line" d="${path}" />
    ${dots.join("")}
    ${ticks.join("")}
    ${labels.join("")}
  </svg>
</figure>`;
}

function table(caption, rows, columns) {
  if (!rows.length) return `<figure class="chart"><figcaption>${caption}</figcaption><p class="empty">Nothing logged yet.</p></figure>`;
  return `<figure class="chart"><figcaption>${caption}</figcaption><table>
  <thead><tr>${columns.map((c) => `<th>${c}</th>`).join("")}</tr></thead>
  <tbody>${rows
    .slice(-20)
    .reverse()
    .map((r) => `<tr>${columns.map((c) => `<td>${r[c] ?? ""}</td>`).join("")}</tr>`)
    .join("")}</tbody>
</table></figure>`;
}

const num = (r, k) => (r[k] === "" || r[k] == null ? NaN : Number(r[k]));
const series = (key) => history.map((r) => ({ x: r.recorded, y: num(r, key) })).filter((p) => Number.isFinite(p.y));

// Answer-engine citation rate across every question and engine logged in a given month.
const aeoByDate = new Map();
for (const r of aeo) {
  const key = r.date;
  const entry = aeoByDate.get(key) ?? { cited: 0, runs: 0 };
  entry.cited += Number(r.cited || 0);
  entry.runs += Number(r.runs || 0);
  aeoByDate.set(key, entry);
}
const aeoSeries = [...aeoByDate]
  .sort()
  .map(([date, v]) => ({ x: date, y: v.runs ? Math.round((v.cited / v.runs) * 1000) / 10 : 0 }));

const latest = history[history.length - 1] ?? {};
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>Helicon SEO dashboard</title>
<style>
  :root {
    --bg: #fbfcfe; --fg: #1b1d20; --muted: #5c6470; --line: #e4e8ee;
    --accent: #0a6ddd; --accent-soft: #0a6ddd1f; --card: #ffffff;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #17181a; --fg: #eff1f3; --muted: #9aa3ae; --line: #2a2d31; --accent: #6aa9f5; --accent-soft: #6aa9f524; --card: #1d1f22; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 32px 16px 64px; background: var(--bg); color: var(--fg); }
  main { max-width: 800px; margin: 0 auto; }
  h1 { font-size: 24px; margin: 0 0 4px; letter-spacing: -0.02em; }
  p.sub { margin: 0 0 28px; color: var(--muted); font-size: 14px; }
  .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 28px; }
  .kpi { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 14px 16px; }
  .kpi b { display: block; font-size: 26px; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
  .kpi span { font-size: 12.5px; color: var(--muted); }
  .chart { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 16px; margin: 0 0 16px; }
  figcaption { font-size: 13px; color: var(--muted); margin-bottom: 8px; }
  figcaption b { color: var(--fg); font-size: 15px; font-variant-numeric: tabular-nums; }
  .delta { color: var(--muted); font-variant-numeric: tabular-nums; }
  svg { width: 100%; height: auto; display: block; }
  .line { fill: none; stroke: var(--accent); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
  .area { fill: var(--accent-soft); stroke: none; }
  circle { fill: var(--accent); }
  .tick { font-size: 10px; fill: var(--muted); font-variant-numeric: tabular-nums; }
  .empty { color: var(--muted); font-size: 13.5px; margin: 8px 0 0; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: left; padding: 6px 8px 6px 0; border-bottom: 1px solid var(--line); }
  th { color: var(--muted); font-weight: 600; }
  footer { margin-top: 32px; font-size: 12.5px; color: var(--muted); }
  code { background: var(--accent-soft); padding: 1px 5px; border-radius: 4px; }
</style>
</head>
<body>
<main>
  <h1>Helicon SEO</h1>
  <p class="sub">Generated from seo-data/. Last recorded ${latest.recorded ?? "never"}.</p>

  <div class="kpis">
    <div class="kpi"><b>${latest.clicks ?? "0"}</b><span>clicks, last window</span></div>
    <div class="kpi"><b>${latest.impressions ?? "0"}</b><span>impressions</span></div>
    <div class="kpi"><b>${latest.avg_position && latest.avg_position !== "0.00" ? latest.avg_position : "-"}</b><span>avg position</span></div>
    <div class="kpi"><b>${latest.pages_indexed || "0"}/${latest.pages_total || "?"}</b><span>pages indexed</span></div>
    <div class="kpi"><b>${links[links.length - 1]?.referring_domains ?? "?"}</b><span>referring domains</span></div>
    <div class="kpi"><b>${aeoSeries[aeoSeries.length - 1]?.y ?? "?"}%</b><span>AI citation rate</span></div>
  </div>

  ${lineChart("Clicks", series("clicks"))}
  ${lineChart("Impressions", series("impressions"))}
  ${lineChart("Average position (lower is better)", series("avg_position"), { invert: true, format: (n) => n.toFixed(1) })}
  ${lineChart("Pages indexed", series("pages_indexed"))}
  ${lineChart("Referring domains", links.map((r) => ({ x: r.date, y: num(r, "referring_domains") })).filter((p) => Number.isFinite(p.y)))}
  ${lineChart("AI citation rate, % of runs", aeoSeries, { format: (n) => `${n}%` })}

  ${table("Answer-engine log, most recent first", aeo, ["date", "engine", "question", "runs", "cited", "url", "accurate"])}
  ${table("Links log", links, ["date", "referring_domains", "backlinks", "domain_rating", "notes"])}

  <footer>
    Weekly: <code>npm run seo:report -- --record --coverage</code>.
    Monthly: fill in <code>seo-data/links.csv</code> and <code>seo-data/aeo.csv</code>, then re-run
    <code>npm run seo:dashboard</code>. Cadence and what each number means: <code>landing/SEO.md</code>.
  </footer>
</main>
</body>
</html>
`;

mkdirSync(DATA, { recursive: true });
writeFileSync(join(DATA, "dashboard.html"), html);
console.log(`dashboard → seo-data/dashboard.html  (${history.length} weekly rows, ${links.length} link rows, ${aeo.length} answer-engine rows)`);
