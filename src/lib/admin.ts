import "server-only";
import { POSTHOG_KEY, POSTHOG_REGION } from "./analytics-config";
import { notFound } from "next/navigation";
import { requireMember } from "./auth";
import { query } from "./db";
import { CONFIRMED } from "./events";
import { isAdmin } from "./organizers";

/** Every admin page and action starts here: signed in, onboarded, and listed in ADMIN_EMAILS. */
export async function requireAdmin(next = "/admin") {
  const me = await requireMember(next);
  if (!isAdmin(me)) notFound();
  return me;
}

/** Record an admin action. Never throws: the action itself already happened. */
export async function logAdmin(admin: { id: string; email: string }, action: string, target = "", detail = "") {
  await query("INSERT INTO admin_log (admin_id, admin_email, action, target, detail) VALUES ($1, $2, $3, $4, $5)", [
    admin.id, admin.email, action, target.slice(0, 200), detail.slice(0, 500),
  ]).catch((error) => console.error("admin_log failed", error));
}

// ---------------------------------------------------------------------------
// Overview

export type Overview = {
  users: number; onboarded: number; new_7d: number; new_30d: number; suspended: number; active_7d: number;
  events: number; upcoming: number; today: number; memberships: number;
  wants: number; matches: number; meetings: number; messages: number; messages_7d: number;
  open_reports: number; pending_apps: number; organisers: number; communities: number; pending_communities: number; push_devices: number;
};

export async function overview() {
  const rows = await query<Overview>(
    `SELECT
       (SELECT count(*)::int FROM users u WHERE u.email NOT LIKE 'deleted+%@meetadev.invalid') AS users,
       (SELECT count(*)::int FROM profiles WHERE onboarded) AS onboarded,
       (SELECT count(*)::int FROM users WHERE created_at > now() - interval '7 days' AND email NOT LIKE 'deleted+%') AS new_7d,
       (SELECT count(*)::int FROM users WHERE created_at > now() - interval '30 days' AND email NOT LIKE 'deleted+%') AS new_30d,
       (SELECT count(*)::int FROM users WHERE suspended_at IS NOT NULL) AS suspended,
       (SELECT count(DISTINCT user_id)::int FROM sessions WHERE created_at > now() - interval '7 days') AS active_7d,
       (SELECT count(*)::int FROM events) AS events,
       (SELECT count(*)::int FROM events WHERE starts_on >= current_date) AS upcoming,
       (SELECT count(*)::int FROM events WHERE starts_on = current_date) AS today,
       (SELECT count(*)::int FROM event_members) AS memberships,
       (SELECT count(*)::int FROM connection_requests WHERE status = 'pending') AS wants,
       (SELECT count(*)::int FROM connection_requests WHERE status = 'accepted') AS matches,
       (SELECT (count(*) / 2)::int FROM meetings a WHERE ${CONFIRMED}) AS meetings,
       (SELECT count(*)::int FROM messages) AS messages,
       (SELECT count(*)::int FROM messages WHERE created_at > now() - interval '7 days') AS messages_7d,
       (SELECT count(*)::int FROM reports WHERE resolved_at IS NULL) AS open_reports,
       (SELECT count(*)::int FROM organizer_requests WHERE status = 'pending') AS pending_apps,
       (SELECT count(*)::int FROM users WHERE can_create_events) AS organisers,
       (SELECT count(*)::int FROM communities WHERE status = 'active') AS communities,
       (SELECT count(*)::int FROM communities WHERE status = 'pending') AS pending_communities,
       (SELECT count(*)::int FROM push_subscriptions) AS push_devices`,
  );
  return rows[0];
}

/** New accounts per day for the last `days` days, oldest first (days with none included). */
export async function signupsByDay(days = 14) {
  return query<{ day: string; n: number }>(
    `SELECT to_char(d, 'YYYY-MM-DD') AS day, count(u.id)::int AS n
       FROM generate_series(current_date - ($1::int - 1), current_date, interval '1 day') d
       LEFT JOIN users u ON u.created_at >= d AND u.created_at < d + interval '1 day' AND u.email NOT LIKE 'deleted+%'
      GROUP BY d ORDER BY d`,
    [days],
  );
}

// ---------------------------------------------------------------------------
// Users

export type AdminUser = {
  id: string; email: string; name: string | null; handle: string | null; photo_url: string | null; color: number | null;
  created_at: Date; onboarded: boolean; suspended_at: Date | null; suspended_reason: string; can_create_events: boolean;
  last_seen: Date | null; events: number; connections: number; met: number; reports_against: number;
};

export const USER_FILTERS = ["all", "new", "organisers", "reported", "suspended", "unfinished"] as const;
export type UserFilter = (typeof USER_FILTERS)[number];

