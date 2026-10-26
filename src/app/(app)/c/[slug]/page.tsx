import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AyoSays } from "@/components/Ayo";
import { communityBySlug } from "@/lib/communities";
import { kindLabel } from "@/lib/community-kinds";
import { query } from "@/lib/db";
import type { Event } from "@/lib/events";
import { formatDate } from "@/lib/format";
import { jsonLd, SITE_URL } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/c/[slug]">): Promise<Metadata> {
  const c = await communityBySlug((await params).slug);
  if (!c || c.status !== "active") return { title: "Community not found", robots: { index: false, follow: false } };
  const where = [c.city, c.country].filter(Boolean).join(", ");
  return {
    title: `${c.name} · ${c.city}`,
    description: `${c.name} is a ${kindLabel(c.kind).toLowerCase()} in ${where}. See its upcoming events on meetadev and meet the developers going.`,
    alternates: { canonical: `/c/${c.slug}` },
    robots: { index: true, follow: true },
  };
}

// Public page for a developer community: who they are and their upcoming events.
export default async function CommunityPage({ params }: PageProps<"/c/[slug]">) {
  const { slug } = await params;
  const c = await communityBySlug(slug);
  if (!c || c.status !== "active") notFound();
  const events = await query<Event & { members: number }>(
    `SELECT e.id, e.slug, e.name, e.city, to_char(e.starts_on, 'YYYY-MM-DD') AS starts_on, e.about,
            (SELECT count(*)::int FROM event_members m WHERE m.event_id = e.id) AS members
       FROM events e
      WHERE e.community_id = $1 AND e.listed AND (e.starts_on IS NULL OR e.starts_on >= current_date - 1)
      ORDER BY e.starts_on ASC NULLS LAST`,
    [c.id],
  );
  const ld = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: c.name,
    url: `${SITE_URL}/c/${c.slug}`,
    ...(c.url ? { sameAs: [c.url] } : {}),
    address: { "@type": "PostalAddress", addressLocality: c.city, addressCountry: c.country || undefined },
  };

  return (
    <div className="stack narrow" style={{ "--gap": "24px" } as React.CSSProperties}>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
      <div className="event-head">
        <div className="event-head__band" aria-hidden><i /><i /><i /><i /></div>
        <p className="eyebrow">{kindLabel(c.kind)} · {[c.city, c.country].filter(Boolean).join(", ")}</p>
        <h1 className="h1" style={{ overflowWrap: "anywhere" }}>{c.name}</h1>
        {c.url && <a className="link" href={c.url} target="_blank" rel="noopener noreferrer nofollow" style={{ overflowWrap: "anywhere" }}>Community page ↗</a>}
      </div>

      <section className="stack">
        <h2 className="h2">Upcoming events</h2>
        {events.length ? (
          events.map((e, n) => (
            <Link key={e.id} href={`/e/${e.slug}`} className="person event-card">
              <span className={`event-card__mark avatar--${n % 4}`} aria-hidden>{e.name.slice(0, 1).toUpperCase()}</span>
              <span style={{ minWidth: 0 }}>
                <span className="person__name" style={{ display: "block" }}>{e.name}</span>
                <span className="person__meta">{[e.starts_on ? formatDate(e.starts_on) : "Date to be announced", `${e.members} going`].join(" · ")}</span>
              </span>
              <span className="chip chip--blue">Open</span>
            </Link>
          ))
        ) : (
          <AyoSays mood="thinking" size={84}>{`No upcoming events from ${c.name} on meetadev yet. Check back closer to their next meetup.`}</AyoSays>
        )}
      </section>
    </div>
  );
}
