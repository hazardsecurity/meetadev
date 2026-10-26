import "server-only";
import { Pool, type QueryResultRow } from "pg";

const globalForDb = globalThis as unknown as { pool?: Pool };

function createPool() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
  const local = URL.canParse(url) && ["localhost", "127.0.0.1"].includes(new URL(url).hostname); // the real host, not "@localhost" in a password (BUG-024)
  return new Pool({
    connectionString: url,
    ssl: url.includes("sslmode=") || local ? undefined : true,
    max: 5,
  });
}

export function pool() {
  globalForDb.pool ??= createPool();
  return globalForDb.pool;
}

export async function query<T extends QueryResultRow>(text: string, params: unknown[] = []) {
  const result = await pool().query<T>(text, params);
  return result.rows;
}
