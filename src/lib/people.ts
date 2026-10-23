import "server-only";
import { query } from "./db";
import { intent, roleLabel } from "./options";

export type PublicProfile = {
  user_id: string;
  handle: string;
  name: string;
  headline: string;
  bio: string;
  role: string;
  level: string;
  intents: string[];
  stack: string[];
  linkedin: string;
  github: string;
  x_handle: string;
  website: string;
  color: number;
  photo_url: string;
};

export type Contact = { whatsapp: string; phone: string; contact_email: string };

export type Relation = "self" | "none" | "outgoing" | "incoming" | "connected";

export type Person = PublicProfile & { relation: Relation; request_id: string | null };

const PUBLIC_COLS = `p.user_id, p.handle, p.name, p.headline, p.bio, p.role, p.level, p.intents, p.stack,
  p.linkedin, p.github, p.x_handle, p.website, p.color, p.photo_url`;

// Relation of profile p to $1 (the viewer). A declined request still reads as
// "outgoing" to the sender so nobody learns they were turned down.
const RELATION = `
  CASE
    WHEN p.user_id = $1 THEN 'self'
    WHEN EXISTS (SELECT 1 FROM connection_requests r WHERE r.status = 'accepted'
                 AND ((r.from_user = $1 AND r.to_user = p.user_id) OR (r.from_user = p.user_id AND r.to_user = $1))) THEN 'connected'
    WHEN EXISTS (SELECT 1 FROM connection_requests r WHERE r.from_user = $1 AND r.to_user = p.user_id) THEN 'outgoing'
    WHEN EXISTS (SELECT 1 FROM connection_requests r WHERE r.from_user = p.user_id AND r.to_user = $1 AND r.status = 'pending') THEN 'incoming'
    ELSE 'none'
  END AS relation,
  (SELECT r.id FROM connection_requests r WHERE r.from_user = p.user_id AND r.to_user = $1 AND r.status = 'pending') AS request_id`;

const NOT_BLOCKED = `NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker = $1 AND b.blocked = p.user_id) OR (b.blocker = p.user_id AND b.blocked = $1))`;

export type DirectoryFilters = { q?: string; role?: string; level?: string; intent?: string; stack?: string };

export const PAGE_SIZE = 36;

