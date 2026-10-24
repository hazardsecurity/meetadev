import type { Metadata } from "next";
import Link from "next/link";
import { AyoSays } from "@/components/Ayo";
import { CitiesEditor } from "@/components/CitiesEditor";
import { requireMember } from "@/lib/auth";
import { tidyCities } from "@/lib/cities";
import { CommunityCard } from "@/components/CommunityCard";
import { communitiesInCities } from "@/lib/communities";
import { eventsInCities, knownCities } from "@/lib/events";
import { formatDate } from "@/lib/format";
import { profileOf } from "@/lib/people";

export const metadata: Metadata = {
  title: "Find events",
  description: "DevFest and GDG events happening in your cities.",
};

export default async function DiscoverPage({ searchParams }: PageProps<"/discover">) {
  const sp = await searchParams;
  // Only for people who've made their badge; others sign in / onboard first.
  const me = await requireMember("/discover");
  const profile = await profileOf(me.id);
  const asked = typeof sp.city === "string" ? tidyCities(sp.city.split(",")) : [];
  const cities = asked.length ? asked : (profile?.cities ?? []);
  const [events, suggestions, communities] = await Promise.all([eventsInCities(cities, me.id), knownCities(), communitiesInCities(cities)]);

  return (
    <div className="stack narrow" style={{ "--gap": "24px" } as React.CSSProperties}>
      <h1 className="h1">Find events</h1>

      <div className="card">
        {profile && !asked.length ? (
          <CitiesEditor initial={profile.cities} suggestions={suggestions} />
        ) : (
          <form action="/discover" className="stack" style={{ "--gap": "10px" } as React.CSSProperties}>
            <label htmlFor="city" className="label">Which city?</label>
            <div className="row" style={{ flexWrap: "nowrap" }}>
              <input id="city" name="city" className="input" list="known-cities" defaultValue={asked.join(", ")} placeholder="Ilorin, Lagos" required />
              <button className="btn btn--sm" style={{ minHeight: 50 }}>Search</button>
            </div>
            <datalist id="known-cities">{suggestions.map((c) => <option key={c} value={c} />)}</datalist>
            <span className="hint">
              Separate cities with commas. <Link className="link" href="/discover">Back to your cities</Link>
            </span>
          </form>
        )}
      </div>

      {cities.length === 0 ? (
        <AyoSays mood="wave" size={84}>Add your city and I&apos;ll show you every DevFest and GDG event there.</AyoSays>
      ) : events.length === 0 ? (
        <AyoSays mood="thinking" size={84}>
          {`No upcoming events in ${cities.join(", ")} yet. Add a nearby city, or check back closer to DevFest season.`}
        </AyoSays>
      ) : (
        <div className="stack">
          {events.map((e, n) => (
            <Link key={e.id} href={`/e/${e.slug}`} className="person event-card">
              <span className={`event-card__mark avatar--${n % 4}`} aria-hidden>{e.name.slice(0, 1).toUpperCase()}</span>
              <span style={{ minWidth: 0 }}>
                <span className="person__name" style={{ display: "block" }}>{e.name}</span>
                <span className="person__meta">
                  {[`📍 ${e.city}`, e.starts_on ? formatDate(e.starts_on) : "Date to be announced", `${e.members} ${e.members === 1 ? "person" : "people"}`].join(" · ")}
                </span>
              </span>
              {e.is_member ? <span className="chip chip--green">Joined</span> : e.require_code ? <span className="chip">Needs code</span> : <span className="chip chip--blue">Open</span>}
            </Link>
          ))}
        </div>
      )}


      {communities.length > 0 && (
        <section className="stack">
          <h2 className="h2">Communities in your cities</h2>
          {communities.map((c) => <CommunityCard key={c.id} c={c} />)}
        </section>
      )}
    </div>
  );
}
