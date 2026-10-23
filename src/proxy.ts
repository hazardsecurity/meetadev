import { NextResponse, type NextRequest } from "next/server";

const EVENT_COOKIE = "dfi_event";

// Fast gate for signed-in screens (pages still verify the session in the
// database), and remembers the last event visited so "People" opens it.
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const eventPath = pathname.match(/^\/e\/([a-z0-9-]+)(\/.*)?$/);
  const publicEventPage = eventPath && !eventPath[2];

  if (!publicEventPage && !request.cookies.has("dfi_session")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();
  if (eventPath)
    response.cookies.set(EVENT_COOKIE, eventPath[1], { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 90 });
  return response;
}

export const config = {
  matcher: [
    "/people/:path*", "/p/:path*", "/requests/:path*", "/connections/:path*", "/me/:path*",
    "/onboarding/:path*", "/welcome/:path*", "/events/:path*", "/e/:path*",
  ],
};
