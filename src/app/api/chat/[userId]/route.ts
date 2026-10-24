import { currentUser } from "@/lib/auth";
import { canChat, markRead, receipts, thread } from "@/lib/chat";

// New messages in a conversation since `after`; the open chat polls this.
export async function GET(request: Request, { params }: RouteContext<"/api/chat/[userId]">) {
  const me = await currentUser();
  if (!me?.onboarded) return new Response("Not signed in", { status: 401 });
  const { userId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(userId) || !(await canChat(me.id, userId))) return new Response("Not found", { status: 404 });
  const after = new URL(request.url).searchParams.get("after") ?? undefined;
  const messages = await thread(me.id, userId, after && !Number.isNaN(Date.parse(after)) ? after : undefined);
  const [, mine] = await Promise.all([
    messages.some((m) => m.from_user === userId && !m.read_at) ? markRead(me.id, userId) : null,
    receipts(me.id, userId),
  ]);
  return Response.json({ messages, receipts: mine }, { headers: { "Cache-Control": "no-store" } });
}
