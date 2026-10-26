import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AyoSays } from "@/components/Ayo";
import { CheckInButton } from "@/components/CheckIn";
import { EventHeader } from "@/components/EventHeader";
import { requireMember } from "@/lib/auth";
import { CHECKIN_REQUIRED, checkinKey, eventBySlug, isBanned, isHere, memberCount } from "@/lib/events";

export const metadata: Metadata = { title: "Check in", robots: { index: false } };

// Opened by scanning the check-in code at the venue. Joins the event too if needed.
export default async function CheckInPage({ params, searchParams }: PageProps<"/e/[slug]/checkin">) {
  const { slug } = await params;
  // Joining is enough for now: old check-in links and posters just open the event.
  if (!CHECKIN_REQUIRED) redirect(`/e/${slug}`);
  const k = String((await searchParams).k ?? "").slice(0, 40).toUpperCase();
  const me = await requireMember(`/e/${slug}/checkin?k=${encodeURIComponent(k)}`);
  const event = await eventBySlug(slug);
  if (!event) notFound();
  if (await isHere(event.id, me.id)) redirect(`/e/${slug}`);

  const [key, banned, count] = await Promise.all([checkinKey(event.id), isBanned(event.id, me.id), memberCount(event.id)]);
  let body: React.ReactNode;
  if (banned) body = <AyoSays mood="sad" size={84}>The organisers of this event have removed you, so you can&apos;t check in.</AyoSays>;
  else if (!k || k !== key)
    body = (
      <>
        <AyoSays mood="thinking" size={84}>That check-in code has changed. Scan the one at the venue, on the posters or the big screen.</AyoSays>
        <Link className="btn btn--white btn--block" href={`/e/${slug}`}>Go to {event.name}</Link>
      </>
    );
  else
    body = (
      <>
        <AyoSays mood="excited" size={84}>{`You made it, ${me.name.split(" ")[0]}! Check in and I'll show you who to meet here, best first.`}</AyoSays>
        <CheckInButton slug={slug} checkinKey={k} />
        <p className="hint">Only people who checked in show up in each other&apos;s deck.</p>
      </>
    );

  return (
    <div className="event-join">
      <EventHeader event={event} members={count} />
      <div className="card stack">{body}</div>
    </div>
  );
}
