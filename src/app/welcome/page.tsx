import type { Metadata } from "next";
import { Celebrate } from "@/components/Celebrate";
import { requireMember, safeNext } from "@/lib/auth";
import { eventBySlug, isBanned, membership } from "@/lib/events";
import { joinEvent } from "@/lib/event-actions";

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
  // Came from an invite link and not in yet: this one tap joins (the sign-in button said "to join").
  if (event && next.split("?")[0] === `/e/${event.slug}` && !(await membership(event.id, me.id)) && !(await isBanned(event.id, me.id))) {
    const slug = event.slug;
    async function join() {
      "use server";
      await joinEvent(slug);
    }
    return (
      <Celebrate first={first} line={`Next stop: ${event.name}. Join and see who's there.`}>
        <form action={join}>
          <button className="btn btn--green" style={{ minWidth: 220, marginTop: 8 }}>Join {event.name}</button>
        </form>
      </Celebrate>
    );
  }
  if (event)
    return <Celebrate first={first} line={`Next stop: ${event.name}. Let's see who's there.`} cta={`Go to ${event.name}`} next={next} />;
  if (next !== "/events")
    return <Celebrate first={first} line="You're all set." cta="Continue" next={next} />;
  return (
    <Celebrate first={first} line="Your badge works at every event. Let's find one in your city." cta="Find events near me" next="/discover" />
  );
}
