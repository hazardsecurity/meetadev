import type { Metadata } from "next";
import { Celebrate } from "@/components/Celebrate";
import { requireMember, safeNext } from "@/lib/auth";
import { eventBySlug } from "@/lib/events";

export const metadata: Metadata = { title: "Welcome" };

export default async function WelcomePage({ searchParams }: PageProps<"/welcome">) {
  const next = safeNext((await searchParams).next);
  const me = await requireMember("/welcome");
  const slug = next.match(/^\/e\/([a-z0-9-]+)/)?.[1];
  const event = slug ? await eventBySlug(slug) : null;
  return (
    <Celebrate
      first={me.name.split(" ")[0]}
      line={event ? `Next stop: ${event.name}. Let's see who's there.` : "Your badge works at every event. Join one to start meeting people."}
      cta={event ? `Go to ${event.name}` : "Find my event"}
      next={next}
    />
  );
}
