import { currentUser } from "@/lib/auth";
import { markDelivered, unreadCount } from "@/lib/chat";

// Open meetadev tabs check in here: messages sent to this person count as
// delivered, and the Chats badge gets a fresh unread count.
export async function POST() {
  const me = await currentUser();
  if (!me?.onboarded) return new Response("Not signed in", { status: 401 });
  await markDelivered(me.id);
  return Response.json({ unread: await unreadCount(me.id) }, { headers: { "Cache-Control": "no-store" } });
}
