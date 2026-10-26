import { exportUser, logAdmin } from "@/lib/admin";
import { currentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/organizers";

// A copy of everything held about one person, for a data access request. Admins only; every download is logged.
export async function GET(_request: Request, { params }: RouteContext<"/api/admin/export/[userId]">) {
  const me = await currentUser();
  if (!me || !isAdmin(me)) return new Response("Not found", { status: 404 });
  const { userId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(userId)) return new Response("Not found", { status: 404 });
  const data = await exportUser(userId);
  if (!data) return new Response("Not found", { status: 404 });
  await logAdmin(me, "export-data", String((data.account as { email: string }).email));
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="meetadev-data-${userId.slice(0, 8)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
