"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "./actions";
import { eraseUser } from "./accounts";
import { logAdmin, requireAdmin } from "./admin";
import { query } from "./db";
import { isAdmin } from "./organizers";

type Target = { id: string; email: string };

/** The account an admin is acting on. Admins can't act on themselves or on other admins from here. */
async function target(me: { id: string }, userId: string): Promise<Target | { error: string }> {
  if (!/^[0-9a-f-]{36}$/.test(userId)) return { error: "That account doesn't exist." };
  if (userId === me.id) return { error: "You can't do that to your own account." };
  const rows = await query<Target>("SELECT id, email FROM users WHERE id = $1", [userId]);
  if (!rows[0]) return { error: "That account doesn't exist any more." };
  if (isAdmin(rows[0])) return { error: "That's an admin account. Remove them from ADMIN_EMAILS first." };
  return rows[0];
}

export async function suspendUser(userId: string, reason: string): Promise<FormState> {
  const me = await requireAdmin();
  const t = await target(me, userId);
  if ("error" in t) return t;
  const why = reason.trim().slice(0, 300);
  if (why.length < 3) return { error: "Add a short reason. It's kept in the admin log." };
  await query("UPDATE users SET suspended_at = now(), suspended_reason = $2 WHERE id = $1", [t.id, why]);
  await query("DELETE FROM sessions WHERE user_id = $1", [t.id]);
  await logAdmin(me, "suspend", t.email, why);
  revalidatePath("/admin", "layout");
  return { ok: "Suspended. They've been signed out and can't sign back in." };
}

export async function unsuspendUser(userId: string): Promise<FormState> {
  const me = await requireAdmin();
  const t = await target(me, userId);
  if ("error" in t) return t;
  await query("UPDATE users SET suspended_at = NULL, suspended_reason = '' WHERE id = $1", [t.id]);
  await logAdmin(me, "unsuspend", t.email);
  revalidatePath("/admin", "layout");
  return { ok: "Suspension lifted. They can sign in again." };
}

export async function signOutEverywhere(userId: string): Promise<FormState> {
  const me = await requireAdmin();
  const t = await target(me, userId);
  if ("error" in t) return t;
  const rows = await query("DELETE FROM sessions WHERE user_id = $1 RETURNING 1", [t.id]);
  await logAdmin(me, "sign-out-everywhere", t.email, `${rows.length} sessions`);
  return { ok: `Signed out of ${rows.length} ${rows.length === 1 ? "device" : "devices"}.` };
}

/** Delete someone's account for them (a deletion request by email). They retype the account's email to confirm. */
export async function deleteUserAccount(userId: string, typedEmail: string): Promise<FormState> {
  const me = await requireAdmin();
  const t = await target(me, userId);
  if ("error" in t) return t;
  if (typedEmail.trim().toLowerCase() !== t.email.toLowerCase()) return { error: "Type the account's email exactly to confirm." };
  const solo = await query<{ name: string }>(
    `SELECT e.name FROM event_members m JOIN events e ON e.id = m.event_id
      WHERE m.user_id = $1 AND m.role = 'organizer'
        AND NOT EXISTS (SELECT 1 FROM event_members o WHERE o.event_id = m.event_id AND o.role = 'organizer' AND o.user_id <> $1)
      LIMIT 1`,
    [t.id],
  );
  if (solo[0]) return { error: `They're the only organiser of ${solo[0].name}. Make someone else its organiser, or delete the event, first.` };
  await eraseUser(t.id);
  await logAdmin(me, "delete-account", t.email);
  revalidatePath("/admin", "layout");
  return { ok: "Account deleted." };
}

export async function resolveReport(reportId: string): Promise<FormState> {
  const me = await requireAdmin();
  const rows = await query<{ email: string }>(
    `UPDATE reports r SET resolved_at = now(), resolved_by = $2 FROM users u
      WHERE r.id = $1 AND r.resolved_at IS NULL AND u.id = r.reported RETURNING u.email`,
    [reportId, me.id],
  );
  if (!rows[0]) return { error: "That report was already closed." };
  await logAdmin(me, "close-report", rows[0].email);
  revalidatePath("/admin", "layout");
  return { ok: "Report closed." };
}

/** Suspend the reported person and close every open report about them. */
export async function suspendFromReport(reportId: string): Promise<FormState> {
  const me = await requireAdmin();
  const rows = await query<{ reported: string; reason: string }>("SELECT reported, reason FROM reports WHERE id = $1", [reportId]);
  if (!rows[0]) return { error: "That report doesn't exist any more." };
  const res = await suspendUser(rows[0].reported, `Reported: ${rows[0].reason}`);
  if (res.error) return res;
  await query("UPDATE reports SET resolved_at = now(), resolved_by = $2 WHERE reported = $1 AND resolved_at IS NULL", [rows[0].reported, me.id]);
  revalidatePath("/admin", "layout");
  return { ok: "Suspended, and their reports are closed." };
}

export async function approveCommunity(id: string): Promise<FormState> {
  const me = await requireAdmin();
  const rows = await query<{ name: string }>("UPDATE communities SET status = 'active' WHERE id = $1 AND status = 'pending' RETURNING name", [id]);
  if (!rows[0]) return { error: "That community was already handled." };
  await logAdmin(me, "approve-community", rows[0].name);
  revalidatePath("/admin", "layout");
  return { ok: `${rows[0].name} is listed now.` };
}

export async function removeCommunity(id: string): Promise<FormState> {
  const me = await requireAdmin();
  const rows = await query<{ name: string }>("DELETE FROM communities WHERE id = $1 AND status = 'pending' RETURNING name", [id]);
  if (!rows[0]) return { error: "Only communities waiting for review can be removed here." };
  await logAdmin(me, "remove-community", rows[0].name);
  revalidatePath("/admin", "layout");
  return { ok: `${rows[0].name} removed.` };
}
