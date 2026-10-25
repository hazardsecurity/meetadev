import { NextResponse, type NextRequest } from "next/server";

const EVENT_COOKIE = "dfi_event";

// Fast gate for signed-in screens (pages still verify the session in the
// database), and remembers the last event visited so "People" opens it.
// Search engines and link previews always get the real landing page.
const BOT = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|discord|preview|embed|lighthouse/i;

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // First visit: ask "attending or organising?" before the landing page.
  if (pathname === "/") {
    const firstVisit =
      !request.cookies.has("dfi_session") && !request.cookies.has("mad_start") && !BOT.test(request.headers.get("user-agent") ?? "");
    return firstVisit ? NextResponse.rewrite(new URL("/start", request.url)) : NextResponse.next();
  }
  const eventPath = pathname.match(/^\/e\/([a-z0-9-]+)(\/.*)?$/);
  const publicEventPage = eventPath && !eventPath[2];

  if (!publicEventPage && !request.cookies.has("dfi_session")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();
  // Page loads only: a cookie set on a server action's POST makes Next re-render the page, which resets the deck.
  if (eventPath && request.method === "GET")
    response.cookies.set(EVENT_COOKIE, eventPath[1], { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 90 });
  return response;
}

export const config = {
  matcher: [
    "/",
    "/people/:path*", "/p/:path*", "/requests/:path*", "/connections/:path*", "/me/:path*",
    // Not /discover: anyone can search Find events (D-013).
    "/onboarding/:path*", "/welcome/:path*", "/events/:path*", "/e/:path*", "/admin/:path*", "/leaderboard", "/chat/:path*",
  ],
};
