"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "./actions";
import { currentUser } from "./auth";
import { tidyCities, tidyCity } from "./cities";
import { query } from "./db";
import { isAdmin } from "./organizers";
import { allow } from "./ratelimit";
import { firstError } from "./validation";

const applySchema = z.object({
  chapter_name: z.string().trim().min(3, "Enter your GDG chapter's name.").max(80),
  chapter_url: z
    .string()
    .trim()
    .max(200)
    .refine(
      (v) => /^https:\/\/(gdg\.community\.dev|developers\.google\.com\/community|[a-z0-9-]+\.gdg\.community\.dev)\//i.test(v),
      "Paste your chapter's page on gdg.community.dev, for example https://gdg.community.dev/gdg-ilorin/",
    ),
  city: z.string().trim().min(2, "Enter the city your chapter is in.").max(60),
  note: z.string().trim().max(400),
});

export async function applyForOrganizer(_prev: FormState, form: FormData): Promise<FormState> {
  const me = await currentUser();
  if (!me?.onboarded) return { error: "Sign in and finish your badge first." };
  const values = Object.fromEntries([...form.entries()].filter(([k]) => !k.startsWith("$")).map(([k, v]) => [k, String(v)]));
  const parsed = applySchema.safeParse(values);
  if (!parsed.success) return { error: firstError(parsed.error), values };
  if (!(await allow(`organizer-apply:${me.id}`, 3, 86_400))) return { error: "You've applied a few times today. We'll review what you sent.", values };
  const pending = await query("SELECT 1 FROM organizer_requests WHERE user_id = $1 AND status = 'pending'", [me.id]);
  if (pending.length) return { error: "Your application is already waiting for review." };
  const a = parsed.data;
  await query("INSERT INTO organizer_requests (user_id, chapter_name, chapter_url, city, note) VALUES ($1, $2, $3, $4, $5)", [
    me.id, a.chapter_name, a.chapter_url, tidyCity(a.city), a.note,
  ]);
  revalidatePath("/events/new");
  return { ok: "sent" };
}

async function admin() {
  const me = await currentUser();
  if (!isAdmin(me)) throw new Error("Admins only");
  return me!;
}

export async function reviewRequest(requestId: string, approve: boolean): Promise<FormState> {
  const me = await admin();
  const rows = await query<{ user_id: string }>(
    `UPDATE organizer_requests SET status = $2, reviewed_by = $3, reviewed_at = now()
      WHERE id = $1 AND status = 'pending' RETURNING user_id`,
    [requestId, approve ? "approved" : "rejected", me.id],
  );
  if (!rows[0]) return { error: "That application was already reviewed." };
  if (approve) await query("UPDATE users SET can_create_events = true WHERE id = $1", [rows[0].user_id]);
  revalidatePath("/admin");
  return { ok: approve ? "Approved. They can create events now." : "Declined." };
}

export async function revokeOrganizer(userId: string): Promise<FormState> {
  await admin();
  await query("UPDATE users SET can_create_events = false WHERE id = $1", [userId]);
  revalidatePath("/admin");
  return { ok: "They can no longer create new events. Their existing events stay." };
}

export async function grantOrganizer(_prev: FormState, form: FormData): Promise<FormState> {
  await admin();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const rows = await query("UPDATE users SET can_create_events = true WHERE lower(email) = $1 RETURNING id", [email]);
  revalidatePath("/admin");
  return rows.length ? { ok: `${email} can create events now.` } : { error: "Nobody with that email has signed in to meetadev yet." };
}

export async function saveCities(cities: string[]): Promise<FormState> {
  const me = await currentUser();
  if (!me?.onboarded) return { error: "Sign in first." };
  const clean = tidyCities(cities);
  await query("UPDATE profiles SET cities = $2, updated_at = now() WHERE user_id = $1", [me.id, clean]);
  revalidatePath("/discover");
  return { ok: "saved" };
}
