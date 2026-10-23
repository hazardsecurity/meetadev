import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GoogleSignIn } from "@/components/GoogleSignIn";
import { currentUser, safeNext } from "@/lib/auth";
import { eventBySlug } from "@/lib/events";
import { devLoginEnabled } from "@/lib/signin";

// When someone arrives from an invite link, greet them with the event's name.
async function eventNameFor(next: string) {
  const slug = next.match(/^\/e\/([a-z0-9-]+)/)?.[1];
  return slug ? (await eventBySlug(slug))?.name : undefined;
}

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await currentUser()) redirect(next);
  return (
    <GoogleSignIn
      next={next}
      error={typeof sp.error === "string" ? sp.error : ""}
      eventName={await eventNameFor(next)}
      devLogin={devLoginEnabled()}
    />
  );
}
