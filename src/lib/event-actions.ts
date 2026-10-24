"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { currentUser } from "./auth";
import { pool, query } from "./db";
import { tidyCity } from "./cities";
import { eventBySlug, isBanned, membership, newJoinCode, slugifyEvent } from "./events";
import { canCreateEvents, isAdmin } from "./organizers";
import { allow } from "./ratelimit";
import { firstError } from "./validation";
import type { FormState } from "./actions";

async function signedIn() {
  const me = await currentUser();
  if (!me?.onboarded) throw new Error("Not signed in");
  return me;
}

/** The event, if the signed-in person organises it. */
async function organised(slug: string) {
  const me = await signedIn();
  const event = await eventBySlug(slug);
  if (!event || (await membership(event.id, me.id)) !== "organizer") throw new Error("Not an organiser of this event");
  return { me, event };
}

const eventSchema = z.object({
  name: z.string().trim().min(3, "Give your event a name (at least 3 characters).").max(80),
  city: z.string().trim().min(2, "Add the city, so people nearby can find your event.").max(60).transform(tidyCity),
  starts_on: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Pick a valid date.")
    .transform((v) => v || null),
  about: z.string().trim().max(400),
  require_code: z.boolean(),
  listed: z.boolean(),
});

const field = (form: FormData, k: string) => String(form.get(k) ?? "");

/** The chosen community, if this person organises it (admins may pick any). */
async function communityFor(form: FormData, me: { id: string; email: string }) {
  const id = field(form, "community_id");
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const rows = await query<{ id: string }>(
    `SELECT c.id FROM communities c WHERE c.id = $1 AND c.status = 'active'
       AND ($3 OR EXISTS (SELECT 1 FROM community_organizers o WHERE o.community_id = c.id AND o.user_id = $2))`,
    [id, me.id, isAdmin(me)],
  );
  return rows[0]?.id ?? null;
}
const echo = (form: FormData) => ({
  name: field(form, "name"), city: field(form, "city"), starts_on: field(form, "starts_on"), about: field(form, "about"),
  require_code: form.get("require_code") === "on" ? "on" : "", listed: form.get("listed") === "on" ? "on" : "",
  community_id: field(form, "community_id"),
});

// ---------------------------------------------------------------------------
// Create / join / leave

