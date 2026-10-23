import { NextResponse, type NextRequest } from "next/server";
import { appOrigin, finishFlow, OAUTH_COOKIE } from "@/lib/google";
import { clientIp } from "@/lib/ratelimit";
import { completeSignIn, signInErrorUrl } from "@/lib/signin";

type Pending = { state: string; verifier: string; next: string; code: string };

export async function GET(request: NextRequest) {
  const origin = appOrigin(request.nextUrl.origin);
  const params = request.nextUrl.searchParams;

  let pending: Pending | null = null;
  try {
    pending = JSON.parse(request.cookies.get(OAUTH_COOKIE)?.value ?? "null");
  } catch {}
  const next = pending?.next ?? "/people";

  const fail = (error: string) => {
    const response = NextResponse.redirect(signInErrorUrl(origin, error, next));
    response.cookies.delete({ name: OAUTH_COOKIE, path: "/api/auth" });
    return response;
  };

  if (params.get("error")) return fail("cancelled");
  const code = params.get("code");
  if (!pending || !code || params.get("state") !== pending.state) return fail("expired");

  let result;
  try {
    const identity = await finishFlow(code, pending.verifier, origin);
    result = await completeSignIn(identity, { eventCode: pending.code, ip: await clientIp(), next });
  } catch (error) {
    console.error("Google sign-in failed:", error);
    return fail("failed");
  }
  if ("error" in result) return fail(result.error);

  const response = NextResponse.redirect(new URL(result.to, origin));
  response.cookies.delete({ name: OAUTH_COOKIE, path: "/api/auth" });
  return response;
}
