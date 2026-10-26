"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "./actions";
import { currentUser } from "./auth";
import { tidyCities, tidyCity } from "./cities";
import { query } from "./db";
import { importCommunities, slugifyCommunity } from "./communities";
import { kindIds, type Kind } from "./community-kinds";
import { logAdmin } from "./admin";
import { isAdmin } from "./organizers";
import { notify } from "./push";
import { allow } from "./ratelimit";
import { firstError } from "./validation";
import { track } from "./analytics";

const isGdgPage = (v: string) => /^https:\/\/gdg\.community\.dev\/./i.test(v);

const newCommunity = z
  .object({
    c_name: z.string().trim().min(3, "Enter your community's name.").max(80),
    c_kind: z.enum(kindIds),
    c_city: z.string().trim().min(2, "Enter the city your community is in.").max(60),
    c_country: z.string().trim().max(60),
    c_url: z.string().trim().max(200).refine((v) => /^https:\/\/[^\s]+\.[^\s]+/i.test(v), "Paste your community's page link (starting with https://)."),
  })
  .refine((c) => c.c_kind !== "gdg" || isGdgPage(c.c_url), {
    message: "For a GDG chapter, paste its page on gdg.community.dev, for example https://gdg.community.dev/gdg-ilorin/",
  });

export async function applyForOrganizer(_prev: FormState, form: FormData): Promise<FormState> {
  const me = await currentUser();
  if (!me?.onboarded) return { error: "Sign in and finish your badge first." };
  const values = Object.fromEntries([...form.entries()].filter(([k]) => !k.startsWith("$")).map(([k, v]) => [k, String(v)]));
  const note = (values.note ?? "").trim().slice(0, 400);

  if (!(await allow(`organizer-apply:${me.id}`, 3, 86_400))) return { error: "You've applied a few times today. We'll review what you sent.", values };
  const pending = await query("SELECT 1 FROM organizer_requests WHERE user_id = $1 AND status = 'pending'", [me.id]);
  if (pending.length) return { error: "Your application is already waiting for review." };

  let community: { id: string; name: string; url: string; city: string };
  if (values.mode === "new") {
    const parsed = newCommunity.safeParse(values);
    if (!parsed.success) return { error: firstError(parsed.error), values };
    const c = parsed.data;
    const dupe = await query<{ name: string }>("SELECT name FROM communities WHERE lower(url) = lower($1)", [c.c_url]);
    if (dupe[0]) return { error: `${dupe[0].name} is already on the list. Search for it instead.`, values };
    const city = tidyCity(c.c_city);
    let slug = slugifyCommunity(c.c_name, city);
    for (let n = 2; (await query("SELECT 1 FROM communities WHERE slug = $1", [slug])).length; n++) slug = `${slugifyCommunity(c.c_name, city)}-${n}`;
    const rows = await query<{ id: string }>(
      `INSERT INTO communities (slug, name, kind, city, country, url, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7) RETURNING id`,
      [slug, c.c_name, c.c_kind, city, c.c_country, c.c_url, me.id],
    );
    community = { id: rows[0].id, name: c.c_name, url: c.c_url, city };
  } else {
    const id = values.community_id ?? "";
    if (!/^[0-9a-f-]{36}$/.test(id)) return { error: "Pick your community from the list, or add it if it isn't there.", values };
    const rows = await query<{ id: string; name: string; url: string; city: string }>(
      "SELECT id, name, url, city FROM communities WHERE id = $1 AND status = 'active'",
      [id],
    );
    if (!rows[0]) return { error: "That community isn't available. Pick another or add yours.", values };
    community = rows[0];
  }

  await query(
    "INSERT INTO organizer_requests (user_id, chapter_name, chapter_url, city, note, community_id) VALUES ($1, $2, $3, $4, $5, $6)",
    [me.id, community.name, community.url, community.city, note, community.id],
  );
  await track(me.id, "organiser applied");
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
  const request = (await query<{ community_id: string | null }>("SELECT community_id FROM organizer_requests WHERE id = $1", [requestId]))[0];
  if (approve) {
    await query("UPDATE users SET can_create_events = true WHERE id = $1", [rows[0].user_id]);
    if (request?.community_id) {
      // A community added with this application goes live with it.
      await query("UPDATE communities SET status = 'active' WHERE id = $1", [request.community_id]);
      await query("INSERT INTO community_organizers (community_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [request.community_id, rows[0].user_id]);
    }
    await notify(rows[0].user_id, { title: "You're approved! 🎤", body: "You can now create events on meetadev.", url: "/events/new", tag: "organiser-approved" });
  } else if (request?.community_id) {
    // Drop a community that only existed for this declined application.
    await query(
      `DELETE FROM communities c WHERE c.id = $1 AND c.status = 'pending'
         AND NOT EXISTS (SELECT 1 FROM organizer_requests r WHERE r.community_id = c.id AND r.id <> $2 AND r.status <> 'rejected')`,
      [request.community_id, requestId],
    );
  }
  const who = (await query<{ email: string }>("SELECT email FROM users WHERE id = $1", [rows[0].user_id]))[0]?.email ?? rows[0].user_id;
  await logAdmin(me, approve ? "approve-organiser" : "decline-organiser", who);
  revalidatePath("/admin", "layout");
  return { ok: approve ? "Approved. They can create events now." : "Declined." };
}

export async function revokeOrganizer(userId: string): Promise<FormState> {
  const me = await admin();
  const rows = await query<{ email: string }>("UPDATE users SET can_create_events = false WHERE id = $1 RETURNING email", [userId]);
  await logAdmin(me, "revoke-organiser", rows[0]?.email ?? userId);
  revalidatePath("/admin", "layout");
  return { ok: "They can no longer create new events. Their existing events stay." };
}

export async function grantOrganizer(_prev: FormState, form: FormData): Promise<FormState> {
  const me = await admin();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const rows = await query("UPDATE users SET can_create_events = true WHERE lower(email) = $1 RETURNING id", [email]);
  if (rows.length) await logAdmin(me, "grant-organiser", email);
  revalidatePath("/admin", "layout");
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

const importLine = z.object({
  name: z.string().trim().min(2).max(80),
  kind: z.enum(kindIds),
  city: z.string().trim().min(2).max(60),
  country: z.string().trim().max(60),
  url: z.string().trim().max(200).refine((v) => v === "" || /^https:\/\/\S+\.\S+/i.test(v)),
});

/** Split one CSV line, honouring "quoted, values". */
function csvCells(line: string) {
  const cells: string[] = [];
  let cur = "", quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && line[i + 1] === '"' && quoted) { cur += '"'; i++; }
    else if (ch === '"') quoted = !quoted;
    else if ((ch === "," || ch === "\t") && !quoted) { cells.push(cur); cur = ""; }
    else cur += ch;
  }
  cells.push(cur);
  return cells.map((c) => c.trim());
}

