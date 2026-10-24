import "server-only";
import { query } from "./db";

export type Message = { id: string; from_user: string; body: string; created_at: string; delivered_at: string | null; read_at: string | null };
export type Receipt = { id: string; delivered_at: string | null; read_at: string | null };

export const iso = (col: string) => `to_char(${col} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;

// One conversation, written to match messages_pair_idx so polls don't scan every message.
const PAIR = "LEAST(from_user, to_user) = LEAST($1::uuid, $2::uuid) AND GREATEST(from_user, to_user) = GREATEST($1::uuid, $2::uuid)";

/** Accepted connection and nobody blocked anybody: the only case where chat is allowed. */
export async function canChat(a: string, b: string) {
  const rows = await query(
    `SELECT 1 FROM connection_requests r
      WHERE r.status = 'accepted' AND ((r.from_user = $1 AND r.to_user = $2) OR (r.from_user = $2 AND r.to_user = $1))
        AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker = $1 AND b.blocked = $2) OR (b.blocker = $2 AND b.blocked = $1))`,
    [a, b],
  );
  return rows.length > 0;
}

export async function thread(me: string, other: string, after?: string) {
  const params: unknown[] = [me, other];
  let since = "";
  if (after) { params.push(after); since = "AND created_at > $3"; }
  const rows = await query<Message>(
    `SELECT id, from_user, body, ${iso("created_at")} AS created_at,
            ${iso("delivered_at")} AS delivered_at, ${iso("read_at")} AS read_at
       FROM messages
      WHERE ${PAIR} ${since}
      ORDER BY messages.created_at DESC LIMIT 200`,
    params,
  );
  return rows.reverse();
}

export async function markRead(me: string, other: string) {
  await query(
    "UPDATE messages SET read_at = now(), delivered_at = COALESCE(delivered_at, now()) WHERE to_user = $1 AND from_user = $2 AND read_at IS NULL",
    [me, other],
  );
}

/** Everything sent to me has now reached my app. Cheap when there's nothing new. */
export async function markDelivered(me: string) {
  await query("UPDATE messages SET delivered_at = now() WHERE to_user = $1 AND delivered_at IS NULL", [me]);
}

/** Tick state for my recent messages in a chat, so the sender sees them change. */
export async function receipts(me: string, other: string) {
  return query<Receipt>(
    `SELECT id, ${iso("delivered_at")} AS delivered_at, ${iso("read_at")} AS read_at
       FROM messages WHERE ${PAIR} AND from_user = $1
      ORDER BY created_at DESC LIMIT 100`,
    [me, other],
  );
}

export async function unreadCount(me: string) {
  const rows = await query<{ n: number }>("SELECT count(*)::int AS n FROM messages WHERE to_user = $1 AND read_at IS NULL", [me]);
  return rows[0].n;
}

export type ChatSummary = { other: string; last_body: string; last_at: Date; last_from_me: boolean; last_delivered: boolean; last_read: boolean; unread: number };

/** Latest message and unread count per person, for the chats list. */
export async function summaries(me: string) {
  return query<ChatSummary>(
    `SELECT DISTINCT ON (other) other, body AS last_body, created_at AS last_at, from_user = $1 AS last_from_me,
            delivered_at IS NOT NULL AS last_delivered, read_at IS NOT NULL AS last_read,
            (SELECT count(*)::int FROM messages u WHERE u.to_user = $1 AND u.from_user = other AND u.read_at IS NULL) AS unread
       FROM (SELECT *, CASE WHEN from_user = $1 THEN to_user ELSE from_user END AS other
               FROM messages WHERE from_user = $1 OR to_user = $1) m
      ORDER BY other, created_at DESC`,
    [me],
  );
}