export async function createEvent(_prev: FormState, form: FormData): Promise<FormState> {
  const me = await signedIn();
  if (!(await canCreateEvents(me))) return { error: "Only approved GDG organisers can create events. Apply on this page first." };
  const parsed = eventSchema.safeParse({
    name: field(form, "name"),
    city: field(form, "city"),
    starts_on: field(form, "starts_on"),
    about: field(form, "about"),
    require_code: form.get("require_code") === "on",
    listed: form.get("listed") === "on",
  });
  if (!parsed.success) return { error: firstError(parsed.error), values: echo(form) };
  if (!(await allow(`create-event:${me.id}`, 5, 86_400))) return { error: "You've created 5 events today. Try again tomorrow.", values: echo(form) };

  const e = parsed.data;
  const base = slugifyEvent(e.name);
  const client = await pool().connect();
  let slug = base;
  try {
    await client.query("BEGIN");
    // Find a free slug: devfest-ilorin-2026, devfest-ilorin-2026-2, ...
    for (let n = 2; ; n++) {
      const taken = await client.query("SELECT 1 FROM events WHERE slug = $1", [slug]);
      if (!taken.rowCount) break;
      slug = `${base}-${n}`;
    }
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO events (slug, name, city, starts_on, about, join_code, require_code, listed, community_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [slug, e.name, e.city, e.starts_on, e.about, newJoinCode(), e.require_code, e.listed, await communityFor(form, me), me.id],
    );
    await client.query("INSERT INTO event_members (event_id, user_id, role) VALUES ($1, $2, 'organizer')", [rows[0].id, me.id]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  revalidatePath("/", "layout");
  redirect(`/e/${slug}/manage?created=1`);
}

export async function joinEvent(slug: string, code: string): Promise<FormState> {
  const me = await signedIn();
  const event = await eventBySlug(slug);
  if (!event) return { error: "That event doesn't exist any more." };
  if (await isBanned(event.id, me.id)) return { error: "The organisers have removed you from this event." };
  if (event.require_code && code.trim().toUpperCase() !== event.join_code)
    return { error: "That join code isn't right. Ask an organiser, or check the screens at the venue." };
  if (!(await allow(`join:${me.id}`, 30, 3600))) return { error: "Slow down a little and try again in a few minutes." };
  await query("INSERT INTO event_members (event_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [event.id, me.id]);
  revalidatePath("/", "layout");
  redirect(`/e/${slug}?joined=1`);
}

/** Join by code alone, from the "Join an event" box. */
export async function joinByCode(_prev: FormState, form: FormData): Promise<FormState> {
  await signedIn();
  const code = field(form, "code").trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) return { error: "Join codes are 6 letters and numbers." };
  if (!(await allow(`join-code:${(await signedIn()).id}`, 20, 3600))) return { error: "Too many tries. Wait a bit and try again." };
  const rows = await query<{ slug: string }>("SELECT slug FROM events WHERE join_code = $1", [code]);
  if (!rows[0]) return { error: "No event has that code. Check it with an organiser." };
  return joinEvent(rows[0].slug, code);
}

export async function leaveEvent(slug: string): Promise<FormState> {
  const me = await signedIn();
  const event = await eventBySlug(slug);
  if (!event) redirect("/events");
  const role = await membership(event.id, me.id);
  if (role === "organizer") {
    const others = await query("SELECT 1 FROM event_members WHERE event_id = $1 AND role = 'organizer' AND user_id <> $2", [event.id, me.id]);
    // Returned, not thrown: production hides thrown messages.
    if (!others.length) return { error: "You're the only organiser. Make someone else an organiser in Organiser tools first." };
  }
  await query("DELETE FROM event_members WHERE event_id = $1 AND user_id = $2", [event.id, me.id]);
  revalidatePath("/", "layout");
  redirect("/events?left=1");
}

// ---------------------------------------------------------------------------
// Organiser tools

export async function updateEvent(slug: string, _prev: FormState, form: FormData): Promise<FormState> {
  const { me, event } = await organised(slug);
  const parsed = eventSchema.safeParse({
    name: field(form, "name"),
    city: field(form, "city"),
    starts_on: field(form, "starts_on"),
    about: field(form, "about"),
    require_code: form.get("require_code") === "on",
    listed: form.get("listed") === "on",
  });
  if (!parsed.success) return { error: firstError(parsed.error), values: echo(form) };
  const e = parsed.data;
  // No Community field on the form means "leave the link as it is"; an empty
  // choice means "unlink"; a community they can't link to keeps the current one.
  const chosen = field(form, "community_id");
  const community = !form.has("community_id") ? event.community_id : chosen ? ((await communityFor(form, me)) ?? event.community_id) : null;
  await query(
    "UPDATE events SET name = $2, city = $3, starts_on = $4, about = $5, require_code = $6, listed = $7, community_id = $8 WHERE id = $1",
    [event.id, e.name, e.city, e.starts_on, e.about, e.require_code, e.listed, community],
  );
  revalidatePath("/", "layout");
  return { ok: "Saved." };
}

export async function newCode(slug: string): Promise<FormState> {
  const { event } = await organised(slug);
  await query("UPDATE events SET join_code = $2 WHERE id = $1", [event.id, newJoinCode()]);
  revalidatePath(`/e/${slug}/manage`);
  return { ok: "New code ready. Old invite links no longer skip the code." };
}

export async function setRole(slug: string, userId: string, role: "attendee" | "organizer"): Promise<FormState> {
  const { me, event } = await organised(slug);
  if (userId === me.id && role === "attendee") return { error: "Ask another organiser to change your own role." };
  await query("UPDATE event_members SET role = $3 WHERE event_id = $1 AND user_id = $2", [event.id, userId, role]);
  revalidatePath(`/e/${slug}/manage`);
  return { ok: role === "organizer" ? "Made organiser." : "Now an attendee." };
}

export async function removeMember(slug: string, userId: string, ban: boolean): Promise<FormState> {
  const { me, event } = await organised(slug);
  if (userId === me.id) return { error: "You can't remove yourself here. Use Leave event instead." };
  if ((await membership(event.id, userId)) === "organizer") return { error: "Make them an attendee first." };
  await query("DELETE FROM event_members WHERE event_id = $1 AND user_id = $2", [event.id, userId]);
  if (ban)
    await query("INSERT INTO event_bans (event_id, user_id, banned_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING", [
      event.id, userId, me.id,
    ]);
  revalidatePath(`/e/${slug}/manage`);
  return { ok: ban ? "Removed and banned from this event." : "Removed. They can rejoin with the link." };
}

export async function dismissReport(slug: string, reportId: string): Promise<FormState> {
  const { event } = await organised(slug);
  await query("DELETE FROM reports WHERE id = $1 AND event_id = $2", [reportId, event.id]);
  revalidatePath(`/e/${slug}/manage`);
  return { ok: "Dismissed." };
}
