// Bulk-import communities from JSON files ([{ name, city, country?, url?, kind? }]) or TSV files
// ("name<TAB>city" per line; campus names like "GDG on Campus X - City, Country" carry their own place).
// Upserts by link (or by slug when there's no link), so re-running is safe.
// Usage: node --env-file=<env file with DATABASE_URL> scripts/import-communities.mjs <file.json|file.tsv>... [--dry-run]
//   --once=<key>     import only if this key hasn't run before (used by prebuild to seed once)
//   --if-configured  skip quietly when no database is set
import { readFile } from "node:fs/promises";
import pg from "pg";

const args = process.argv.slice(2);
const dry = args.includes("--dry-run");
const once = args.find((a) => a.startsWith("--once="))?.slice(7);
const files = args.filter((a) => !a.startsWith("--"));
if (!files.length) { console.error("usage: import-communities.mjs <file.json|file.tsv>... [--dry-run]"); process.exit(1); }

const tidyCity = (raw) =>
  raw.trim().replace(/\s+/g, " ").toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, s, c) => s + c.toUpperCase()).slice(0, 60);
const slugPart = (s) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
// Keep the city in long slugs: trim the name part, not the place.
const slugify = (name, city) => {
  const place = name.toLowerCase().includes(city.toLowerCase()) ? "" : slugPart(city).slice(0, 20);
  const base = slugPart(name).slice(0, 60 - (place ? place.length + 1 : 0)).replace(/-$/, "");
  return [base, place].filter(Boolean).join("-") || "community";
};
const kindOf = (name) =>
  /on campus|gdsc|student/i.test(name) ? "gdsc" : /\bwtm\b|women techmakers/i.test(name) ? "wtm" : /^gdg\b/i.test(name) ? "gdg" : "other";

/** "GDG on Campus X - City, Country" → { city, country }; otherwise the TAB city. */
function tsvRow(line) {
  const [name, tabCity = ""] = line.split("\t").map((c) => c.trim());
  const place = name.match(/ [-–] ([^,–]+),\s*([^,]+)$/);
  if (place) return { name: name.slice(0, place.index).trim(), city: place[1], country: place[2] };
  const parts = tabCity.split(",").map((p) => p.trim()).filter(Boolean);
  return { name, city: parts[0] ?? "", country: parts.length > 1 ? parts.at(-1) : "" };
}

const raw = [];
for (const file of files) {
  const text = await readFile(file, "utf8");
  if (file.endsWith(".tsv")) raw.push(...text.split(/\r?\n/).filter((l) => l.trim()).map(tsvRow));
  else raw.push(...JSON.parse(text));
}

const seen = new Set();
const rows = raw
  .map((r) => ({ name: String(r.name ?? "").trim().slice(0, 120), city: tidyCity(String(r.city ?? "")), country: String(r.country ?? "").trim().slice(0, 60), url: String(r.url ?? "").trim(), kind: r.kind ?? kindOf(String(r.name ?? "")) }))
  .filter((r) => r.name.length >= 2 && r.city.length >= 2)
  .filter((r) => { const k = `${r.name.toLowerCase()}|${r.city.toLowerCase()}`; return seen.has(k) ? false : (seen.add(k), true); });

console.log(`${rows.length} rows · ${Object.entries(rows.reduce((a, r) => ((a[r.kind] = (a[r.kind] ?? 0) + 1), a), {})).map(([k, n]) => `${k} ${n}`).join(", ")}`);
if (dry) {
  const sample = rows.filter((r) => /ilorin|lagos|nairobi|bengaluru/i.test(r.city)).slice(0, 8);
  console.table([...rows.slice(0, 3), ...sample, ...rows.slice(-3)].map(({ name, kind, city, country }) => ({ name, kind, city, country })));
  process.exit(0);
}

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  if (args.includes("--if-configured")) { console.log("import: no DATABASE_URL, skipping"); process.exit(0); }
  console.error("DATABASE_URL is not set"); process.exit(1);
}
const local = URL.canParse(url) && ["localhost", "127.0.0.1"].includes(new URL(url).hostname); // the real host, not "@localhost" in a password (BUG-024)
const client = new pg.Client({ connectionString: url, ssl: url.includes("sslmode=") || local ? undefined : true });
await client.connect();
let added = 0, updated = 0;
try {
  await client.query("BEGIN");
  if (once) {
    await client.query("CREATE TABLE IF NOT EXISTS seed_runs (key text PRIMARY KEY, ran_at timestamptz NOT NULL DEFAULT now())");
    const fresh = await client.query("INSERT INTO seed_runs (key) VALUES ($1) ON CONFLICT DO NOTHING", [once]);
    if (!fresh.rowCount) { console.log(`import: ${once} already ran, skipping`); rows.length = 0; }
  }
  for (const r of rows) {
    const slug = slugify(r.name, r.city);
    const found = r.url
      ? await client.query("SELECT id FROM communities WHERE lower(url) = lower($1)", [r.url])
      : await client.query("SELECT id FROM communities WHERE lower(name) = lower($1) AND lower(city) = lower($2)", [r.name, r.city]);
    if (found.rows[0]) {
      await client.query("UPDATE communities SET name = $2, kind = $3, city = $4, country = COALESCE(NULLIF($5, ''), country), status = 'active' WHERE id = $1", [found.rows[0].id, r.name, r.kind, r.city, r.country]);
      updated++;
    } else {
      let unique = slug;
      for (let n = 2; (await client.query("SELECT 1 FROM communities WHERE slug = $1", [unique])).rowCount; n++) unique = `${slug}-${n}`;
      await client.query("INSERT INTO communities (slug, name, kind, city, country, url) VALUES ($1, $2, $3, $4, $5, $6)", [unique, r.name, r.kind, r.city, r.country, r.url]);
      added++;
    }
  }
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
console.log(`added ${added}, updated ${updated}`);
