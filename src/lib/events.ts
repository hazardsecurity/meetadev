import "server-only";
import { randomInt } from "node:crypto";
import { cache } from "react";
import { query } from "./db";

export type Event = {
  id: string;
  slug: string;
  name: string;
  city: string;
  starts_on: string | null;
  about: string;
  join_code: string;
  require_code: boolean;
};

export type MemberRole = "attendee" | "organizer";

const EVENT_COLS = "e.id, e.slug, e.name, e.city, to_char(e.starts_on, 'YYYY-MM-DD') AS starts_on, e.about, e.join_code, e.require_code";

// No 0/O/1/I so codes survive being read off a projector.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const newJoinCode = () => Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");

export function slugifyEvent(name: string) {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return base || "event";
}

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

export async function memberCount(eventId: string) {
  const rows = await query<{ n: number }>("SELECT count(*)::int AS n FROM event_members WHERE event_id = $1", [eventId]);
  return rows[0].n;
}

/** Do these two people share at least one event? Requests are only allowed between them. */
export async function shareAnEvent(a: string, b: string) {
  const rows = await query(
    `SELECT 1 FROM event_members x JOIN event_members y ON x.event_id = y.event_id
      WHERE x.user_id = $1 AND y.user_id = $2 LIMIT 1`,
    [a, b],
  );
  return rows.length > 0;
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
  onboarded: boolean;
};

export async function members(eventId: string) {
  return query<MemberRow>(
    `SELECT p.user_id, p.handle, p.name, p.headline, p.photo_url, p.color, m.role, m.joined_at, p.onboarded
       FROM event_members m JOIN profiles p ON p.user_id = m.user_id
      WHERE m.event_id = $1
      ORDER BY (m.role = 'organizer') DESC, m.joined_at DESC`,
    [eventId],
  );
}

export async function eventStats(eventId: string) {
  const rows = await query<{ members: number; connections: number; pending: number; mentors: number; mentees: number }>(
    `SELECT
       (SELECT count(*)::int FROM event_members WHERE event_id = $1) AS members,
       (SELECT count(*)::int FROM connection_requests WHERE event_id = $1 AND status = 'accepted') AS connections,
       (SELECT count(*)::int FROM connection_requests WHERE event_id = $1 AND status = 'pending') AS pending,
       (SELECT count(*)::int FROM event_members m JOIN profiles p ON p.user_id = m.user_id
         WHERE m.event_id = $1 AND 'mentoring' = ANY(p.intents)) AS mentors,
       (SELECT count(*)::int FROM event_members m JOIN profiles p ON p.user_id = m.user_id
         WHERE m.event_id = $1 AND 'mentor_wanted' = ANY(p.intents)) AS mentees`,
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
  reported_handle: string;
  reporter_name: string;
};

export async function eventReports(eventId: string) {
  return query<ReportRow>(
    `SELECT r.id, r.reason, r.created_at, r.reported AS reported_id,
            rp.name AS reported_name, rp.handle AS reported_handle, ap.name AS reporter_name
       FROM reports r
       JOIN profiles rp ON rp.user_id = r.reported
       JOIN profiles ap ON ap.user_id = r.reporter
      WHERE r.event_id = $1
      ORDER BY r.created_at DESC LIMIT 100`,
    [eventId],
  );
}
