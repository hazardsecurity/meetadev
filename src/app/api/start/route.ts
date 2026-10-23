import { NextResponse, type NextRequest } from "next/server";

const CHOICES = {
  attend: "/discover",
  organise: `/login?next=${encodeURIComponent("/events/new")}`,
  code: `/login?next=${encodeURIComponent("/events")}`,
  browse: "/",
} as const;

// Records the answer to the "Get started" question (so it's asked once) and
// sends people on to the right place.
export function GET(request: NextRequest) {
  const choice = request.nextUrl.searchParams.get("choice") as keyof typeof CHOICES | null;
  const to = choice && choice in CHOICES ? CHOICES[choice] : "/";
  const response = NextResponse.redirect(new URL(to, request.url));
  response.cookies.set("mad_start", choice && choice in CHOICES ? choice : "browse", {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
