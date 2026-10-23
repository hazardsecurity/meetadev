import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { clientIp } from "@/lib/ratelimit";
import { completeSignIn, devLoginEnabled, signInErrorUrl } from "@/lib/signin";

// Local testing only: sign in as a made-up @example.test attendee without Google.
// Exists only under `next dev` with ALLOW_DEV_LOGIN=1; 404 otherwise.
export async function POST(request: NextRequest) {
  if (!devLoginEnabled()) return new Response("Not found", { status: 404 });
  if (request.headers.get("origin") !== request.nextUrl.origin) return new Response("Forbidden", { status: 403 });
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const next = String(form.get("next") ?? "");
  if (!/^[^@\s]+@example\.test$/.test(email)) return NextResponse.redirect(signInErrorUrl(request.nextUrl.origin, "devemail", next), 303);
  const result = await completeSignIn(
    { sub: `dev-${createHash("sha256").update(email).digest("hex").slice(0, 16)}`, email, name: email.split("@")[0], picture: "" },
    { eventCode: String(form.get("code") ?? ""), ip: await clientIp(), next },
  );
  if ("error" in result) return NextResponse.redirect(signInErrorUrl(request.nextUrl.origin, result.error, next), 303);
  return NextResponse.redirect(new URL(result.to, request.nextUrl.origin), 303);
}
