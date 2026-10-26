"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { currentUser } from "./auth";
import type { PoolClient } from "pg";
import { pool, query } from "./db";
import { tidyCity } from "./cities";
import { CHECKIN_REQUIRED, eventBySlug, HERE, isBanned, lagosToday, membership, newCheckinKey, newJoinCode, slugifyEvent } from "./events";
import { formatDate } from "./format";
import { canCreateEvents, isAdmin } from "./organizers";
import { notify } from "./push";
import { allow } from "./ratelimit";
import { track } from "./analytics";
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
  // Admins can run any event's organiser tools.
  if (!event || (!isAdmin(me) && (await membership(event.id, me.id)) !== "organizer")) throw new Error("Not an organiser of this event");
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
  listed: form.get("listed") === "on" ? "on" : "",
  community_id: field(form, "community_id"),
});

// ---------------------------------------------------------------------------
// Create / join / leave

const NOT_BANNED = "NOT EXISTS (SELECT 1 FROM event_bans b WHERE b.event_id = $1 AND b.user_id = $2)";

/** Changes one person's membership of an event under a lock, so a ban can't land between a join or check-in's
 *  ban check and its insert (BUG-022). */
async function asMember<T>(eventId: string, userId: string, fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1::text || ':' || $2::text))", [eventId, userId]);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createEvent(_prev: FormState, form: FormData): Promise<FormState> {
  const me = await signedIn();
  if (!(await canCreateEvents(me))) return { error: "Only approved GDG organisers can create events. Apply on this page first." };
  const parsed = eventSchema.safeParse({
    name: field(form, "name"),
    city: field(form, "city"),
    starts_on: field(form, "starts_on"),
    about: field(form, "about"),
    listed: form.get("listed") === "on",
  });
  if (!parsed.success) return { error: firstError(parsed.error), values: echo(form) };
  if (!(await allow(`create-event:${me.id}`, 5, 86_400))) return { error: "You've created 5 events today. Try again tomorrow.", values: echo(form) };

  const e = parsed.data;
  const base = slugifyEvent(e.name);
  // Looked up before the transaction: a second pool connection inside it can exhaust the pool under load (S-001).
  const communityId = await communityFor(form, me);
  const client = await pool().connect();
  let slug = base;
  try {
    await client.query("BEGIN");
    // One create at a time picks a slug, so two at the same moment can't both take the same one (BUG-023).
    await client.query("SELECT pg_advisory_xact_lock(hashtext('events.slug'))");
    // Find a free slug: devfest-ilorin-2026, devfest-ilorin-2026-2, ...
    for (let n = 2; ; n++) {
      const taken = await client.query("SELECT 1 FROM events WHERE slug = $1", [slug]);
      if (!taken.rowCount) break;
      slug = `${base}-${n}`;
    }
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO events (slug, name, city, starts_on, about, join_code, checkin_key, listed, community_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [slug, e.name, e.city, e.starts_on, e.about, newJoinCode(), newCheckinKey(), e.listed, communityId, me.id],
    );
    await client.query("INSERT INTO event_members (event_id, user_id, role) VALUES ($1, $2, 'organizer')", [rows[0].id, me.id]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  await track(me.id, "event created");
  revalidatePath("/", "layout");
  redirect(`/e/${slug}/manage?created=1`);
}

/** Events are open: anyone signed in can join from the page. The code is only a shortcut. */
export async function joinEvent(slug: string): Promise<FormState> {
  const me = await signedIn();
  const event = await eventBySlug(slug);
  if (!event) return { error: "That event doesn't exist any more." };
  if (await isBanned(event.id, me.id)) return { error: "The organisers have removed you from this event." };
  if (!(await allow(`join:${me.id}`, 30, 3600))) return { error: "Slow down a little and try again in a few minutes." };
  const wasMember = Boolean(await membership(event.id, me.id));
  await asMember(event.id, me.id, (c) => c.query(`INSERT INTO event_members (event_id, user_id) SELECT $1, $2 WHERE ${NOT_BANNED} ON CONFLICT DO NOTHING`, [event.id, me.id]));
  if (await isBanned(event.id, me.id)) return { error: "The organisers have removed you from this event." };
  if (!wasMember) await track(me.id, "event joined", { event_id: event.id });
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
  return joinEvent(rows[0].slug);
}

/**
 * Here: the check-in code is shown only at the venue, so scanning it is what makes someone here, for that day.
 * Joins the event too if needed. On arriving (the day's first check-in), connections already here hear about it.
 */
export async function checkIn(slug: string, key: string): Promise<FormState> {
  const me = await signedIn();
  const event = await eventBySlug(slug);
  if (!event) return { error: "That event doesn't exist any more." };
  if (await isBanned(event.id, me.id)) return { error: "The organisers have removed you from this event." };
  if (!CHECKIN_REQUIRED) return joinEvent(slug);
  if (!(await allow(`checkin:${me.id}`, 20, 3600))) return { error: "Slow down a little and try again in a few minutes." };
  const valid = await query("SELECT 1 FROM events WHERE id = $1 AND checkin_key = $2", [event.id, key.trim().toUpperCase()]);
  if (!valid.length) return { error: "That check-in code has changed. Scan the one at the venue." };
  if (event.starts_on && event.starts_on !== lagosToday()) return { error: `${event.name} is on ${formatDate(event.starts_on)}. Check in on the day.` };

  const first = await asMember(event.id, me.id, async (c) =>
    !!(await c.query(
      `UPDATE event_members m SET checked_in_at = now() WHERE m.event_id = $1 AND m.user_id = $2
         AND (m.checked_in_at IS NULL OR NOT (${HERE()})) RETURNING 1`,
      [event.id, me.id],
    )).rowCount ||
    !!(await c.query(
      `INSERT INTO event_members (event_id, user_id, checked_in_at) SELECT $1, $2, now() WHERE ${NOT_BANNED} ON CONFLICT DO NOTHING RETURNING 1`,
      [event.id, me.id],
    )).rowCount);
  if (!first && (await isBanned(event.id, me.id))) return { error: "The organisers have removed you from this event." };
  if (first) {
    const here = await query<{ user_id: string }>(
      `SELECT m.user_id FROM event_members m JOIN connection_requests r ON r.status = 'accepted'
         AND ((r.from_user = $2 AND r.to_user = m.user_id) OR (r.from_user = m.user_id AND r.to_user = $2))
        WHERE m.event_id = $1 AND ${HERE()} AND m.user_id <> $2
          AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker = $2 AND b.blocked = m.user_id) OR (b.blocker = m.user_id AND b.blocked = $2))`,
      [event.id, me.id],
    );
    for (const { user_id } of here)
      await notify(user_id, { title: `${me.name} is here too`, body: `You're both at ${event.name}. Say hi?`, url: `/chat/${me.handle}`, tag: `here-${me.id}-${event.id}` });
  }
  revalidatePath("/", "layout");
  redirect(`/e/${slug}`);
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
    listed: form.get("listed") === "on",
  });
  if (!parsed.success) return { error: firstError(parsed.error), values: echo(form) };
  const e = parsed.data;
  // No Community field on the form means "leave the link as it is"; an empty
  // choice means "unlink"; a community they can't link to keeps the current one.
  const chosen = field(form, "community_id");
  const community = !form.has("community_id") ? event.community_id : chosen ? ((await communityFor(form, me)) ?? event.community_id) : null;
  await query(
    "UPDATE events SET name = $2, city = $3, starts_on = $4, about = $5, listed = $6, community_id = $7 WHERE id = $1",
    [event.id, e.name, e.city, e.starts_on, e.about, e.listed, community],
  );
  revalidatePath("/", "layout");
  return { ok: "Saved." };
}

