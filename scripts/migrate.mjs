// Applies db/schema.sql. Runs before every build; skips quietly with
// --if-configured when no database is set (e.g. a local build without a DB).
import { readFile } from "node:fs/promises";
import pg from "pg";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  if (process.argv.includes("--if-configured")) {
    console.log("migrate: no DATABASE_URL, skipping");
    process.exit(0);
  }
  console.error("migrate: DATABASE_URL is not set");
  process.exit(1);
}

const local = /@(localhost|127\.0\.0\.1)(:|\/)/.test(url);
const client = new pg.Client({
  connectionString: url,
  ssl: url.includes("sslmode=") || local ? undefined : true,
});
await client.connect();
await client.query(await readFile(new URL("../db/schema.sql", import.meta.url), "utf8"));
await client.end();
console.log("migrate: schema is up to date");
