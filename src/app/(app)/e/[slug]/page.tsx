import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AyoSays } from "@/components/Ayo";
import { EventHeader } from "@/components/EventHeader";
import { JoinEvent } from "@/components/JoinEvent";
import { PersonCard } from "@/components/PersonCard";
import { currentUser } from "@/lib/auth";
import { eventBySlug, isBanned, memberCount, membership, type Event } from "@/lib/events";
import { INTENTS, LEVELS, ROLES, STACK } from "@/lib/options";
import { directory, profileOf, suggestions } from "@/lib/people";

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v.slice(0, 80) : "");

export async function generateMetadata({ params }: PageProps<"/e/[slug]">): Promise<Metadata> {
  const event = await eventBySlug((await params).slug);
  return event
    ? { title: event.name, description: `Find the people you should meet at ${event.name}.`, robots: { index: false } }
    : { title: "Event not found" };
}

export default async function EventPage({ params, searchParams }: PageProps<"/e/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const event = await eventBySlug(slug);
  if (!event) notFound();

  const code = one(sp.code).toUpperCase();
  const here = `/e/${slug}${code ? `?code=${encodeURIComponent(code)}` : ""}`;
  const me = await currentUser();
  const role = me ? await membership(event.id, me.id) : null;

  if (!me?.onboarded || !role) {
    const count = await memberCount(event.id);
    let action: React.ReactNode;
    if (!me) {
      action = (
        <div className="card stack">
          <AyoSays mood="wave" size={84}>Hi! I&apos;m Ayo. Sign in with Google and I&apos;ll show you who to meet here.</AyoSays>
          <Link className="btn btn--white btn--block btn--google" href={`/login?next=${encodeURIComponent(here)}`}>Sign in with Google to join</Link>
        </div>
      );
    } else if (!me.onboarded) {
      action = (
        <div className="card stack">
          <AyoSays mood="happy" size={84}>First, let&apos;s make your badge. It takes a minute, and it works at every event.</AyoSays>
          <Link className="btn btn--green btn--block" href={`/onboarding?next=${encodeURIComponent(here)}`}>Make my badge</Link>
        </div>
      );
    } else if (await isBanned(event.id, me.id)) {
      action = (
        <div className="card">
          <AyoSays mood="sad" size={84}>The organisers of this event have removed you, so you can&apos;t rejoin.</AyoSays>
        </div>
      );
    } else {
      action = (
        <JoinEvent slug={slug} name={event.name} firstName={(me.name ?? "").split(" ")[0]}
          needsCode={event.require_code && code !== event.join_code} code={code} />
      );
    }
    return (
      <div className="event-join">
        <EventHeader event={event} members={count} />
        {action}
      </div>
    );
  }

  return <Directory event={event} viewerId={me.id} viewerName={me.name ?? ""} organiser={role === "organizer"} sp={sp} />;
}

async function Directory({ event, viewerId, viewerName, organiser, sp }: {
  event: Event; viewerId: string; viewerName: string; organiser: boolean; sp: Record<string, string | string[] | undefined>;
}) {
  const filters = { q: one(sp.q).trim(), role: one(sp.role), level: one(sp.level), intent: one(sp.intent), stack: one(sp.stack) };
  const page = Math.max(0, Number.parseInt(one(sp.page) || "0", 10) || 0);
  const filtering = Object.values(filters).some(Boolean);
  const profile = await profileOf(viewerId);
  const [{ people, hasMore }, picks, count] = await Promise.all([
    directory(viewerId, event.id, filters, page),
    filtering || page > 0 || !profile ? Promise.resolve([]) : suggestions(profile, event.id),
    memberCount(event.id),
  ]);
  const base = `/e/${event.slug}`;
  const qs = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ ...filters, ...patch });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    return p.size ? `${base}?${p}` : base;
  };
  const first = viewerName.split(" ")[0];

  return (
    <div className="stack" style={{ "--gap": "28px" } as React.CSSProperties}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
        <EventHeader event={event} members={count} compact />
        {organiser && <Link className="btn btn--white btn--sm" href={`${base}/manage`}>Organiser tools</Link>}
      </div>

      {sp.joined && <p className="card card--green success">You&apos;re in! Here&apos;s who&apos;s at {event.name}.</p>}
      {sp.blocked && <p className="card card--green">Blocked. You won&apos;t see each other any more.</p>}

      {picks.length > 0 && (
        <section className="stack">
          <AyoSays mood="wave" size={84}>
            {`${first}, here ${picks.length === 1 ? "is someone" : `are ${picks.length} people`} I think you should meet.`}
          </AyoSays>
          <div className="grid-people">
            {picks.map((p) => <PersonCard key={p.user_id} person={p} reason={p.reason} />)}
          </div>
        </section>
      )}

      <section className="stack">
        <h2 className="h2">Everyone here</h2>
        <form className="filters" action={base}>
          <input className="input" type="search" name="q" defaultValue={filters.q} placeholder="Search names, intros…" aria-label="Search" />
          <Select name="role" label="Any role" value={filters.role} options={ROLES.map((r) => [r.id, r.label])} />
          <Select name="level" label="Any level" value={filters.level} options={LEVELS.map((l) => [l.id, l.label])} />
          <Select name="intent" label="Here for anything" value={filters.intent} options={INTENTS.map((i) => [i.id, i.label])} />
          <Select name="stack" label="Any stack" value={filters.stack} options={STACK.map((s) => [s, s])} />
          <button className="btn btn--sm" style={{ minHeight: 50 }}>Search</button>
        </form>

        <div className="chips" aria-label="Quick filters">
          <Link className="chip chip--yellow" href={qs({ intent: "mentoring", page: "" })}>🧑‍🏫 Mentors</Link>
          <Link className="chip chip--green" href={qs({ intent: "hiring", page: "" })}>💼 Hiring</Link>
          <Link className="chip chip--blue" href={qs({ intent: "mentor_wanted", page: "" })}>🌱 Wants a mentor</Link>
          <Link className="chip chip--red" href={qs({ intent: "cofounder", page: "" })}>🚀 Co-founders</Link>
          {filtering && <Link className="chip" href={base}>✕ Clear filters</Link>}
        </div>

        {people.length ? (
          <div className="grid-people">{people.map((p) => <PersonCard key={p.user_id} person={p} />)}</div>
        ) : (
          <div className="empty">
            <AyoSays mood={filtering ? "thinking" : "happy"} side="below">
              {filtering ? "Nobody matches that yet. Try fewer filters." : "You're early! Share the invite link so others can join."}
            </AyoSays>
          </div>
        )}

        {(page > 0 || hasMore) && (
          <div className="row" style={{ justifyContent: "center" }}>
            {page > 0 && <Link className="btn btn--white btn--sm" href={qs({ page: String(page - 1) })}>Previous</Link>}
            {hasMore && <Link className="btn btn--white btn--sm" href={qs({ page: String(page + 1) })}>More people</Link>}
          </div>
        )}
      </section>
    </div>
  );
}

function Select({ name, label, value, options }: { name: string; label: string; value: string; options: [string, string][] }) {
  return (
    <select className="select" name={name} defaultValue={value} aria-label={label}>
      <option value="">{label}</option>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}
