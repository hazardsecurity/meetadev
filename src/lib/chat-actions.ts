"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "./auth";
import { canChat, iso, type Message, type SharedContact } from "./chat";
import { query } from "./db";
import { publicLinks } from "./links";
import { notify } from "./push";
import { allow } from "./ratelimit";
import { track } from "./analytics";
import { firstError, phone } from "./validation";

const RETURNING = `RETURNING id, from_user, kind, body, ${iso("created_at")} AS created_at, NULL AS delivered_at, NULL AS read_at`;

export async function sendMessage(toUserId: string, raw: string): Promise<{ error?: string; message?: Message }> {
  const me = await currentUser();
  if (!me?.onboarded) return { error: "You've been signed out. Sign in again." };
  const body = raw.trim().slice(0, 2000);
  if (!body) return { error: "Type a message first." };
  if (!(await canChat(me.id, toUserId))) return { error: "You can only message people you're connected with." };
  if (!(await allow(`chat:${me.id}`, 60, 60))) return { error: "You're sending messages very fast. Wait a moment." };

  const rows = await query<Message>(
    `INSERT INTO messages (from_user, to_user, body) VALUES ($1, $2, $3) ${RETURNING}`,
    [me.id, toUserId, body],
  );
  await notify(toUserId, {
    title: me.name ?? "New message",
    body: body.length > 120 ? `${body.slice(0, 117)}…` : body,
    url: `/chat/${me.handle}`,
    tag: `chat-${me.id}`,
  });
  await track(me.id, "message sent");
  revalidatePath("/connections");
  return { message: rows[0] };
}

type ContactRow = { name: string; handle: string; whatsapp: string; phone: string; contact_email: string; linkedin: string; github: string; x_handle: string; website: string };

/**
 * Posts my contact card in a chat: WhatsApp, phone, email and links, as on my badge right now.
 * With no number on my badge it returns needNumber; sent again with `number`, it saves that as my WhatsApp first.
 */
export async function shareContact(toUserId: string, number = ""): Promise<{ error?: string; needNumber?: boolean; message?: Message }> {
  const me = await currentUser();
  if (!me?.onboarded) return { error: "You've been signed out. Sign in again." };
  if (!(await canChat(me.id, toUserId))) return { error: "You can only share your contact with people you're connected with." };
  if (!(await allow(`chat:${me.id}`, 60, 60))) return { error: "You're sending messages very fast. Wait a moment." };
  if (number) {
    const parsed = phone.safeParse(number);
    if (!parsed.success) return { error: firstError(parsed.error) };
    await query("UPDATE profiles SET whatsapp = $2, updated_at = now() WHERE user_id = $1 AND whatsapp = '' AND phone = ''", [me.id, parsed.data]);
  }
  const [p] = await query<ContactRow>(
    "SELECT name, handle, whatsapp, phone, contact_email, linkedin, github, x_handle, website FROM profiles WHERE user_id = $1",
    [me.id],
  );
  if (!p.whatsapp && !p.phone) return { needNumber: true };

  const card: SharedContact = { name: p.name, whatsapp: p.whatsapp, phone: p.phone, email: p.contact_email, links: publicLinks(p) };
  const rows = await query<Message>(
    `INSERT INTO messages (from_user, to_user, kind, body) VALUES ($1, $2, 'contact', $3) ${RETURNING}`,
    [me.id, toUserId, JSON.stringify(card)],
  );
  await notify(toUserId, { title: p.name, body: `${p.name.split(" ")[0]} shared their contact with you.`, url: `/chat/${p.handle}`, tag: `chat-${me.id}` });
  await track(me.id, "contact shared", { asked_for_number: !!number });
  revalidatePath("/connections");
  return { message: rows[0] };
}
