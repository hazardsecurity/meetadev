"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentUser, endSession, safeNext } from "./auth";
import { tidyCities } from "./cities";
import { query } from "./db";
import { allow } from "./ratelimit";
import { firstError, noteSchema, profileSchema, type ProfileInput } from "./validation";

// `values` echoes what was submitted so a form can refill itself after an error
// (React resets uncontrolled forms once an action finishes).
export type FormState = { error?: string; ok?: string; values?: Record<string, string> };

// ---------------------------------------------------------------------------
// Accounts

export async function logout() {
  await endSession();
  redirect("/");
}

// ---------------------------------------------------------------------------
// Profile

export async function saveProfile(input: ProfileInput, next: string): Promise<FormState> {
  const me = await currentUser();
  if (!me) return { error: "You've been signed out. Log in again." };
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const p = parsed.data;
  if (!p.whatsapp && !p.phone && !p.contact_email)
    return { error: "Add at least one way to reach you, so your connections can say hi." };

  const strip = (v: string, re: RegExp) => v.replace(re, "").replace(/\/$/, "");
  await query(
    `UPDATE profiles SET name = $2, headline = $3, bio = $4, role = $5, level = $6, intents = $7, stack = $8,
            whatsapp = $9, phone = $10, contact_email = $11, linkedin = $12, github = $13, x_handle = $14,
            website = $15, listed = $16, cities = $17, onboarded = true, updated_at = now()
      WHERE user_id = $1`,
    [
      me.id, p.name, p.headline, p.bio, p.role, p.level, p.intents, p.stack,
      p.whatsapp, p.phone, p.contact_email,
      strip(p.linkedin, /^(https?:\/\/)?(www\.)?linkedin\.com\/in\//i),
      strip(p.github, /^(https?:\/\/)?(www\.)?github\.com\//i).replace(/^@/, ""),
      strip(p.x_handle, /^(https?:\/\/)?(www\.)?(x|twitter)\.com\//i).replace(/^@/, ""),
      p.website,
      p.listed,
      tidyCities(p.cities),
    ],
  );
  revalidatePath("/", "layout");
  redirect(me.onboarded ? "/me?saved=1" : `/welcome?next=${encodeURIComponent(safeNext(next))}`);
}

// ---------------------------------------------------------------------------
// Connections

async function member() {
  const me = await currentUser();
  if (!me?.onboarded) throw new Error("Not signed in");
  return me;
}

async function blockedBetween(a: string, b: string) {
  const rows = await query(
    "SELECT 1 FROM blocks WHERE (blocker = $1 AND blocked = $2) OR (blocker = $2 AND blocked = $1)",
    [a, b],
  );
  return rows.length > 0;
}

export async function sendRequest(toUserId: string, note: string): Promise<FormState> {
  const me = await member();
  if (toUserId === me.id) return { error: "That's you!" };
  const cleanNote = noteSchema.safeParse(note);
  if (!cleanNote.success) return { error: "Keep your note under 200 characters." };
  if (await blockedBetween(me.id, toUserId)) return { error: "You can't connect with this person." };
  // Only people at the same event can reach each other; remember which one.
  const shared = await query<{ event_id: string }>(
    `SELECT x.event_id FROM event_members x JOIN event_members y ON x.event_id = y.event_id
      WHERE x.user_id = $1 AND y.user_id = $2 ORDER BY x.joined_at DESC LIMIT 1`,
    [me.id, toUserId],
  );
  if (!shared[0]) return { error: "You can only connect with people at the same event." };

  // They already asked us: sending back counts as accepting.
  const reverse = await query<{ id: string }>(
    `UPDATE connection_requests SET status = 'accepted', responded_at = now()
      WHERE from_user = $1 AND to_user = $2 AND status = 'pending' RETURNING id`,
    [toUserId, me.id],
  );
  if (reverse[0]) {
    revalidatePath("/", "layout");
    return { ok: "connected" };
  }

  if (!(await allow(`connect:${me.id}`, 40, 86_400)))
    return { error: "You've sent 40 requests today. Give people time to reply, then try again tomorrow." };

  await query(
    `INSERT INTO connection_requests (from_user, to_user, note, event_id) VALUES ($1, $2, $3, $4)
     ON CONFLICT (from_user, to_user) DO NOTHING`,
    [me.id, toUserId, cleanNote.data, shared[0].event_id],
  );
  revalidatePath("/", "layout");
  return { ok: "sent" };
}

export async function respondToRequest(requestId: string, accept: boolean): Promise<FormState> {
  const me = await member();
  const rows = await query(
    `UPDATE connection_requests SET status = $3, responded_at = now()
      WHERE id = $1 AND to_user = $2 AND status = 'pending' RETURNING id`,
    [requestId, me.id, accept ? "accepted" : "declined"],
  );
  revalidatePath("/", "layout");
  return rows.length ? { ok: accept ? "accepted" : "declined" } : { error: "That request is no longer there." };
}

export async function cancelRequest(toUserId: string): Promise<FormState> {
  const me = await member();
  await query("DELETE FROM connection_requests WHERE from_user = $1 AND to_user = $2 AND status <> 'accepted'", [
    me.id,
    toUserId,
  ]);
  revalidatePath("/", "layout");
  return { ok: "cancelled" };
}

export async function removeConnection(otherId: string): Promise<FormState> {
  const me = await member();
  await query(
    "DELETE FROM connection_requests WHERE (from_user = $1 AND to_user = $2) OR (from_user = $2 AND to_user = $1)",
    [me.id, otherId],
  );
  revalidatePath("/", "layout");
  return { ok: "removed" };
}

export async function blockUser(otherId: string): Promise<FormState> {
  const me = await member();
  if (otherId === me.id) return { error: "You can't block yourself." };
  await query("INSERT INTO blocks (blocker, blocked) VALUES ($1, $2) ON CONFLICT DO NOTHING", [me.id, otherId]);
  await query(
    "DELETE FROM connection_requests WHERE (from_user = $1 AND to_user = $2) OR (from_user = $2 AND to_user = $1)",
    [me.id, otherId],
  );
  revalidatePath("/", "layout");
  redirect("/people?blocked=1");
}

export async function reportUser(otherId: string, reason: string): Promise<FormState> {
  const me = await member();
  const text = reason.trim().slice(0, 500);
  if (text.length < 3) return { error: "Tell us briefly what happened." };
  if (!(await allow(`report:${me.id}`, 10, 86_400))) return { error: "You've sent a lot of reports today. Try tomorrow." };
  // File it with every event the two share, so each event's organisers see it.
  const inserted = await query(
    `INSERT INTO reports (reporter, reported, reason, event_id)
     SELECT $1, $2, $3, x.event_id FROM event_members x JOIN event_members y ON x.event_id = y.event_id
      WHERE x.user_id = $1 AND y.user_id = $2
     RETURNING id`,
    [me.id, otherId, text],
  );
  if (!inserted.length) await query("INSERT INTO reports (reporter, reported, reason) VALUES ($1, $2, $3)", [me.id, otherId, text]);
  return { ok: "Thanks. The event organisers will look into it." };
}
