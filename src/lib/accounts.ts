import "server-only";
import { randomBytes } from "node:crypto";
import { pool } from "./db";
import { slugify } from "./format";

const newHandle = (name: string) => `${slugify(name, 20) || "dev"}-${randomBytes(3).toString("hex").slice(0, 4)}`;

export type Identity = { sub: string; email: string; name: string; picture: string };

/** Existing account for this Google identity, or null. Email only claims an account not yet tied to
 *  a Google ID: a work email can be given to someone new, and they mustn't get the old owner's account. */
export async function findAccount(identity: Identity) {
  const { rows } = await pool().query<{ id: string; google_sub: string | null }>(
    "SELECT id, google_sub FROM users WHERE google_sub = $1 OR (google_sub IS NULL AND lower(email) = $2) ORDER BY (google_sub = $1) DESC NULLS LAST LIMIT 1",
    [identity.sub, identity.email],
  );
  const user = rows[0];
  if (!user) return null;
  if (!user.google_sub) await pool().query("UPDATE users SET google_sub = $2 WHERE id = $1", [user.id, identity.sub]);
  // Keep the Google photo fresh; people can't upload one any other way.
  await pool().query("UPDATE profiles SET photo_url = $2 WHERE user_id = $1", [user.id, identity.picture]);
  return user.id;
}

export async function createAccount(identity: Identity) {
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ id: string }>(
      "INSERT INTO users (email, google_sub) VALUES ($1, $2) RETURNING id",
      [identity.email, identity.sub],
    );
    await client.query(
      "INSERT INTO profiles (user_id, handle, name, photo_url, contact_email, color) VALUES ($1, $2, $3, $4, $5, $6)",
      [rows[0].id, newHandle(identity.name), identity.name.slice(0, 60), identity.picture, identity.email, Math.floor(Math.random() * 4)],
    );
    await client.query("COMMIT");
    return rows[0].id;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
