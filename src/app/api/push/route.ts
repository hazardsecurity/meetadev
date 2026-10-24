import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { query } from "@/lib/db";

const subscription = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
});

const sameOrigin = (request: Request) => request.headers.get("origin") === new URL(request.url).origin;

// Save this device's push subscription for the signed-in person.
export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const me = await currentUser();
  if (!me?.onboarded) return new Response("Not signed in", { status: 401 });
  const parsed = subscription.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response("Bad subscription", { status: 400 });
  const { endpoint, keys } = parsed.data;
  await query(
    `INSERT INTO push_subscriptions (endpoint, user_id, p256dh, auth) VALUES ($1, $2, $3, $4)
     ON CONFLICT (endpoint) DO UPDATE SET user_id = $2, p256dh = $3, auth = $4`,
    [endpoint, me.id, keys.p256dh, keys.auth],
  );
  return Response.json({ ok: true });
}

// Forget this device (turning notifications off, or signing out).
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const me = await currentUser();
  if (!me) return new Response("Not signed in", { status: 401 });
  const { endpoint } = (await request.json().catch(() => ({}))) as { endpoint?: string };
  if (endpoint) await query("DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2", [endpoint, me.id]);
  return Response.json({ ok: true });
}
