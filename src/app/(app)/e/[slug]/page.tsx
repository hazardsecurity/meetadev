import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LeaveEvent } from "@/components/OrganiserTools";
import { AyoSays } from "@/components/Ayo";
import { Avatar } from "@/components/Avatar";
import { EventHeader } from "@/components/EventHeader";
import { JoinEvent } from "@/components/JoinEvent";
import { PersonCard } from "@/components/PersonCard";
import { SwipeDeck } from "@/components/SwipeDeck";
import { currentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { CHECKIN_REQUIRED, eventBySlug, hereCount, isBanned, isHere, memberCount, membership, type Event } from "@/lib/events";
import { isAdmin } from "@/lib/organizers";
import { INTENTS, LEVELS, ROLES, STACK } from "@/lib/options";
import { connectionsHere, deck, directory, profileOf, suggestions, type PublicProfile } from "@/lib/people";
import { jsonLd, noindex, SITE_URL } from "@/lib/site";

// schema.org Event, so listed events can show in Google's event results.
function eventLd(e: Event) {
  if (!e.listed || !e.starts_on) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: e.name,
    startDate: e.starts_on,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    description: e.about || `Developer community event${e.city ? ` in ${e.city}` : ""}.`,
    url: `${SITE_URL}/e/${e.slug}`,
    location: { "@type": "Place", name: e.city, address: { "@type": "PostalAddress", addressLocality: e.city } },
    organizer: { "@type": "Organization", name: e.name.replace(/\s+\d{4}$/, ""), url: `${SITE_URL}/e/${e.slug}` },
  };
}

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v.slice(0, 80) : "");

export async function generateMetadata({ params }: PageProps<"/e/[slug]">): Promise<Metadata> {
  const event = await eventBySlug((await params).slug);
  if (!event) return { title: "Event not found", ...noindex };
  const where = event.city ? ` in ${event.city}` : "";
  return {
    title: event.name,
    description: event.about || `Join ${event.name}${where} on meetadev and find the people you should meet: mentors, learners, collaborators and teams that are hiring.`,
    alternates: { canonical: `/e/${event.slug}` },
    // Organisers who hide an event from "Find events" keep it out of Google too.
    robots: event.listed ? { index: true, follow: true } : { index: false, follow: false },
  };
}

export default async function EventPage({ params, searchParams }: PageProps<"/e/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const event = await eventBySlug(slug);
  if (!event) notFound();

  // Independent lookups run together: each is a trip to the database.
  const [community, me] = await Promise.all([
    event.community_id
      ? query<{ slug: string; name: string }>("SELECT slug, name FROM communities WHERE id = $1 AND status = 'active'", [event.community_id]).then((r) => r[0] ?? null)
      : null,
    currentUser(),
  ]);
  const code = one(sp.code).toUpperCase();
  const here = `/e/${slug}${code ? `?code=${encodeURIComponent(code)}` : ""}`;
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
        <JoinEvent slug={slug} name={event.name} firstName={(me.name ?? "").split(" ")[0]} />
      );
    }
    const ld = eventLd(event);
    return (
      <div className="event-join">
        {ld && <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />}
        <EventHeader event={event} members={count} community={community} />
        {action}
        {isAdmin(me) && <Link className="btn btn--white btn--sm" href={`/e/${slug}/manage`} style={{ justifySelf: "start" }}>Organiser tools (admin)</Link>}
      </div>
    );
  }

  return <Directory event={event} community={community} viewerId={me.id} viewerName={me.name ?? ""} organiser={role === "organizer" || isAdmin(me)} sp={sp} />;
}

async function Directory({ event, community, viewerId, viewerName, organiser, sp }: {
  event: Event; community: { slug: string; name: string } | null; viewerId: string; viewerName: string; organiser: boolean; sp: Record<string, string | string[] | undefined>;
}) {
  const filters = { q: one(sp.q).trim(), role: one(sp.role), level: one(sp.level), intent: one(sp.intent), stack: one(sp.stack) };
  const page = Math.max(0, Number.parseInt(one(sp.page) || "0", 10) || 0);
  const filtering = Object.values(filters).some(Boolean);
  // The deck is the event's main screen; People is the directory, for searching and browsing.
  const deckView = !filtering && page === 0 && one(sp.view) !== "people";
  const [profile, count, here] = await Promise.all([profileOf(viewerId), memberCount(event.id), isHere(event.id, viewerId)]);
  const base = `/e/${event.slug}`;
  const views = (
    <nav className="seg" aria-label="Event views">
      <Link href={base} className={deckView ? "on" : undefined} aria-current={deckView ? "page" : undefined}>Deck</Link>
      <Link href={`${base}?view=people`} className={deckView ? undefined : "on"} aria-current={deckView ? undefined : "page"}>People</Link>
    </nav>
  );

  return (
    // The deck view is one column, the width of a card: switch, status, deck and Leave all line up.
    <div className={deckView ? "stack deck-page" : "stack"} style={{ "--gap": "24px" } as React.CSSProperties}>
      {deckView ? (
        // The deck gets the screen: the event's name is already in the top bar.
        <>
          <div className="stack" style={{ "--gap": "12px" } as React.CSSProperties}>
            {views}
            {(here || organiser) && (
              <div className="row" style={{ justifyContent: "space-between" }}>
                {here && CHECKIN_REQUIRED && <span className="chip chip--green"><span className="live" aria-hidden />You&apos;re here</span>}
                {organiser && <Link className="btn btn--white btn--sm" href={`${base}/manage`}>Organiser tools</Link>}
              </div>
            )}
          </div>
          {sp.joined && <p className="card card--green success">{CHECKIN_REQUIRED ? <>You&apos;re in! Check in at the venue and the deck fills with people who are there.</> : <>You&apos;re in! Swipe through the people at {event.name} and tap Meet on the ones you&apos;d like to meet.</>}</p>}
          {sp.blocked && <p className="card card--green">Blocked. You won&apos;t see each other any more.</p>}
        </>
      ) : (
        <>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
            <EventHeader event={event} members={count} compact community={community} />
            <div className="row">
              <Link className="btn btn--yellow btn--sm" href={`${base}/leaderboard`}>🏆 Leaderboard</Link>
              {organiser && <Link className="btn btn--white btn--sm" href={`${base}/manage`}>Organiser tools</Link>}
            </div>
          </div>
          {sp.joined && <p className="card card--green success">{CHECKIN_REQUIRED ? <>You&apos;re in! Check in at the venue and the deck fills with people who are there.</> : <>You&apos;re in! Swipe through the people at {event.name} and tap Meet on the ones you&apos;d like to meet.</>}</p>}
          {sp.blocked && <p className="card card--green">Blocked. You won&apos;t see each other any more.</p>}
          {views}
        </>
      )}

      {deckView && profile ? (
        <Suspense fallback={<DeckSkeleton />}>
          <DeckView event={event} profile={profile} joined={count} here={here} />
        </Suspense>
      ) : (
        <People event={event} viewerId={viewerId} viewerName={viewerName} profile={profile} filters={filters} filtering={filtering} page={page} />
      )}

      <section className="leave-zone">
        <p className="muted">Not going any more?</p>
        <LeaveEvent slug={event.slug} name={event.name} />
      </section>
    </div>
  );
}

