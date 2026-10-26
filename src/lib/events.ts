import "server-only";
import { randomInt } from "node:crypto";
import { cache } from "react";
import { query } from "./db";
import { slugify } from "./format";

export type Event = {
  id: string;
  slug: string;
  name: string;
  city: string;
  starts_on: string | null;
  about: string;
  join_code: string;
  listed: boolean;
  community_id: string | null;
};

export type MemberRole = "attendee" | "organizer";

const EVENT_COLS = "e.id, e.slug, e.name, e.city, to_char(e.starts_on, 'YYYY-MM-DD') AS starts_on, e.about, e.join_code, e.listed, e.community_id";

// No 0/O/1/I so codes survive being read off a projector.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const randomCode = (n: number) => Array.from({ length: n }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
export const newJoinCode = () => randomCode(6);
// Longer than the join code: it's only ever scanned, and it's what makes someone "here".
export const newCheckinKey = () => randomCode(10);

export const slugifyEvent = (name: string) => slugify(name, 40) || "event";

export const eventBySlug = cache(async (slug: string) => {
  const rows = await query<Event>(`SELECT ${EVENT_COLS} FROM events e WHERE e.slug = $1`, [slug]);
  return rows[0] ?? null;
});

export const membership = cache(async (eventId: string, userId: string) => {
  const rows = await query<{ role: MemberRole }>("SELECT role FROM event_members WHERE event_id = $1 AND user_id = $2", [
    eventId,
    userId,
  ]);
  return rows[0]?.role ?? null;
});

const LAGOS_TODAY = "(now() AT TIME ZONE 'Africa/Lagos')::date";

/** Here, as SQL for an event_members row "m": checked in today (Lagos), and today is the event's date when it
 *  has one. Being here ends with the day (D-005); checked_in_at itself is kept as history. */
export const HERE = (m = "m") =>
  `${m}.checked_in_at >= (date_trunc('day', now() AT TIME ZONE 'Africa/Lagos') AT TIME ZONE 'Africa/Lagos')
   AND coalesce((SELECT starts_on FROM events WHERE id = ${m}.event_id), ${LAGOS_TODAY}) = ${LAGOS_TODAY}`;

/** Here: checked in with the event's check-in code, today. */
export async function isHere(eventId: string, userId: string) {
  const rows = await query(`SELECT 1 FROM event_members m WHERE m.event_id = $1 AND m.user_id = $2 AND ${HERE()}`, [eventId, userId]);
  return rows.length > 0;
}

/** Kept off `Event` so it never reaches a page that isn't the organiser's. */
export async function checkinKey(eventId: string) {
  const rows = await query<{ checkin_key: string }>("SELECT checkin_key FROM events WHERE id = $1", [eventId]);
  return rows[0]?.checkin_key ?? "";
}

export async function isBanned(eventId: string, userId: string) {
  const rows = await query("SELECT 1 FROM event_bans WHERE event_id = $1 AND user_id = $2", [eventId, userId]);
  return rows.length > 0;
}

export type MyEvent = Event & { role: MemberRole; members: number };

export async function myEvents(userId: string) {
  return query<MyEvent>(
    `SELECT ${EVENT_COLS}, m.role,
            (SELECT count(*)::int FROM event_members x WHERE x.event_id = e.id) AS members
       FROM event_members m JOIN events e ON e.id = m.event_id
      WHERE m.user_id = $1
      ORDER BY e.starts_on DESC NULLS LAST, m.joined_at DESC`,
    [userId],
  );
}

/** Today's date in Lagos, as YYYY-MM-DD. */
export const lagosToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date());

/** Upcoming (soonest first, undated last) and past (latest first), by the day in Lagos. */
export function splitByDate<T extends { starts_on: string | null }>(events: T[]) {
  const today = lagosToday();
  const upcoming = events.filter((e) => !e.starts_on || e.starts_on >= today)
    .sort((a, b) => (a.starts_on ?? "9999").localeCompare(b.starts_on ?? "9999"));
  const past = events.filter((e) => e.starts_on && e.starts_on < today);
  return { upcoming, past };
}

/** Every event, newest first, for the admin page. */
export async function allEvents() {
  return query<Event & { members: number; organiser: string | null }>(
    `SELECT ${EVENT_COLS},
            (SELECT count(*)::int FROM event_members m WHERE m.event_id = e.id) AS members,
            (SELECT u.email FROM users u WHERE u.id = e.created_by) AS organiser
       FROM events e
      ORDER BY e.created_at DESC
      LIMIT 300`,
  );
}