/** Admin bulk import: one community per line, "name, type, city, country, link". */
export async function importCommunityList(_prev: FormState, form: FormData): Promise<FormState> {
  const me = await admin();
  const text = String(form.get("csv") ?? "");
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return { error: "Paste at least one line." };
  if (lines.length > 5000) return { error: "That's more than 5,000 lines. Import it in parts." };

  const rows: { name: string; kind: Kind; city: string; country: string; url: string }[] = [];
  const bad: number[] = [];
  lines.forEach((line, n) => {
    const [name = "", kind = "", city = "", country = "", url = ""] = csvCells(line);
    if (n === 0 && name.toLowerCase() === "name") return; // header row
    const k = kind.toLowerCase().replace(/\s+/g, "");
    const mapped = k.startsWith("gdg") && k.includes("campus") ? "gdsc" : k.startsWith("gdg") ? "gdg" : k.includes("gdsc") || k.includes("student") ? "gdsc" : k.includes("wtm") || k.includes("women") ? "wtm" : "other";
    const parsed = importLine.safeParse({ name, kind: mapped, city, country, url });
    if (parsed.success) rows.push(parsed.data);
    else bad.push(n + 1);
  });
  if (!rows.length) return { error: "None of those lines could be read. Use: name, type, city, country, link", values: { csv: text } };
  const { added, updated } = await importCommunities(rows, me.id);
  await logAdmin(me, "import-communities", "", `added ${added}, updated ${updated}`);
  revalidatePath("/admin", "layout");
  const skipped = bad.length ? ` Skipped line${bad.length === 1 ? "" : "s"} ${bad.slice(0, 15).join(", ")}${bad.length > 15 ? "…" : ""}.` : "";
  return { ok: `Added ${added}, updated ${updated}.${skipped}` };
}
