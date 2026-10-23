import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { query } from "./db";

const COOKIE = "dfi_session";
const SESSION_DAYS = 30;
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export async function startSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await query("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)", [sha256(token), userId, expires]);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function endSession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await query("DELETE FROM sessions WHERE token_hash = $1", [sha256(token)]);
  store.delete(COOKIE);
}

export type Me = {
  id: string;
  email: string;
  handle: string | null;
  name: string | null;
  onboarded: boolean;
};

/** The signed-in attendee for this request, or null. */
export const currentUser = cache(async (): Promise<Me | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const rows = await query<Me>(
    `SELECT u.id, u.email, p.handle, p.name, coalesce(p.onboarded, false) AS onboarded
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN profiles p ON p.user_id = u.id
      WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [sha256(token)],
  );
  return rows[0] ?? null;
});

/** For app screens: signed in and finished onboarding, otherwise redirect. */
export async function requireMember(next: string) {
  const me = await currentUser();
  if (!me) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (!me.onboarded) redirect(`/onboarding?next=${encodeURIComponent(next)}`);
  return me as Me & { handle: string; name: string };
}

export function safeNext(value: unknown, fallback = "/events") {
  return typeof value === "string" && /^\/(?!\/)[^\\]*$/.test(value) ? value : fallback;
}