/** Events two people were both Here at, in the order they were there together. */
export async function eventsTogether(a: string, b: string) {
  return query<{ id: string; slug: string; name: string; at: Date }>(
    `SELECT e.id, e.slug, e.name, greatest(x.checked_in_at, y.checked_in_at) AS at
       FROM event_members x JOIN event_members y ON y.event_id = x.event_id JOIN events e ON e.id = x.event_id
      WHERE x.user_id = $1 AND y.user_id = $2 AND x.checked_in_at IS NOT NULL AND y.checked_in_at IS NOT NULL
      ORDER BY at`,
    [a, b],
  );
}

/** The latest event two people are both Here at right now, or null: where a "We met" counts. */
export async function hereTogether(a: string, b: string) {
  const rows = await query<{ id: string; slug: string; name: string }>(
    `SELECT e.id, e.slug, e.name
       FROM event_members x JOIN event_members y ON y.event_id = x.event_id JOIN events e ON e.id = x.event_id
      WHERE x.user_id = $1 AND y.user_id = $2 AND ${HERE("x")} AND ${HERE("y")}
      ORDER BY greatest(x.checked_in_at, y.checked_in_at) DESC LIMIT 1`,
    [a, b],
  );
  return rows[0] ?? null;
}

export async function hereCount(eventId: string) {
  const rows = await query<{ n: number }>(`SELECT count(*)::int AS n FROM event_members m WHERE m.event_id = $1 AND ${HERE()}`, [eventId]);
  return rows[0].n;
}

export async function memberCount(eventId: string) {
  const rows = await query<{ n: number }>("SELECT count(*)::int AS n FROM event_members WHERE event_id = $1", [eventId]);
  return rows[0].n;
}

// ---------------------------------------------------------------------------
// Organiser views

export type MemberRow = {
  user_id: string;
  handle: string;
  name: string;
  headline: string;
  photo_url: string;
  color: number;
  role: MemberRole;
  joined_at: Date;
  checked_in_at: Date | null;
  met: number;
  onboarded: boolean;
};

/** Met, as SQL: "a" is a row in meetings, and it counts once the other person's row exists too. */
export const CONFIRMED = `EXISTS (SELECT 1 FROM meetings b WHERE b.event_id = a.event_id AND b.from_user = a.to_user AND b.to_user = a.from_user)`;

export async function members(eventId: string) {
  return query<MemberRow>(
    `SELECT p.user_id, p.handle, p.name, p.headline, p.photo_url, p.color, m.role, m.joined_at, m.checked_in_at, p.onboarded,
            (SELECT count(*)::int FROM meetings a WHERE a.event_id = $1 AND a.from_user = m.user_id AND ${CONFIRMED}) AS met
       FROM event_members m JOIN profiles p ON p.user_id = m.user_id
      WHERE m.event_id = $1
      ORDER BY (m.role = 'organizer') DESC, m.checked_in_at DESC NULLS LAST, m.joined_at DESC`,
    [eventId],
  );
}

/** The funnel: people at each step of the loop, plus matches and meetings as pairs. */
export async function eventStats(eventId: string) {
  const rows = await query<{ joined: number; here: number; swiped: number; matched: number; met: number; matches: number; meetings: number }>(
    `SELECT
       (SELECT count(*)::int FROM event_members WHERE event_id = $1) AS joined,
       (SELECT count(*)::int FROM event_members WHERE event_id = $1 AND checked_in_at IS NOT NULL) AS here,
       -- Whoever made a want mutual chose Meet too, but has no row of their own: count them via to_user.
       (SELECT count(*)::int FROM (SELECT from_user FROM passes WHERE event_id = $1
                                    UNION SELECT from_user FROM connection_requests WHERE event_id = $1
                                    UNION SELECT to_user FROM connection_requests WHERE event_id = $1 AND status = 'accepted') s) AS swiped,
       (SELECT count(*)::int FROM (SELECT from_user AS u FROM connection_requests WHERE event_id = $1 AND status = 'accepted'
                                    UNION SELECT to_user FROM connection_requests WHERE event_id = $1 AND status = 'accepted') s) AS matched,
       (SELECT count(DISTINCT a.from_user)::int FROM meetings a WHERE a.event_id = $1 AND ${CONFIRMED}) AS met,
       (SELECT count(*)::int FROM connection_requests WHERE event_id = $1 AND status = 'accepted') AS matches,
       (SELECT (count(*) / 2)::int FROM meetings a WHERE a.event_id = $1 AND ${CONFIRMED}) AS meetings`,
    [eventId],
  );
  return rows[0];
}

