import "server-only";
import { after } from "next/server";
import webpush from "web-push";
import { query } from "./db";

// Web Push with VAPID keys. Without keys configured, sending is a no-op.
const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const configured = !!(publicKey && privateKey);
if (configured) webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:hello@meetadev.xyz", publicKey!, privateKey!);

export type PushPayload = { title: string; body: string; url: string; tag?: string };

/** Notify every device the person has turned notifications on for, after the
 *  response is sent so the tap that caused it isn't kept waiting. Never throws. */
export async function notify(userId: string, payload: PushPayload) {
  if (!configured) return;
  after(() => send(userId, payload));
}

async function send(userId: string, payload: PushPayload) {
  try {
    const subs = await query<{ endpoint: string; p256dh: string; auth: string }>(
      "SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1",
      [userId],
    );
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify(payload),
            { TTL: 60 * 60 * 24, urgency: "high" },
          );
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode;
          // The browser dropped this subscription: forget it.
          if (status === 404 || status === 410) await query("DELETE FROM push_subscriptions WHERE endpoint = $1", [s.endpoint]);
          else console.error("push failed", status ?? (error as Error).message);
        }
      }),
    );
  } catch (error) {
    console.error("notify failed", error);
  }
}
