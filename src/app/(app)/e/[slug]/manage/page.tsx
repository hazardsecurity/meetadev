import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AyoSays } from "@/components/Ayo";
import { EventForm } from "@/components/EventForms";
import { InviteQR } from "@/components/InviteQR";
import { CheckinTools, CodeTools, DeleteEvent, LeaveEvent, MemberList, Reports } from "@/components/OrganiserTools";
import { requireMember } from "@/lib/auth";
import { eventCommunityOptions } from "@/lib/communities";
import { CHECKIN_REQUIRED, checkinKey, eventBySlug, eventReports, eventStats, members, membership } from "@/lib/events";
import { isAdmin } from "@/lib/organizers";

export const metadata: Metadata = { title: "Organiser tools", robots: { index: false } };

export default async function ManagePage({ params, searchParams }: PageProps<"/e/[slug]/manage">) {
  const { slug } = await params;
  const created = !!(await searchParams).created;
  const me = await requireMember(`/e/${slug}/manage`);
  const event = await eventBySlug(slug);
  if (!event) notFound();
  const role = await membership(event.id, me.id);
  const admin = isAdmin(me);
  if (role !== "organizer" && !admin) redirect(`/e/${slug}`);

  const [stats, list, reports, communities, key] = await Promise.all([
    eventStats(event.id), members(event.id), eventReports(event.id), eventCommunityOptions(me.id, admin, event), checkinKey(event.id),
  ]);
  const invite = `/e/${slug}?code=${event.join_code}`;
  // The funnel is the core loop counted: each step is people, drawn to scale against everyone who joined.
  const funnel = [
    { label: "Joined", n: stats.joined, of: "" },
    ...(CHECKIN_REQUIRED ? [{ label: "Here", n: stats.here, of: "joined", prev: stats.joined }] : []),
    { label: "Swiped", n: stats.swiped, of: CHECKIN_REQUIRED ? "here" : "joined", prev: CHECKIN_REQUIRED ? stats.here : stats.joined },
    { label: "Matched", n: stats.matched, of: "swipers", prev: stats.swiped },
    { label: "Met", n: stats.met, of: "matched", prev: stats.matched },
  ];

  return (
    <div className="stack" style={{ "--gap": "24px" } as React.CSSProperties}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="stack" style={{ "--gap": "4px" } as React.CSSProperties}>
          <p className="eyebrow">Organiser tools</p>
          <h1 className="h1" style={{ overflowWrap: "anywhere" }}>{event.name}</h1>
        </div>
        <div className="row">
          <Link className="btn btn--white btn--sm" href={`/e/${slug}/leaderboard`}>🏆 Leaderboard</Link>
          <Link className="btn btn--white btn--sm" href={`/e/${slug}/screen`} target="_blank">Show on screen ↗</Link>
          <Link className="btn btn--sm" href={`/e/${slug}`}>Open the deck</Link>
        </div>
      </div>

      {created && (
        <div className="card card--green">
          <AyoSays mood="excited" size={84}>Your event is live! Share the invite link or put the QR code on your slides.</AyoSays>
        </div>
      )}

      <div className="manage">
        <div className="stack manage__invite">
          <section className="card stack">
            <h2 className="h2">Invite people</h2>
            <InviteQR path={invite} title={event.name} />
            <CodeTools slug={slug} code={event.join_code} />
            <p className="hint" style={{ textAlign: "center" }}>
              Anyone who opens the event page can join, code or not. The code is a shortcut for people typing it in.
            </p>
          </section>

          {CHECKIN_REQUIRED && <section className="card stack">
            <h2 className="h2">Check-in code</h2>
            <InviteQR path={`/e/${slug}/checkin?k=${key}`} title={`Check in to ${event.name}`} linkName="check-in link" />
            <CheckinTools slug={slug} />
            <p className="hint" style={{ textAlign: "center" }}>
              Put it up at the venue only. Scanning it is what makes someone &ldquo;here&rdquo;, and only people who are here show up in the deck.
            </p>
          </section>}
        </div>

        <div className="stack">
          <section className="card stack">
            <h2 className="h2">{CHECKIN_REQUIRED ? "Today so far" : "So far"}</h2>
            <div className="funnel" role="table" aria-label="How many people reached each step">
              {funnel.map((f) => (
                <div key={f.label} className="funnel__step" role="row">
                  <b role="rowheader">{f.label}</b>
                  <span role="cell" aria-hidden>
                    <span className={`funnel__bar ${f.label === "Met" ? "funnel__bar--goal" : ""}`} style={{ width: `${stats.joined ? (100 * f.n) / stats.joined : 0}%` }} />
                  </span>
                  <span role="cell" className="funnel__n">{f.n}</span>
                  <span role="cell" className="hint">{f.prev === undefined ? "Everyone with the event" : `${f.prev ? Math.round((100 * f.n) / f.prev) : 0}% of ${f.of}`}</span>
                </div>
              ))}
            </div>
            <p className="hint">{stats.matches} {stats.matches === 1 ? "match" : "matches"} so far, and {stats.meetings} of them met in person. Swiped means they said Meet or Pass at least once.</p>
          </section>

          <section className="card stack">
            <h2 className="h2">Reports {reports.length > 0 && <span className="badge-count">{reports.length}</span>}</h2>
            <Reports slug={slug} list={reports} />
          </section>

          <section className="card stack">
            <h2 className="h2">Members</h2>
            <MemberList slug={slug} me={me.id} list={list} checkin={CHECKIN_REQUIRED} />
          </section>

          <section className="card stack">
            <h2 className="h2">Event details</h2>
            <EventForm event={event} communities={communities} />
          </section>

          {role && <LeaveEvent slug={slug} />}

          <section className="card stack danger-zone">
            <h2 className="h2">Delete event</h2>
            <DeleteEvent slug={slug} name={event.name} />
          </section>
        </div>
      </div>
    </div>
  );
}
