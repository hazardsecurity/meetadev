import "server-only";
import { cache } from "react";
import type { Me } from "./auth";
import { query } from "./db";

/** Platform admins approve organiser applications. Set ADMIN_EMAILS (comma-separated) in the environment. */
export function isAdmin(me: Pick<Me, "email"> | null) {
  if (!me) return false;
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return admins.includes(me.email.toLowerCase());
}

export const canCreateEvents = cache(async (me: Me | null) => {
  if (!me) return false;
  if (isAdmin(me)) return true;
  const rows = await query<{ ok: boolean }>("SELECT can_create_events AS ok FROM users WHERE id = $1", [me.id]);
  return rows[0]?.ok ?? false;
});

export type OrganizerRequest = {
  id: string;
  user_id: string;
  chapter_name: string;
  chapter_url: string;
  city: string;
  note: string;
  status: "pending" | "approved" | "rejected";
  created_at: Date;
  reviewed_at: Date | null;
};

export async function latestRequest(userId: string) {
  const rows = await query<OrganizerRequest>(
    "SELECT * FROM organizer_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
    [userId],
  );
  return rows[0] ?? null;
}

export type RequestWithPerson = OrganizerRequest & {
  name: string; email: string; handle: string; photo_url: string; color: number;
  community_name: string | null; community_kind: string | null; community_status: string | null; community_country: string | null;
};

export async function requestsByStatus(status: OrganizerRequest["status"]) {
  return query<RequestWithPerson>(
    `SELECT r.*, p.name, u.email, p.handle, p.photo_url, p.color,
            c.name AS community_name, c.kind AS community_kind, c.status AS community_status, c.country AS community_country
       FROM organizer_requests r JOIN users u ON u.id = r.user_id JOIN profiles p ON p.user_id = r.user_id
       LEFT JOIN communities c ON c.id = r.community_id
      WHERE r.status = $1
      ORDER BY r.created_at ${status === "pending" ? "ASC" : "DESC"} LIMIT 200`,
    [status],
  );
}

export type OrganizerRow = { user_id: string; name: string; email: string; handle: string; photo_url: string; color: number; events: number };

export async function organizers() {
  return query<OrganizerRow>(
    `SELECT u.id AS user_id, p.name, u.email, p.handle, p.photo_url, p.color,
            (SELECT count(*)::int FROM events e WHERE e.created_by = u.id) AS events
       FROM users u JOIN profiles p ON p.user_id = u.id
      WHERE u.can_create_events
      ORDER BY p.name`,
  );
}