export async function newCode(slug: string): Promise<FormState> {
  const { event } = await organised(slug);
  await query("UPDATE events SET join_code = $2 WHERE id = $1", [event.id, newJoinCode()]);
  revalidatePath(`/e/${slug}/manage`);
  return { ok: "New code ready. The old code no longer works." };
}

export async function newCheckinCode(slug: string): Promise<FormState> {
  const { event } = await organised(slug);
  await query("UPDATE events SET checkin_key = $2 WHERE id = $1", [event.id, newCheckinKey()]);
  revalidatePath(`/e/${slug}/manage`);
  return { ok: "New check-in code ready. Put it back up at the venue: the old one no longer works." };
}

export async function setRole(slug: string, userId: string, role: "attendee" | "organizer"): Promise<FormState> {
  const { me, event } = await organised(slug);
  if (userId === me.id && role === "attendee") return { error: "Ask another organiser to change your own role." };
  if (role === "attendee") {
    const others = await query("SELECT 1 FROM event_members WHERE event_id = $1 AND role = 'organizer' AND user_id <> $2", [event.id, userId]);
    if (!others.length) return { error: "They're the only organiser. Make someone else an organiser first." };
  }
  await query("UPDATE event_members SET role = $3 WHERE event_id = $1 AND user_id = $2", [event.id, userId, role]);
  revalidatePath(`/e/${slug}/manage`);
  return { ok: role === "organizer" ? "Made organiser." : "Now an attendee." };
}

export async function removeMember(slug: string, userId: string, ban: boolean): Promise<FormState> {
  const { me, event } = await organised(slug);
  if (userId === me.id) return { error: "You can't remove yourself here. Use Leave event instead." };
  if ((await membership(event.id, userId)) === "organizer") return { error: "Make them an attendee first." };
  await asMember(event.id, userId, async (c) => {
    if (ban) await c.query("INSERT INTO event_bans (event_id, user_id, banned_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING", [event.id, userId, me.id]);
    await c.query("DELETE FROM event_members WHERE event_id = $1 AND user_id = $2", [event.id, userId]);
  });
  revalidatePath(`/e/${slug}/manage`);
  return { ok: ban ? "Removed and banned from this event." : "Removed. They can rejoin with the link." };
}

export async function dismissReport(slug: string, reportId: string): Promise<FormState> {
  const { event } = await organised(slug);
  await query("DELETE FROM reports WHERE id = $1 AND event_id = $2", [reportId, event.id]);
  revalidatePath(`/e/${slug}/manage`);
  return { ok: "Dismissed." };
}

/** Delete an event for good. They retype its name so it can't happen by accident.
 *  Members, bans and reports go with it; connections people made stay. */
export async function deleteEvent(slug: string, typedName: string): Promise<FormState> {
  const { me, event } = await organised(slug);
  if (typedName.trim().toLowerCase() !== event.name.trim().toLowerCase())
    return { error: `Type the event's name exactly (${event.name}) to delete it.` };
  await query("DELETE FROM events WHERE id = $1", [event.id]);
  console.log(`event deleted: ${event.slug} by ${me.id}`);
  revalidatePath("/", "layout");
  redirect(isAdmin(me) ? "/admin?deleted=1" : "/events?deleted=1");
}