export async function directory(viewerId: string, eventId: string, f: DirectoryFilters, page: number) {
  const params: unknown[] = [viewerId, eventId];
  const where = [
    "p.onboarded", "p.listed", "p.user_id <> $1", NOT_BLOCKED,
    "EXISTS (SELECT 1 FROM event_members m WHERE m.event_id = $2 AND m.user_id = p.user_id)",
  ];
  if (f.q) {
    params.push(`%${f.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
    where.push(`(p.name ILIKE $${params.length} OR p.headline ILIKE $${params.length} OR p.bio ILIKE $${params.length})`);
  }
  if (f.role) { params.push(f.role); where.push(`p.role = $${params.length}`); }
  if (f.level) { params.push(f.level); where.push(`p.level = $${params.length}`); }
  if (f.intent) { params.push(f.intent); where.push(`$${params.length} = ANY(p.intents)`); }
  if (f.stack) { params.push(f.stack); where.push(`$${params.length} = ANY(p.stack)`); }
  params.push(PAGE_SIZE + 1, page * PAGE_SIZE);
  const rows = await query<Person>(
    `SELECT ${PUBLIC_COLS}, ${RELATION} FROM profiles p
      WHERE ${where.join(" AND ")}
      ORDER BY p.updated_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return { people: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE };
}

export async function profileOf(userId: string) {
  const rows = await query<PublicProfile & Contact & { listed: boolean; onboarded: boolean }>(
    `SELECT ${PUBLIC_COLS}, p.whatsapp, p.phone, p.contact_email, p.listed, p.onboarded FROM profiles p WHERE p.user_id = $1`,
    [userId],
  );
  return rows[0] ?? null;
}

/**
 * A profile as seen by the viewer: only people who share an event with them
 * (or are already connected). Contact details only when connected.
 */
export async function profileByHandle(viewerId: string, handle: string) {
  const rows = await query<Person & Contact>(
    `SELECT ${PUBLIC_COLS}, ${RELATION}, p.whatsapp, p.phone, p.contact_email
       FROM profiles p WHERE p.handle = $2 AND p.onboarded AND ${NOT_BLOCKED}`,
    [viewerId, handle],
  );
  const person = rows[0];
  if (!person) return null;
  if (person.relation === "none" || person.relation === "outgoing") {
    const shared = await query(
      `SELECT 1 FROM event_members x JOIN event_members y ON x.event_id = y.event_id
        WHERE x.user_id = $1 AND y.user_id = $2 LIMIT 1`,
      [viewerId, person.user_id],
    );
    if (!shared.length) return null;
  }
  const contact: Contact | null =
    person.relation === "connected" || person.relation === "self"
      ? { whatsapp: person.whatsapp, phone: person.phone, contact_email: person.contact_email }
      : null;
  const { whatsapp: _w, phone: _p, contact_email: _e, ...rest } = person;
  void _w; void _p; void _e;
  return { person: rest as Person, contact };
}

export type RequestRow = PublicProfile & { request_id: string; note: string; created_at: Date };

export async function incomingRequests(userId: string) {
  return query<RequestRow>(
    `SELECT ${PUBLIC_COLS}, r.id AS request_id, r.note, r.created_at
       FROM connection_requests r JOIN profiles p ON p.user_id = r.from_user
      WHERE r.to_user = $1 AND r.status = 'pending' AND ${NOT_BLOCKED}
      ORDER BY r.created_at DESC`,
    [userId],
  );
}

export async function outgoingRequests(userId: string) {
  return query<RequestRow>(
    `SELECT ${PUBLIC_COLS}, r.id AS request_id, r.note, r.created_at
       FROM connection_requests r JOIN profiles p ON p.user_id = r.to_user
      WHERE r.from_user = $1 AND r.status IN ('pending', 'declined') AND ${NOT_BLOCKED}
      ORDER BY r.created_at DESC`,
    [userId],
  );
}

export type ConnectionRow = PublicProfile & Contact & { connected_at: Date; event_name: string | null };

export async function connections(userId: string) {
  return query<ConnectionRow>(
    `SELECT ${PUBLIC_COLS}, p.whatsapp, p.phone, p.contact_email, r.responded_at AS connected_at,
            (SELECT e.name FROM events e WHERE e.id = r.event_id) AS event_name
       FROM connection_requests r
       JOIN profiles p ON p.user_id = CASE WHEN r.from_user = $1 THEN r.to_user ELSE r.from_user END
      WHERE r.status = 'accepted' AND (r.from_user = $1 OR r.to_user = $1) AND ${NOT_BLOCKED}
      ORDER BY r.responded_at DESC`,
    [userId],
  );
}

export async function counts(userId: string) {
  const rows = await query<{ incoming: number; connected: number }>(
    `SELECT
       (SELECT count(*)::int FROM connection_requests WHERE to_user = $1 AND status = 'pending') AS incoming,
       (SELECT count(*)::int FROM connection_requests WHERE status = 'accepted' AND (from_user = $1 OR to_user = $1)) AS connected`,
    [userId],
  );
  return rows[0];
}

// ---------------------------------------------------------------------------
// "People you should meet": score everyone against the viewer and explain why.

export type Suggestion = Person & { reason: string; score: number };

const has = (p: { intents: string[] }, id: string) => p.intents.includes(id);

function score(me: PublicProfile, them: PublicProfile) {
  const shared = them.stack.filter((s) => me.stack.includes(s));
  const topic = shared[0] ?? roleLabel(them.role);
  const reasons: [number, string][] = [];
  if (has(me, "mentor_wanted") && has(them, "mentoring"))
    reasons.push([5 + shared.length, `They mentor${topic ? ` in ${topic}` : ""}, and you're looking for a mentor.`]);
  if (has(me, "mentoring") && has(them, "mentor_wanted"))
    reasons.push([4 + shared.length, `They're looking for a mentor${topic ? ` in ${topic}` : ""}. You could help.`]);
  if (has(me, "hiring") && has(them, "job_hunting")) reasons.push([5, `They're looking for a job, and you're hiring.`]);
  if (has(me, "job_hunting") && has(them, "hiring")) reasons.push([5, `They're hiring, and you're looking for a job.`]);
  if (has(me, "cofounder") && has(them, "cofounder")) reasons.push([4, `You're both looking for a co-founder.`]);
  if (has(me, "collab") && has(them, "collab")) reasons.push([3, `You both want to build something together.`]);
  if (has(me, "learning") && has(them, "learning") && shared.length)
    reasons.push([3, `You're both learning ${shared[0]}.`]);
  if (shared.length >= 2) reasons.push([shared.length, `You both work with ${shared.slice(0, 2).join(" and ")}.`]);
  else if (shared.length === 1) reasons.push([1, `You both work with ${shared[0]}.`]);
  if (me.role && me.role === them.role) reasons.push([1, `You're both into ${roleLabel(me.role).toLowerCase()}.`]);
  if (!reasons.length) return null;
  reasons.sort((a, b) => b[0] - a[0]);
  return { score: reasons.reduce((s, [n]) => s + n, 0), reason: reasons[0][1] };
}

export async function suggestions(me: PublicProfile, eventId: string, limit = 6): Promise<Suggestion[]> {
  const candidates = await query<Person>(
    `SELECT ${PUBLIC_COLS}, ${RELATION} FROM profiles p
      WHERE p.onboarded AND p.listed AND p.user_id <> $1 AND ${NOT_BLOCKED}
        AND EXISTS (SELECT 1 FROM event_members m WHERE m.event_id = $2 AND m.user_id = p.user_id)
        AND NOT EXISTS (SELECT 1 FROM connection_requests r
                         WHERE (r.from_user = $1 AND r.to_user = p.user_id) OR (r.from_user = p.user_id AND r.to_user = $1))
      ORDER BY p.updated_at DESC LIMIT 2000`,
    [me.user_id, eventId],
  );
  return candidates
    .map((c) => {
      const s = score(me, c);
      return s ? { ...c, ...s } : null;
    })
    .filter((s): s is Suggestion => s !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function intentChips(p: { intents: string[] }) {
  return p.intents.map((id) => intent(id)).filter((i) => i !== undefined);
}
