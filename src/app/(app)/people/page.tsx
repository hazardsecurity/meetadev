import type { Metadata } from "next";
import Link from "next/link";
import { AyoSays } from "@/components/Ayo";
import { PersonCard } from "@/components/PersonCard";
import { requireMember } from "@/lib/auth";
import { INTENTS, LEVELS, ROLES, STACK } from "@/lib/options";
import { directory, profileOf, suggestions, totalAttendees } from "@/lib/people";

export const metadata: Metadata = { title: "People" };

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v.slice(0, 80) : "");

export default async function PeoplePage({ searchParams }: PageProps<"/people">) {
  const sp = await searchParams;
  const me = await requireMember("/people");
  const filters = { q: one(sp.q).trim(), role: one(sp.role), level: one(sp.level), intent: one(sp.intent), stack: one(sp.stack) };
  const page = Math.max(0, Number.parseInt(one(sp.page) || "0", 10) || 0);
  const filtering = Object.values(filters).some(Boolean);

  const profile = await profileOf(me.id);
  const [{ people, hasMore }, picks, total] = await Promise.all([
    directory(me.id, filters, page),
    filtering || page > 0 || !profile ? Promise.resolve([]) : suggestions(profile),
    totalAttendees(),
  ]);

  const qs = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ ...filters, ...patch });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    return `/people?${p}`;
  };

  return (
    <div className="stack" style={{ "--gap": "28px" } as React.CSSProperties}>
      {sp.blocked && <p className="card card--green">Blocked. You won&apos;t see each other any more.</p>}

      {picks.length > 0 && (
        <section className="stack">
          <AyoSays mood="wave" size={84}>
            {`${me.name.split(" ")[0]}, here are ${picks.length === 1 ? "someone" : `${picks.length} people`} I think you should meet.`}
          </AyoSays>
          <div className="grid-people">
            {picks.map((p) => <PersonCard key={p.user_id} person={p} reason={p.reason} />)}
          </div>
        </section>
      )}

      <section className="stack">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h1 className="h2">Everyone at DevFest Ilorin</h1>
          <span className="eyebrow">{total} on Connect</span>
        </div>

        <form className="filters" action="/people">
          <input className="input" type="search" name="q" defaultValue={filters.q} placeholder="Search names, intros…" aria-label="Search" />
          <Select name="role" label="Any role" value={filters.role} options={ROLES.map((r) => [r.id, r.label])} />
          <Select name="level" label="Any level" value={filters.level} options={LEVELS.map((l) => [l.id, l.label])} />
          <Select name="intent" label="Here for anything" value={filters.intent} options={INTENTS.map((i) => [i.id, i.label])} />
          <Select name="stack" label="Any stack" value={filters.stack} options={STACK.map((s) => [s, s])} />
          <button className="btn btn--sm" style={{ minHeight: 50 }}>Search</button>
        </form>

        <div className="chips" aria-label="Quick filters">
          <Link className={`chip chip--yellow`} href={qs({ intent: "mentoring", page: "" })}>🧑‍🏫 Mentors</Link>
          <Link className={`chip chip--green`} href={qs({ intent: "hiring", page: "" })}>💼 Hiring</Link>
          <Link className={`chip chip--blue`} href={qs({ intent: "mentor_wanted", page: "" })}>🌱 Wants a mentor</Link>
          <Link className={`chip chip--red`} href={qs({ intent: "cofounder", page: "" })}>🚀 Co-founders</Link>
          {filtering && <Link className="chip" href="/people">✕ Clear filters</Link>}
        </div>

        {people.length ? (
          <div className="grid-people">
            {people.map((p) => <PersonCard key={p.user_id} person={p} />)}
          </div>
        ) : (
          <div className="empty">
            <AyoSays mood={filtering ? "thinking" : "happy"} side="below">
              {filtering ? "Nobody matches that yet. Try fewer filters." : "You're early! Share Connect with your friends at DevFest."}
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
