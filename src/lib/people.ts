import "server-only";
import { query } from "./db";
import { CONFIRMED, HERE, hereTogether } from "./events";
import { rank, score } from "./match";

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

/** "outgoing": I want to meet them and it isn't mutual yet. Their want of me is never a relation: it's private. */
export type Relation = "self" | "none" | "outgoing" | "connected";

export type Person = PublicProfile & { relation: Relation };

const PUBLIC_COLS = `p.user_id, p.handle, p.name, p.headline, p.bio, p.role, p.level, p.intents, p.stack,
  p.linkedin, p.github, p.x_handle, p.website, p.color, p.photo_url`;

// Relation of profile p to $1 (the viewer).
const RELATION = `
  CASE
    WHEN p.user_id = $1 THEN 'self'
    WHEN EXISTS (SELECT 1 FROM connection_requests r WHERE r.status = 'accepted'
                 AND ((r.from_user = $1 AND r.to_user = p.user_id) OR (r.from_user = p.user_id AND r.to_user = $1))) THEN 'connected'
    WHEN EXISTS (SELECT 1 FROM connection_requests r WHERE r.from_user = $1 AND r.to_user = p.user_id) THEN 'outgoing'
    ELSE 'none'
  END AS relation`;

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
  const rows = await query<PublicProfile & Contact & { listed: boolean; onboarded: boolean; cities: string[] }>(
    `SELECT ${PUBLIC_COLS}, p.whatsapp, p.phone, p.contact_email, p.listed, p.onboarded, p.cities FROM profiles p WHERE p.user_id = $1`,
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
  const rows = await query<{ connected: number; met: number }>(
    `SELECT
       (SELECT count(*)::int FROM connection_requests WHERE status = 'accepted' AND (from_user = $1 OR to_user = $1)) AS connected,
       (SELECT count(DISTINCT a.to_user)::int FROM meetings a WHERE a.from_user = $1 AND ${CONFIRMED}) AS met`,
    [userId],
  );
  return rows[0];
}

// ---------------------------------------------------------------------------
// "People you should meet": score everyone against the viewer and explain why.

export type Suggestion = Person & { reason: string; score: number };

// Leaves out people I already want or am connected to. People who want me stay in:
// leaving them out would give their want away.
const UNDECIDED = `NOT EXISTS (SELECT 1 FROM connection_requests r
  WHERE (r.from_user = $1 AND r.to_user = p.user_id) OR (r.status = 'accepted' AND r.from_user = p.user_id AND r.to_user = $1))`;

export async function suggestions(me: PublicProfile, eventId: string, limit = 6): Promise<Suggestion[]> {
  const candidates = await query<Person>(
    `SELECT ${PUBLIC_COLS}, ${RELATION} FROM profiles p
      WHERE p.onboarded AND p.listed AND p.user_id <> $1 AND ${NOT_BLOCKED} AND ${UNDECIDED}
        AND EXISTS (SELECT 1 FROM event_members m WHERE m.event_id = $2 AND m.user_id = p.user_id)
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

// ---------------------------------------------------------------------------
// The deck: people Here at this event I haven't decided on yet, best first.

export type DeckCard = Pick<PublicProfile, "user_id" | "handle" | "name" | "headline" | "role" | "level" | "intents" | "stack" | "color" | "photo_url"> & { reason: string };

const DECK_SIZE = 40;

export async function deck(me: PublicProfile, eventId: string): Promise<DeckCard[]> {
  const rows = await query<PublicProfile & { wants_me: boolean }>(
    `SELECT ${PUBLIC_COLS},
            EXISTS (SELECT 1 FROM connection_requests w WHERE w.from_user = p.user_id AND w.to_user = $1 AND w.status = 'pending') AS wants_me
       FROM event_members m JOIN profiles p ON p.user_id = m.user_id
      WHERE m.event_id = $2 AND ${HERE()}
        -- Checking in is the opt-in for the deck, so people hidden from the directory are here too (D-007).
        AND p.onboarded AND p.user_id <> $1 AND ${NOT_BLOCKED} AND ${UNDECIDED}
        AND NOT EXISTS (SELECT 1 FROM passes x WHERE x.event_id = $2 AND x.from_user = $1 AND x.to_user = p.user_id)
      LIMIT 2000`,
    [me.user_id, eventId],
  );
  const wantsMe = new Set(rows.filter((r) => r.wants_me).map((r) => r.user_id));
  // Only card fields go to the browser: wants_me must never leave the server.
  return rank(me, rows, wantsMe).slice(0, DECK_SIZE).map((p) => ({
    user_id: p.user_id, handle: p.handle, name: p.name, headline: p.headline, role: p.role, level: p.level,
    intents: p.intents, stack: p.stack, color: p.color, photo_url: p.photo_url, reason: p.reason,
  }));
}

/** My connections who are Here at this event. Built from Here and Connection; nothing extra is stored. */
export async function connectionsHere(userId: string, eventId: string) {
  return query<Pick<PublicProfile, "user_id" | "handle" | "name" | "color" | "photo_url">>(
    `SELECT p.user_id, p.handle, p.name, p.color, p.photo_url
       FROM event_members m JOIN profiles p ON p.user_id = m.user_id
      WHERE m.event_id = $2 AND ${HERE()} AND p.user_id <> $1 AND ${NOT_BLOCKED}
        AND EXISTS (SELECT 1 FROM connection_requests r WHERE r.status = 'accepted'
                     AND ((r.from_user = $1 AND r.to_user = p.user_id) OR (r.from_user = p.user_id AND r.to_user = $1)))
      ORDER BY m.checked_in_at DESC LIMIT 20`,
    [userId, eventId],
  );
}

// ---------------------------------------------------------------------------
// Met: each person taps "We met"; it counts once both have, at an event both are Here at.

export type MeetStatus = {
  /** The latest event we're both Here at today. Null: "We met" isn't possible right now. */
  event: { id: string; name: string } | null;
  state: "none" | "mine" | "theirs" | "both";
  /** An earlier event where we met. */
  earlier: string | null;
};

/** Their half only shows when we're connected: a one-sided "We met" between strangers stays private. */
export async function meetStatus(me: string, other: string, connected: boolean): Promise<MeetStatus> {
  const [here, claims] = await Promise.all([
    hereTogether(me, other),
    query<{ event_id: string; name: string; mine: boolean; theirs: boolean }>(
      `SELECT a.event_id, e.name, bool_or(a.from_user = $1) AS mine, bool_or(a.from_user = $2) AS theirs
         FROM meetings a JOIN events e ON e.id = a.event_id
        WHERE (a.from_user = $1 AND a.to_user = $2) OR (a.from_user = $2 AND a.to_user = $1)
        GROUP BY a.event_id, e.name ORDER BY max(a.created_at) DESC`,
      [me, other],
    ),
  ]);
  const event = here ? { id: here.id, name: here.name } : null;
  const now = claims.find((c) => c.event_id === event?.id);
  const earlier = claims.find((c) => c.event_id !== event?.id && c.mine && c.theirs)?.name ?? null;
  const state = now?.mine && now.theirs ? "both" : now?.mine ? "mine" : now?.theirs && connected ? "theirs" : "none";
  return { event, state, earlier };
}
