import { NextResponse, type NextRequest } from "next/server";

// Fast gate for signed-in screens. Pages still verify the session in the database.
export function proxy(request: NextRequest) {
  if (request.cookies.has("dfi_session")) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/people/:path*", "/p/:path*", "/requests/:path*", "/connections/:path*", "/me/:path*", "/onboarding/:path*", "/welcome/:path*"],
};
