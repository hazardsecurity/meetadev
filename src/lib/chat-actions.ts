"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "./auth";
import { canChat, iso, type Message } from "./chat";
import { query } from "./db";
import { notify } from "./push";
import { allow } from "./ratelimit";
import { track } from "./analytics";

export async function sendMessage(toUserId: string, raw: string): Promise<{ error?: string; message?: Message }> {
  const me = await currentUser();
  if (!me?.onboarded) return { error: "You've been signed out. Sign in again." };
  const body = raw.trim().slice(0, 2000);
  if (!body) return { error: "Type a message first." };
  if (!(await canChat(me.id, toUserId))) return { error: "You can only message people you're connected with." };
  if (!(await allow(`chat:${me.id}`, 60, 60))) return { error: "You're sending messages very fast. Wait a moment." };

  const rows = await query<Message>(
    `INSERT INTO messages (from_user, to_user, body) VALUES ($1, $2, $3)
     RETURNING id, from_user, body, ${iso("created_at")} AS created_at, NULL AS delivered_at, NULL AS read_at`,
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
