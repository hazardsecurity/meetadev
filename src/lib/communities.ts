import "server-only";
import { cache } from "react";
import type { CommunityLite } from "./community-kinds";
import { tidyCity } from "./cities";
import { pool, query } from "./db";
import { slugify } from "./format";

export type Community = CommunityLite & { status: "active" | "pending" };
const COLS = "c.id, c.slug, c.name, c.kind, c.city, c.country, c.url, c.status";

export function slugifyCommunity(name: string, city: string) {
  return slugify(`${name} ${name.toLowerCase().includes(city.toLowerCase()) ? "" : city}`, 60) || "community";
}

/** Active communities matching a name or city, for the organiser picker. */
export async function searchCommunities(q: string, limit = 12) {
  const term = `%${q.trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  return query<CommunityLite>(
    `SELECT ${COLS} FROM communities c
      WHERE c.status = 'active' AND (c.name ILIKE $1 OR c.city ILIKE $1 OR c.country ILIKE $1)
      ORDER BY (lower(c.name) LIKE lower($2) || '%') DESC, c.name LIMIT $3`,
    [term, q.trim(), limit],
  );
}

export type CommunityWithEvents = CommunityLite & { upcoming: number };

export async function communitiesInCities(cities: string[]) {
  if (!cities.length) return [];
  return query<CommunityWithEvents>(
    `SELECT ${COLS},
            (SELECT count(*)::int FROM events e WHERE e.community_id = c.id AND e.listed
               AND (e.starts_on IS NULL OR e.starts_on >= current_date - 1)) AS upcoming
       FROM communities c
      WHERE c.status = 'active' AND lower(c.city) = ANY($1::text[])
      ORDER BY upcoming DESC, c.kind = 'gdg' DESC, c.name LIMIT 200`,
    [cities.map((c) => c.toLowerCase())],
  );
}

export const communityBySlug = cache(async (slug: string) => {
  const rows = await query<Community>(`SELECT ${COLS} FROM communities c WHERE c.slug = $1`, [slug]);
  return rows[0] ?? null;
});

/** Communities this person organises (approved), for linking events. */
export async function myCommunities(userId: string) {
  return query<CommunityLite>(
    `SELECT ${COLS} FROM communities c JOIN community_organizers o ON o.community_id = c.id
      WHERE o.user_id = $1 AND c.status = 'active' ORDER BY c.name`,
    [userId],
  );
}

/** Communities an event can be linked to: the ones this person organises, the
 *  event's current one, and (for admins) every community in the event's city. */
export async function eventCommunityOptions(userId: string, admin: boolean, event: { community_id: string | null; city: string }) {
  return query<CommunityLite>(
    `SELECT ${COLS} FROM communities c
      WHERE c.status = 'active'
        AND (EXISTS (SELECT 1 FROM community_organizers o WHERE o.community_id = c.id AND o.user_id = $1)
             OR c.id = $2
             OR ($3 AND lower(c.city) = lower(trim(split_part($4, ',', 1)))))
      ORDER BY c.id = $2 DESC, c.kind = 'gdg' DESC, c.name
      LIMIT 200`,
    [userId, event.community_id, admin, event.city],
  );
}

export async function communityCount() {
  const rows = await query<{ n: number }>("SELECT count(*)::int AS n FROM communities WHERE status = 'active'");
  return rows[0].n;
}

export type ImportRow = { name: string; kind: string; city: string; country: string; url: string };

/**
 * Add or update communities in bulk. Matches existing ones by page link (or by
 * slug when there's no link), so importing the same list twice is safe.
 */
export async function importCommunities(rows: ImportRow[], by: string | null) {
  const client = await pool().connect();
  let added = 0, updated = 0;
  try {
    await client.query("BEGIN");
    // One import at a time, so two admins adding the same community can't both pick its slug (BUG-021).
    await client.query("SELECT pg_advisory_xact_lock(hashtext('communities.slug'))");
    for (const r of rows) {
      const city = tidyCity(r.city);
      const slug = slugifyCommunity(r.name, city);
      const existing = await client.query<{ id: string }>(
        r.url ? "SELECT id FROM communities WHERE lower(url) = lower($1)" : "SELECT id FROM communities WHERE slug = $1",
        [r.url || slug],
      );
      if (existing.rows[0]) {
        await client.query("UPDATE communities SET name = $2, kind = $3, city = $4, country = $5, status = 'active' WHERE id = $1", [
          existing.rows[0].id, r.name, r.kind, city, r.country,
        ]);
        updated++;
      } else {
        let unique = slug;
        for (let n = 2; (await client.query("SELECT 1 FROM communities WHERE slug = $1", [unique])).rowCount; n++) unique = `${slug}-${n}`;
        await client.query(
          "INSERT INTO communities (slug, name, kind, city, country, url, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7)",
          [unique, r.name, r.kind, city, r.country, r.url, by],
        );
        added++;
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return { added, updated };
}