export async function adminUsers(q: string, filter: UserFilter, page: number, perPage = 50) {
  const where = ["u.email NOT LIKE 'deleted+%@meetadev.invalid'"];
  const params: unknown[] = [];
  if (q) {
    params.push(`%${q}%`);
    where.push(`(u.email ILIKE $${params.length} OR p.name ILIKE $${params.length} OR p.handle ILIKE $${params.length})`);
  }
  if (filter === "new") where.push("u.created_at > now() - interval '7 days'");
  if (filter === "organisers") where.push("u.can_create_events");
  if (filter === "suspended") where.push("u.suspended_at IS NOT NULL");
  if (filter === "unfinished") where.push("NOT coalesce(p.onboarded, false)");
  if (filter === "reported") where.push("EXISTS (SELECT 1 FROM reports r WHERE r.reported = u.id AND r.resolved_at IS NULL)");
  params.push(perPage + 1, page * perPage);
  const rows = await query<AdminUser>(
    `SELECT u.id, u.email, p.name, p.handle, p.photo_url, p.color, u.created_at, coalesce(p.onboarded, false) AS onboarded,
            u.suspended_at, u.suspended_reason, u.can_create_events,
            (SELECT max(s.created_at) FROM sessions s WHERE s.user_id = u.id) AS last_seen,
            (SELECT count(*)::int FROM event_members m WHERE m.user_id = u.id) AS events,
            (SELECT count(*)::int FROM connection_requests c WHERE c.status = 'accepted' AND (c.from_user = u.id OR c.to_user = u.id)) AS connections,
            (SELECT count(*)::int FROM meetings a WHERE a.from_user = u.id AND ${CONFIRMED}) AS met,
            (SELECT count(*)::int FROM reports r WHERE r.reported = u.id AND r.resolved_at IS NULL) AS reports_against
       FROM users u LEFT JOIN profiles p ON p.user_id = u.id
      WHERE ${where.join(" AND ")}
      ORDER BY u.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return { users: rows.slice(0, perPage), hasMore: rows.length > perPage };
}

/** Everything meetadev holds about one person, for a data access request (the privacy policy promises it). */
export async function exportUser(userId: string) {
  const [user] = await query("SELECT id, email, created_at, suspended_at, suspended_reason, can_create_events FROM users WHERE id = $1", [userId]);
  if (!user) return null;
  const [profile, events, wants, passes, meetings, messages, blocks, reportsMade, applications, devices] = await Promise.all([
    query("SELECT * FROM profiles WHERE user_id = $1", [userId]),
    query("SELECT e.name, e.slug, m.role, m.joined_at, m.checked_in_at FROM event_members m JOIN events e ON e.id = m.event_id WHERE m.user_id = $1", [userId]),
    query("SELECT to_user, status, event_id, created_at, responded_at FROM connection_requests WHERE from_user = $1", [userId]),
    query("SELECT to_user, event_id, created_at FROM passes WHERE from_user = $1", [userId]),
    query("SELECT to_user, event_id, created_at FROM meetings WHERE from_user = $1", [userId]),
    query("SELECT from_user, to_user, body, created_at, delivered_at, read_at FROM messages WHERE from_user = $1 OR to_user = $1 ORDER BY created_at", [userId]),
    query("SELECT blocked, created_at FROM blocks WHERE blocker = $1", [userId]),
    query("SELECT reported, reason, created_at FROM reports WHERE reporter = $1", [userId]),
    query("SELECT chapter_name, chapter_url, city, note, status, created_at FROM organizer_requests WHERE user_id = $1", [userId]),
    query("SELECT created_at FROM push_subscriptions WHERE user_id = $1", [userId]),
  ]);
  return {
    exported_at: new Date().toISOString(),
    account: user, profile: profile[0] ?? null, events, wants_to_meet: wants, passes, we_met: meetings,
    messages, blocked: blocks, reports_made: reportsMade, organiser_applications: applications, notification_devices: devices.length,
  };
}

// ---------------------------------------------------------------------------
// Moderation

export type AdminReport = {
  id: string; reason: string; created_at: Date;
  reporter_id: string; reporter_name: string | null; reporter_handle: string | null;
  reported_id: string; reported_name: string | null; reported_handle: string | null; reported_email: string;
  reported_suspended: boolean; event_name: string | null; event_slug: string | null; against_total: number;
};

export async function openReports() {
  return query<AdminReport>(
    `SELECT r.id, r.reason, r.created_at,
            r.reporter AS reporter_id, rp.name AS reporter_name, rp.handle AS reporter_handle,
            r.reported AS reported_id, dp.name AS reported_name, dp.handle AS reported_handle, du.email AS reported_email,
            du.suspended_at IS NOT NULL AS reported_suspended, e.name AS event_name, e.slug AS event_slug,
            (SELECT count(*)::int FROM reports x WHERE x.reported = r.reported AND x.resolved_at IS NULL) AS against_total
       FROM reports r
       JOIN users du ON du.id = r.reported
       LEFT JOIN profiles rp ON rp.user_id = r.reporter
       LEFT JOIN profiles dp ON dp.user_id = r.reported
       LEFT JOIN events e ON e.id = r.event_id
      WHERE r.resolved_at IS NULL
      ORDER BY against_total DESC, r.created_at DESC
      LIMIT 200`,
  );
}

// ---------------------------------------------------------------------------
// Communities, events, system

export async function pendingCommunities() {
  return query<{ id: string; slug: string; name: string; kind: string; city: string; country: string; url: string; created_at: Date; by_name: string | null; by_email: string | null }>(
    `SELECT c.id, c.slug, c.name, c.kind, c.city, c.country, c.url, c.created_at, p.name AS by_name, u.email AS by_email
       FROM communities c LEFT JOIN users u ON u.id = c.created_by LEFT JOIN profiles p ON p.user_id = c.created_by
      WHERE c.status = 'pending' ORDER BY c.created_at DESC`,
  );
}

export type AdminEvent = {
  id: string; slug: string; name: string; city: string; starts_on: string | null; listed: boolean; created_at: Date;
  organiser: string | null; members: number; matches: number; meetings: number; reports: number;
};

export async function adminEvents(when: "upcoming" | "past" | "all", q: string) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (when === "upcoming") where.push("(e.starts_on IS NULL OR e.starts_on >= current_date)");
  if (when === "past") where.push("e.starts_on < current_date");
  if (q) { params.push(`%${q}%`); where.push(`(e.name ILIKE $${params.length} OR e.city ILIKE $${params.length})`); }
  return query<AdminEvent>(
    `SELECT e.id, e.slug, e.name, e.city, to_char(e.starts_on, 'YYYY-MM-DD') AS starts_on, e.listed, e.created_at,
            (SELECT u.email FROM users u WHERE u.id = e.created_by) AS organiser,
            (SELECT count(*)::int FROM event_members m WHERE m.event_id = e.id) AS members,
            (SELECT count(*)::int FROM connection_requests c WHERE c.event_id = e.id AND c.status = 'accepted') AS matches,
            (SELECT (count(*) / 2)::int FROM meetings a WHERE a.event_id = e.id AND ${CONFIRMED}) AS meetings,
            (SELECT count(*)::int FROM reports r WHERE r.event_id = e.id AND r.resolved_at IS NULL) AS reports
       FROM events e ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY e.starts_on DESC NULLS FIRST, e.created_at DESC
      LIMIT 300`,
    params,
  );
}

export async function adminLog(limit = 100) {
  return query<{ id: string; admin_email: string; action: string; target: string; detail: string; created_at: Date }>(
    "SELECT id, admin_email, action, target, detail, created_at FROM admin_log ORDER BY created_at DESC LIMIT $1",
    [limit],
  );
}

export async function seedRuns() {
  return query<{ key: string; ran_at: Date }>("SELECT key, ran_at FROM seed_runs ORDER BY ran_at DESC");
}

/** Which settings are configured, by name only: values never leave the server. */
export function configStatus() {
  const set = (k: string) => Boolean(process.env[k]);
  return [
    { name: "Database", key: "DATABASE_URL", ok: set("DATABASE_URL") },
    { name: "Google sign-in", key: "GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET", ok: set("GOOGLE_CLIENT_ID") && set("GOOGLE_CLIENT_SECRET") },
    { name: "Push notifications", key: "NEXT_PUBLIC_VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY", ok: set("NEXT_PUBLIC_VAPID_PUBLIC_KEY") && set("VAPID_PRIVATE_KEY") },
    { name: "Admins", key: "ADMIN_EMAILS", ok: set("ADMIN_EMAILS"), note: `${(process.env.ADMIN_EMAILS ?? "").split(",").filter((e) => e.trim()).length} listed` },
    { name: "Site address", key: "APP_URL", ok: set("APP_URL") },
    { name: "Analytics (PostHog)", key: "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN", ok: true, note: POSTHOG_KEY ? `On, ${POSTHOG_REGION.toUpperCase()} region` : "Off: no token set" },
    { name: "Venue check-in", key: "CHECKIN_REQUIRED", ok: true, note: process.env.CHECKIN_REQUIRED === "1" ? "On: people scan a code at the venue" : "Off: joining is enough" },
  ];
}
