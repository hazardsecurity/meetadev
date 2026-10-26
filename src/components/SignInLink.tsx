"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

/** Sign in (or finish the badge) and come back to this page, e.g. the invite link that was opened. */
export function SignInLink({ to, children }: { to: "/login" | "/onboarding"; children: React.ReactNode }) {
  const path = usePathname();
  const query = useSearchParams().toString();
  const here = query ? `${path}?${query}` : path;
  return <Link className="btn btn--white btn--sm" href={`${to}?next=${encodeURIComponent(here)}`}>{children}</Link>;
}
