import "server-only";
import { createAccount, findAccount, type Identity } from "./accounts";
import { safeNext, startSession } from "./auth";
import { allow } from "./ratelimit";

export type SignInError = "busy";

/** Signs in (creating the account on first visit) and returns where to go next. */
export async function completeSignIn(
  identity: Identity,
  opts: { ip: string; next: string },
): Promise<{ to: string } | { error: SignInError }> {
  let userId = await findAccount(identity);
  let isNew = false;
  if (!userId) {
    // Venue Wi-Fi puts a whole room behind one IP; a verified Google account is the real gate.
    if (!(await allow(`signup:${opts.ip}`, 500, 3600))) return { error: "busy" };
    userId = await createAccount(identity);
    isNew = true;
  }
  await startSession(userId);
  const next = safeNext(opts.next);
  return { to: isNew ? `/onboarding?next=${encodeURIComponent(next)}` : next };
}

export function signInErrorUrl(origin: string, error: string, next: string) {
  return new URL(`/login?error=${error}&next=${encodeURIComponent(safeNext(next))}`, origin);
}

/** Dev-only shortcut for testing without Google credentials. Never on in production builds. */
export const devLoginEnabled = () => process.env.NODE_ENV === "development" && process.env.ALLOW_DEV_LOGIN === "1";