export type ReportRow = {
  id: string;
  reason: string;
  created_at: Date;
  reported_id: string;
  reported_name: string;
  reported_handle: string | null; // null once the reported person has deleted their account
  reporter_name: string;
};

export async function eventReports(eventId: string) {
  return query<ReportRow>(
    `SELECT r.id, r.reason, r.created_at, r.reported AS reported_id,
            coalesce(rp.name, 'A deleted account') AS reported_name, rp.handle AS reported_handle,
            coalesce(ap.name, 'Someone who deleted their account') AS reporter_name
       FROM reports r
       LEFT JOIN profiles rp ON rp.user_id = r.reported
       LEFT JOIN profiles ap ON ap.user_id = r.reporter
      WHERE r.event_id = $1
      ORDER BY r.created_at DESC LIMIT 100`,
    [eventId],
  );
}

// ---------------------------------------------------------------------------
// Discovery: listed events in the cities someone follows.

export type DiscoverEvent = Event & { members: number; is_member: boolean };

export async function eventsInCities(cities: string[], viewerId: string | null) {
  if (!cities.length) return [];
  return query<DiscoverEvent>(
    `SELECT ${EVENT_COLS},
            (SELECT count(*)::int FROM event_members x WHERE x.event_id = e.id) AS members,
            EXISTS (SELECT 1 FROM event_members x WHERE x.event_id = e.id AND x.user_id = $2) AS is_member
       FROM events e
      WHERE e.listed AND lower(e.city) = ANY($1::text[])
        AND (e.starts_on IS NULL OR e.starts_on >= current_date - 1)
      ORDER BY e.starts_on ASC NULLS LAST, e.created_at DESC
      LIMIT 100`,
    [cities.map((c) => c.toLowerCase()), viewerId],
  );
}

/** Cities that have listed events, most active first, for suggestions. */
export async function knownCities() {
  const rows = await query<{ city: string }>(
    `SELECT min(city) AS city FROM events WHERE listed AND city <> ''
      GROUP BY lower(city) ORDER BY count(*) DESC, min(city) LIMIT 200`,
  );
  return rows.map((r) => r.city);
}

// ---------------------------------------------------------------------------
// Leaderboard: people met in person at this event (both tapped We met), per person.
// People hidden from the directory are left off.

export type LeaderRow = {
  user_id: string;
  name: string;
  handle: string;
  headline: string;
  photo_url: string;
  color: number;
  met: number;
  rank: number;
};

const LEADER_CTE = `
  WITH c AS (
    SELECT a.from_user AS u FROM meetings a WHERE a.event_id = $1 AND ${CONFIRMED}
  ), scored AS (
    SELECT p.user_id, p.name, p.handle, p.headline, p.photo_url, p.color, count(*)::int AS met
      FROM c
      JOIN profiles p ON p.user_id = c.u
      JOIN event_members m ON m.event_id = $1 AND m.user_id = c.u
     WHERE p.listed
     GROUP BY p.user_id
  ), ranked AS (
    SELECT *, rank() OVER (ORDER BY met DESC)::int AS rank FROM scored
  )`;

/** The board as one person sees it: people they've blocked, or who blocked them, aren't on it (R-045). */
export async function leaderboard(eventId: string, viewerId: string, limit = 50) {
  return query<LeaderRow>(
    `${LEADER_CTE} SELECT * FROM ranked
      WHERE NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker = $3 AND b.blocked = ranked.user_id) OR (b.blocker = ranked.user_id AND b.blocked = $3))
      ORDER BY rank, name LIMIT $2`,
    [eventId, limit, viewerId],
  );
}

export async function myStanding(eventId: string, userId: string) {
  const rows = await query<LeaderRow>(`${LEADER_CTE} SELECT * FROM ranked WHERE user_id = $2`, [eventId, userId]);
  return rows[0] ?? null;
}
