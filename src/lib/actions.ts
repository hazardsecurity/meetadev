"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eraseUser } from "./accounts";
import { currentUser, endSession, safeNext } from "./auth";
import { tidyCities } from "./cities";
import { pool, query } from "./db";
import { CHECKIN_REQUIRED, hereTogether } from "./events";
import { notify } from "./push";
import { allow } from "./ratelimit";
import { track } from "./analytics";
import { firstError, profileSchema, type ProfileInput } from "./validation";

// `values` echoes what was submitted so a form can refill itself after an error
// (React resets uncontrolled forms once an action finishes).
export type FormState = { error?: string; ok?: string; values?: Record<string, string> };

// ---------------------------------------------------------------------------
// Accounts

export async function logout() {
  await endSession();
  redirect("/");
}

/**
 * Delete my account and everything about me (D-006). Meetings I confirmed still count for the other person
 * (D-015): they move to a stand-in account with no profile, so I'm shown nowhere. So do bans, blocks and reports,
 * under a hash of my Google ID, so deleting can't be used to get round them (BUG-019). The rest cascades.
 */
export async function deleteAccount(typed: string): Promise<FormState> {
  const me = await currentUser();
  if (!me) return { error: "You've been signed out. Log in again." };
  if (typed.trim().toUpperCase() !== "DELETE") return { error: "Type DELETE to confirm." };
  const solo = await query<{ name: string }>(
    `SELECT e.name FROM event_members m JOIN events e ON e.id = m.event_id
      WHERE m.user_id = $1 AND m.role = 'organizer'
        AND NOT EXISTS (SELECT 1 FROM event_members o WHERE o.event_id = m.event_id AND o.role = 'organizer' AND o.user_id <> $1)
      LIMIT 1`,
    [me.id],
  );
  if (solo[0]) return { error: `You're the only organiser of ${solo[0].name}. Make someone else an organiser first.` };

  await eraseUser(me.id);
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
  if (!me.onboarded) await track(me.id, "badge created");
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

/** An event both people are in: the one named by `slug`, else the one they most recently joined together. */
async function sharedEvent(me: string, other: string, slug?: string) {
  const rows = await query<{ id: string; slug: string; name: string }>(
    `SELECT e.id, e.slug, e.name FROM event_members x JOIN event_members y ON x.event_id = y.event_id JOIN events e ON e.id = x.event_id
      WHERE x.user_id = $1 AND y.user_id = $2 AND ($3::text IS NULL OR e.slug = $3)
      ORDER BY x.joined_at DESC LIMIT 1`,
    [me, other, slug ?? null],
  );
  return rows[0] ?? null;
}

/** Record that `me` wants to meet `other`. Returns "connected" when it makes the want mutual. */
async function recordWant(me: string, other: string, eventId: string) {
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    // One decision per pair at a time: two Meets at the same moment would otherwise each save a one-way want
    // before seeing the other's, and the pair would never connect.
    await client.query("SELECT pg_advisory_xact_lock(hashtext(least($1::text, $2::text) || greatest($1::text, $2::text)))", [me, other]);
    let result: "already" | "connected" | "wanted";
    // Already connected, whichever of us wanted first: nothing to record.
    const connected = await client.query(
      `SELECT 1 FROM connection_requests WHERE status = 'accepted'
         AND ((from_user = $1 AND to_user = $2) OR (from_user = $2 AND to_user = $1))`,
      [me, other],
    );
    if (connected.rowCount) result = "already";
    // Theirs already exists: this makes it a connection, credited to the event where it became mutual.
    else if ((await client.query(
      `UPDATE connection_requests SET status = 'accepted', responded_at = now(), event_id = $3
        WHERE from_user = $1 AND to_user = $2 AND status = 'pending' RETURNING id`,
      [other, me, eventId],
    )).rowCount) result = "connected";
    else {
      await client.query(
        `INSERT INTO connection_requests (from_user, to_user, event_id) VALUES ($1, $2, $3)
         ON CONFLICT (from_user, to_user) DO NOTHING`,
        [me, other, eventId],
      );
      result = "wanted";
    }
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// These actions don't revalidate: the deck, buttons and We met bar update in place, and every page
// that shows wants, connections or meetings is rendered fresh on the next visit.

/** Meet: private until the other person wants to meet too. Only the mutual moment is announced. */
export async function wantToMeet(toUserId: string, slug?: string): Promise<FormState> {
  const me = await member();
  if (toUserId === me.id) return { error: "That's you!" };
  if (await blockedBetween(me.id, toUserId)) return { error: "You can't meet this person." };
  const event = await sharedEvent(me.id, toUserId, slug);
  if (!event) return { error: "You can only meet people at the same event." };
  // Generous: the deck makes many quick choices. This only stops scripts.
  if (!(await allow(`want:${me.id}`, 300, 86_400))) return { error: "That's a lot of people for one day. Try again tomorrow." };

  const result = await recordWant(me.id, toUserId, event.id);
  await track(me.id, "meet tapped", { event_id: event.id, matched: result === "connected" });
  if (result === "connected") await track(me.id, "matched", { event_id: event.id });
  if (result === "connected")
    await notify(toUserId, { title: "It's a match", body: `You and ${me.name} both want to meet. Say hi.`, url: `/chat/${me.handle}`, tag: `match-${me.id}` });
  return { ok: result === "wanted" ? "wanted" : "connected" };
}

export async function undoWant(toUserId: string): Promise<FormState> {
  const me = await member();
  await query("DELETE FROM connection_requests WHERE from_user = $1 AND to_user = $2 AND status = 'pending'", [me.id, toUserId]);
  return { ok: "undone" };
}

/** Pass: hides them from my deck at this event only. */
export async function pass(slug: string, userId: string): Promise<FormState> {
  const me = await member();
  const event = await sharedEvent(me.id, userId, slug);
  if (!event) return { error: "They're not at this event any more." };
  if (!(await allow(`want:${me.id}`, 300, 86_400))) return { error: "That's a lot of people for one day. Try again tomorrow." };
  await query("INSERT INTO passes (event_id, from_user, to_user) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING", [event.id, me.id, userId]);
  await track(me.id, "passed", { event_id: event.id });
  return { ok: "passed" };
}

/** Undo the deck's last choice about someone: their pass, or a want that isn't mutual yet. */
export async function undoSwipe(slug: string, userId: string): Promise<FormState> {
  const me = await member();
  await query("DELETE FROM passes WHERE from_user = $1 AND to_user = $2 AND event_id = (SELECT id FROM events WHERE slug = $3)", [me.id, userId, slug]);
  await query("DELETE FROM connection_requests WHERE from_user = $1 AND to_user = $2 AND status = 'pending'", [me.id, userId]);
  return { ok: "undone" };
}

/**
 * "We met": my half of a meeting at the latest event we're both Here at. It counts once they tap it too.
 * Meeting someone means wanting to meet them, so it also records my want, which may connect us.
 */
export async function weMet(otherId: string): Promise<FormState> {
  const me = await member();
  if (otherId === me.id) return { error: "That's you!" };
  if (await blockedBetween(me.id, otherId)) return { error: "You can't meet this person." };
  const event = await hereTogether(me.id, otherId);
  if (!event) return { error: CHECKIN_REQUIRED ? "We met counts when you've both checked in at the same event today." : "We met counts when you've both joined the same event." };
  if (!(await allow(`met:${me.id}`, 100, 86_400))) return { error: "That's a lot of meetings for one day. Try again tomorrow." };

  await query("INSERT INTO meetings (event_id, from_user, to_user) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING", [event.id, me.id, otherId]);
  const want = await recordWant(me.id, otherId, event.id);
  const theirs = await query("SELECT 1 FROM meetings WHERE event_id = $1 AND from_user = $2 AND to_user = $3", [event.id, otherId, me.id]);
  await track(me.id, theirs.length ? "met confirmed" : "we met tapped", { event_id: event.id });
  if (theirs.length)
    await notify(otherId, { title: `You and ${me.name} met`, body: `+1 on the ${event.name} leaderboard.`, url: `/e/${event.slug}/leaderboard`, tag: `met-${me.id}` });
  // Their half stays private until they're connected to us; once they are, nudge them.
  else if (want !== "wanted")
    await notify(otherId, { title: `${me.name} says you two met`, body: "Tap We met if you did.", url: `/chat/${me.handle}`, tag: `met-${me.id}` });
  return { ok: theirs.length ? "met" : "waiting" };
}

/** Take back my "We met" while it's still one-sided. */
export async function undoMet(otherId: string): Promise<FormState> {
  const me = await member();
  await query(
    `DELETE FROM meetings a WHERE a.from_user = $1 AND a.to_user = $2
       AND NOT EXISTS (SELECT 1 FROM meetings b WHERE b.event_id = a.event_id AND b.from_user = $2 AND b.to_user = $1)`,
    [me.id, otherId],
  );
  return { ok: "undone" };
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
