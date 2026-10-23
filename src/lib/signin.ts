import "server-only";
import { createAccount, findAccount, type Identity } from "./accounts";
import { safeNext, startSession } from "./auth";
import { allow } from "./ratelimit";

export type SignInError = "code" | "busy";

/** Signs in (creating the account on first visit) and returns where to go next. */
export async function completeSignIn(
  identity: Identity,
  opts: { eventCode: string; ip: string; next: string },
): Promise<{ to: string } | { error: SignInError }> {
  let userId = await findAccount(identity);
  let isNew = false;
  if (!userId) {
    const required = process.env.EVENT_CODE?.trim();
    if (required && opts.eventCode.trim().toLowerCase() !== required.toLowerCase()) return { error: "code" };
    if (!(await allow(`signup:${opts.ip}`, 20, 3600))) return { error: "busy" };
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
