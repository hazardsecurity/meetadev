import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { pool } from "./db";
import { slugify } from "./format";

const newHandle = (name: string) => `${slugify(name, 20) || "dev"}-${randomBytes(3).toString("hex").slice(0, 4)}`;

export type Identity = { sub: string; email: string; name: string; picture: string };

/** A deleted account keeps this one-way hash of its Google ID, and nothing else that identifies the person. Google ID
 *  only, not email: work addresses get passed to someone new (R-003), and they mustn't inherit the old owner's bans. */
export const erasedKey = (sub: string) => createHash("sha256").update(`google:${sub}`).digest("hex");

/** What outlives a deleted account, for everyone else's safety, and comes back if they return (BUG-019). */
export const KEPT_AFTER_DELETE = [["event_bans", "user_id"], ["blocks", "blocker"], ["blocks", "blocked"], ["reports", "reported"]] as const;

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
    // findAccount found nothing, so any account still holding this email is linked to another Google ID: the
    // address was given to someone new (R-003). It belongs to them now; the old account keeps its data.
    await client.query(
      "UPDATE users SET email = 'retired+' || id || '@meetadev.invalid' WHERE lower(email) = lower($1)",
      [identity.email],
    );
    const { rows } = await client.query<{ id: string }>(
      "INSERT INTO users (email, google_sub) VALUES ($1, $2) RETURNING id",
      [identity.email, identity.sub],
    );
    await client.query(
      "INSERT INTO profiles (user_id, handle, name, photo_url, contact_email, color) VALUES ($1, $2, $3, $4, $5, $6)",
      [rows[0].id, newHandle(identity.name), identity.name.slice(0, 60), identity.picture, identity.email, Math.floor(Math.random() * 4)],
    );
    // Back after deleting their account: their bans, blocks and reports apply again.
    const key = erasedKey(identity.sub);
    for (const [table, column] of KEPT_AFTER_DELETE)
      await client.query(`UPDATE ${table} SET ${column} = $1 WHERE ${column} IN (SELECT id FROM users WHERE erased_key = $2)`, [rows[0].id, key]);
    await client.query("UPDATE users SET erased_key = NULL WHERE erased_key = $1", [key]);
    await client.query("COMMIT");
    return rows[0].id;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
