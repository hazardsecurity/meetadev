import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/auth";
import { appOrigin, googleConfigured, OAUTH_COOKIE, startFlow } from "@/lib/google";
import { signInErrorUrl } from "@/lib/signin";

// Starts "Continue with Google". POST only, from our own sign-in form.
export async function POST(request: NextRequest) {
  const origin = appOrigin(request.nextUrl.origin);
  if (request.headers.get("origin") !== request.nextUrl.origin) return new Response("Forbidden", { status: 403 });

  const form = await request.formData();
  const next = safeNext(form.get("next"));
  if (!googleConfigured()) return NextResponse.redirect(signInErrorUrl(origin, "config", next), 303);

  const { url, state, verifier } = startFlow(origin);
  const response = NextResponse.redirect(url, 303);
  response.cookies.set(OAUTH_COOKIE, JSON.stringify({ state, verifier, next, code: String(form.get("code") ?? "").slice(0, 60) }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth",
    maxAge: 600,
  });
  return response;
}
