import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AyoSays } from "@/components/Ayo";
import { EventForm } from "@/components/EventForms";
import { InviteQR } from "@/components/InviteQR";
import { CodeTools, LeaveEvent, MemberList, Reports } from "@/components/OrganiserTools";
import { requireMember } from "@/lib/auth";
import { myCommunities } from "@/lib/communities";
import { eventBySlug, eventReports, eventStats, members, membership } from "@/lib/events";

export const metadata: Metadata = { title: "Organiser tools", robots: { index: false } };

export default async function ManagePage({ params, searchParams }: PageProps<"/e/[slug]/manage">) {
  const { slug } = await params;
  const created = !!(await searchParams).created;
  const me = await requireMember(`/e/${slug}/manage`);
  const event = await eventBySlug(slug);
  if (!event) notFound();
  if ((await membership(event.id, me.id)) !== "organizer") redirect(`/e/${slug}`);

  const [stats, list, reports, communities] = await Promise.all([eventStats(event.id), members(event.id), eventReports(event.id), myCommunities(me.id)]);
  const invite = `/e/${slug}?code=${event.join_code}`;

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
          <Link className="btn btn--sm" href={`/e/${slug}`}>Open directory</Link>
        </div>
      </div>

      {created && (
        <div className="card card--green">
          <AyoSays mood="excited" size={84}>Your event is live! Share the invite link or put the QR code on your slides.</AyoSays>
        </div>
      )}

      <div className="manage">
        <section className="card stack manage__invite">
          <h2 className="h2">Invite people</h2>
          <InviteQR path={invite} title={event.name} />
          <CodeTools slug={slug} code={event.join_code} />
          <p className="hint" style={{ textAlign: "center" }}>
            {event.require_code
              ? "The invite link includes the code. Anyone opening the plain event page has to type it."
              : "Anyone with the event page link can join. The code is a shortcut for people typing it in."}
          </p>
        </section>

        <div className="stack">
          <section className="stats stats--4">
            <Stat n={stats.members} label="People joined" />
            <Stat n={stats.connections} label="Connections made" />
            <Stat n={stats.mentors} label="Mentors" />
            <Stat n={stats.mentees} label="Want a mentor" />
          </section>

          <section className="card stack">
            <h2 className="h2">Reports {reports.length > 0 && <span className="badge-count">{reports.length}</span>}</h2>
            <Reports slug={slug} list={reports} />
          </section>

          <section className="card stack">
            <h2 className="h2">Members</h2>
            <MemberList slug={slug} me={me.id} list={list} />
          </section>

          <section className="card stack">
            <h2 className="h2">Event details</h2>
            <EventForm event={event} communities={communities} />
          </section>

          <LeaveEvent slug={slug} />
        </div>
      </div>
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return <div className="card stat"><strong>{n}</strong><span>{label}</span></div>;
}
