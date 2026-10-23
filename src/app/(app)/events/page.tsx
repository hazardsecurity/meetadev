import type { Metadata } from "next";
import Link from "next/link";
import { AyoSays } from "@/components/Ayo";
import { JoinCodeForm } from "@/components/EventForms";
import { requireMember } from "@/lib/auth";
import { myEvents } from "@/lib/events";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Your events" };

export default async function EventsPage({ searchParams }: PageProps<"/events">) {
  const left = !!(await searchParams).left;
  const me = await requireMember("/events");
  const events = await myEvents(me.id);

  return (
    <div className="stack narrow" style={{ "--gap": "24px" } as React.CSSProperties}>
      {left && <p className="card card--green">You&apos;ve left that event.</p>}
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 className="h1">Your events</h1>
        <Link className="btn btn--white btn--sm" href="/events/new">+ Create an event</Link>
      </div>

      {events.length === 0 && (
        <div className="card">
          <AyoSays mood="wave" size={84}>
            You haven&apos;t joined an event yet. Open the invite link your organisers shared, or type their join code below.
          </AyoSays>
        </div>
      )}

      {events.map((e, n) => (
        <Link key={e.id} href={`/e/${e.slug}`} className="person event-card">
          <span className={`event-card__mark avatar--${n % 4}`} aria-hidden>{e.name.slice(0, 1).toUpperCase()}</span>
          <span style={{ minWidth: 0 }}>
            <span className="person__name" style={{ display: "block" }}>{e.name}</span>
            <span className="person__meta">
              {[e.city, formatDate(e.starts_on), `${e.members} ${e.members === 1 ? "person" : "people"}`].filter(Boolean).join(" · ")}
            </span>
          </span>
          {e.role === "organizer" && <span className="chip chip--blue">Organiser</span>}
        </Link>
      ))}

      <div className="card"><JoinCodeForm /></div>

      <div className="card card--blue stack" style={{ "--gap": "10px" } as React.CSSProperties}>
        <h2 className="h2">Organising a DevFest or GDG event?</h2>
        <p className="muted">Create a space for it in a minute. You get an invite link, a QR code for your slides and a join code.</p>
        <Link className="btn" href="/events/new" style={{ justifySelf: "start" }}>Create an event</Link>
      </div>
    </div>
  );
}
