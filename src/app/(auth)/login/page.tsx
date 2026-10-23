import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GoogleSignIn } from "@/components/GoogleSignIn";
import { currentUser, safeNext } from "@/lib/auth";
import { devLoginEnabled } from "@/lib/signin";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await currentUser()) redirect(next);
  return (
    <GoogleSignIn
      next={next}
      error={typeof sp.error === "string" ? sp.error : ""}
      needsCode={!!process.env.EVENT_CODE?.trim()}
      devLogin={devLoginEnabled()}
    />
  );
}