function DeckSkeleton() {
  return (
    <div className="deck-wrap skeleton" aria-busy="true" aria-label="Loading the deck">
      <div className="dcard">
        <div className="dcard__top"><span className="skeleton__dot skeleton__dot--face" /></div>
        <div className="dcard__body">
          <span className="skeleton__line skeleton__line--title" />
          <span className="skeleton__line skeleton__line--short" />
          <span className="skeleton__line" />
          <span className="skeleton__line" />
        </div>
      </div>
    </div>
  );
}

const names = (people: { name: string }[]) => {
  const first = people.map((p) => p.name.split(" ")[0]);
  return first.length <= 2 ? first.join(" and ") : `${first.slice(0, 2).join(", ")} and ${first.length - 2} more`;
};

async function DeckView({ event, profile, joined, here }: { event: Event; profile: PublicProfile; joined: number; here: boolean }) {
  if (!here)
    return (
      <div className="empty">
        <AyoSays mood="thinking" side="below">
          Check in to start meeting people. Scan the check-in code on a poster or the big screen at the venue: the deck only shows people who are there.
        </AyoSays>
        <Link className="btn btn--white" href={`/e/${event.slug}?view=people`}>Browse people</Link>
      </div>
    );

  const [cards, friends, hereNow] = await Promise.all([deck(profile, event.id), connectionsHere(profile.user_id, event.id), hereCount(event.id)]);
  return (
    <section className="stack" style={{ "--gap": "14px" } as React.CSSProperties}>
      {friends.length > 0 && (
        <Link className="strip" href={friends.length === 1 ? `/chat/${friends[0].handle}` : "/connections"}>
          <span className="faces" aria-hidden>
            {friends.slice(0, 3).map((f) => <Avatar key={f.user_id} name={f.name} color={f.color} photo={f.photo_url} size={32} />)}
          </span>
          <span><b>{names(friends)}</b> {friends.length === 1 ? "is" : "are"} {CHECKIN_REQUIRED ? "here" : "going"} too</span>
          <span className="strip__go">Chat</span>
        </Link>
      )}
      <SwipeDeck slug={event.slug} cards={cards} me={{ name: profile.name, color: profile.color, photo_url: profile.photo_url }} waiting={joined - hereNow} checkin={CHECKIN_REQUIRED} />
    </section>
  );
}

async function People({ event, viewerId, viewerName, profile, filters, filtering, page }: {
  event: Event; viewerId: string; viewerName: string; profile: PublicProfile | null;
  filters: { q: string; role: string; level: string; intent: string; stack: string }; filtering: boolean; page: number;
}) {
  const [{ people, hasMore }, picks] = await Promise.all([
    directory(viewerId, event.id, filters, page),
    filtering || page > 0 || !profile ? Promise.resolve([]) : suggestions(profile, event.id),
  ]);
  const base = `/e/${event.slug}`;
  const qs = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ view: "people", ...filters, ...patch });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    return `${base}?${p}`;
  };
  const first = viewerName.split(" ")[0];

  return (
    <>
      {picks.length > 0 && (
        <section className="stack">
          <AyoSays mood="wave" size={84}>
            {`${first}, here ${picks.length === 1 ? "is someone" : `are ${picks.length} people`} I think you should meet.`}
          </AyoSays>
          <div className="grid-people">
            {picks.map((p) => <PersonCard key={p.user_id} person={p} reason={p.reason} slug={event.slug} />)}
          </div>
        </section>
      )}

      <section className="stack">
        <h2 className="h2">Everyone at {event.name}</h2>
        <form className="filters" action={base}>
          <input type="hidden" name="view" value="people" />
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
          {filtering && <Link className="chip" href={`${base}?view=people`}>✕ Clear filters</Link>}
        </div>

        <p className="hint">Meet is private. They only find out if they want to meet you too.</p>

        {people.length ? (
          <div className="grid-people">{people.map((p) => <PersonCard key={p.user_id} person={p} slug={event.slug} />)}</div>
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
    </>
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
