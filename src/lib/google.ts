import "server-only";
import { createHash, randomBytes } from "node:crypto";

// Google sign-in (OpenID Connect, authorization code flow with PKCE).
// Docs: https://developers.google.com/identity/openid-connect/openid-connect

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export const OAUTH_COOKIE = "dfi_oauth";

export function googleConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** The public origin, used for the redirect URI registered in Google Cloud. */
export function appOrigin(requestOrigin: string) {
  return (process.env.APP_URL || requestOrigin).replace(/\/$/, "");
}

export const redirectUri = (origin: string) => `${origin}/api/auth/google/callback`;

export function startFlow(origin: string) {
  const state = randomBytes(24).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const url = new URL(AUTH_URL);
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return { url: url.toString(), state, verifier };
}

export type GoogleUser = { sub: string; email: string; name: string; picture: string };

/**
 * Swap the code for tokens. The ID token comes straight from Google's token
 * endpoint over TLS, so its claims can be trusted without checking the
 * signature (OIDC Core 3.1.3.7); we still check issuer, audience and expiry.
 */
export async function finishFlow(code: string, verifier: string, origin: string): Promise<GoogleUser> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      code_verifier: verifier,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(origin),
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Google token exchange failed (${res.status})`);
  const { id_token } = (await res.json()) as { id_token?: string };
  if (!id_token) throw new Error("Google returned no ID token");

  const claims = JSON.parse(Buffer.from(id_token.split(".")[1], "base64url").toString("utf8")) as Record<string, unknown>;
  const issuerOk = claims.iss === "https://accounts.google.com" || claims.iss === "accounts.google.com";
  if (!issuerOk || claims.aud !== process.env.GOOGLE_CLIENT_ID || Number(claims.exp) * 1000 < Date.now())
    throw new Error("Google ID token failed validation");
  if (claims.email_verified !== true || typeof claims.email !== "string")
    throw new Error("Google account has no verified email");

  return {
    sub: String(claims.sub),
    email: claims.email.toLowerCase(),
    name: typeof claims.name === "string" ? claims.name : claims.email.split("@")[0],
    picture: typeof claims.picture === "string" ? claims.picture : "",
  };
}
