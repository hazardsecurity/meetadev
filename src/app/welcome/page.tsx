import type { Metadata } from "next";
import { Celebrate } from "@/components/Celebrate";
import { requireMember, safeNext } from "@/lib/auth";
import { eventBySlug } from "@/lib/events";

export const metadata: Metadata = { title: "Welcome", robots: { index: false, follow: false } };

export default async function WelcomePage({ searchParams }: PageProps<"/welcome">) {
  const next = safeNext((await searchParams).next);
  const me = await requireMember("/welcome");
  const slug = next.match(/^\/e\/([a-z0-9-]+)/)?.[1];
  const event = slug ? await eventBySlug(slug) : null;
  const first = me.name.split(" ")[0];

  // Organisers came here from "I'm a GDG organiser": send them on to the
  // organiser application / create page, not the attendee pages.
  if (next.startsWith("/events/new"))
    return <Celebrate first={first} line="Now let's set you up as an organiser." cta="Continue to organiser setup" next={next} />;
  if (event)
    return <Celebrate first={first} line={`Next stop: ${event.name}. Let's see who's there.`} cta={`Go to ${event.name}`} next={next} />;
  if (next !== "/events")
    return <Celebrate first={first} line="You're all set." cta="Continue" next={next} />;
  return (
    <Celebrate first={first} line="Your badge works at every event. Let's find one in your city." cta="Find events near me" next="/discover" />
  );
}
