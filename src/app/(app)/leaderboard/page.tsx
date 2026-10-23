import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AyoSays } from "@/components/Ayo";
import { requireMember } from "@/lib/auth";
import { eventBySlug, membership, myEvents } from "@/lib/events";

export const metadata: Metadata = { title: "Leaderboard" };

// The Leaderboard tab: open the board for the event you're in right now.
export default async function LeaderboardTab() {
  const me = await requireMember("/leaderboard");
  const last = (await cookies()).get("dfi_event")?.value;
  const lastEvent = last ? await eventBySlug(last) : null;
  if (lastEvent && (await membership(lastEvent.id, me.id))) redirect(`/e/${lastEvent.slug}/leaderboard`);

  const events = await myEvents(me.id);
  if (events.length === 1) redirect(`/e/${events[0].slug}/leaderboard`);

  return (
    <div className="stack narrow" style={{ "--gap": "20px" } as React.CSSProperties}>
      <h1 className="h1">Leaderboard</h1>
      {events.length === 0 ? (
        <>
          <AyoSays mood="thinking" size={84}>
            Each event has its own leaderboard. Join an event, connect with people there, and you&apos;ll show up on it.
          </AyoSays>
          <Link className="btn" href="/discover" style={{ justifySelf: "start" }}>Find events</Link>
        </>
      ) : (
        <>
          <AyoSays mood="happy" size={84}>Which event&apos;s leaderboard do you want to see?</AyoSays>
          {events.map((e) => (
            <Link key={e.id} href={`/e/${e.slug}/leaderboard`} className="person event-card">
              <span className="event-card__mark avatar--2" aria-hidden>🏆</span>
              <span style={{ minWidth: 0 }}>
                <span className="person__name" style={{ display: "block" }}>{e.name}</span>
                <span className="person__meta">{e.members} {e.members === 1 ? "person" : "people"}</span>
              </span>
            </Link>
          ))}
        </>
      )}
    </div>
  );
}
