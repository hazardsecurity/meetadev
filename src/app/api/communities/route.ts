import { currentUser } from "@/lib/auth";
import { searchCommunities } from "@/lib/communities";

// Community search for the organiser application picker.
export async function GET(request: Request) {
  const me = await currentUser();
  if (!me?.onboarded) return new Response("Not signed in", { status: 401 });
  const q = (new URL(request.url).searchParams.get("q") ?? "").slice(0, 60);
  if (q.trim().length < 2) return Response.json({ results: [] });
  return Response.json({ results: await searchCommunities(q) }, { headers: { "Cache-Control": "no-store" } });
}
