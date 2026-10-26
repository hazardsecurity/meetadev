import Link from "next/link";
import { overview, signupsByDay } from "@/lib/admin";

export const metadata = { title: "Overview" };

const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : "–");

export default async function AdminOverview({ searchParams }: PageProps<"/admin">) {
  const deleted = !!(await searchParams).deleted;
  const [o, days] = await Promise.all([overview(), signupsByDay(14)]);
  const peak = Math.max(1, ...days.map((d) => d.n));
  const tiles = [
    { label: "People", n: o.users, sub: `${o.onboarded} finished their badge (${pct(o.onboarded, o.users)})` },
    { label: "New this week", n: o.new_7d, sub: `${o.new_30d} in the last 30 days` },
    { label: "Active this week", n: o.active_7d, sub: "signed in at least once" },
    { label: "Events", n: o.events, sub: `${o.upcoming} upcoming, ${o.today} today` },
    { label: "Event joins", n: o.memberships, sub: o.events ? `${Math.round(o.memberships / o.events)} people per event on average` : "–" },
    { label: "Matches", n: o.matches, sub: `${o.wants} one-way Meets waiting` },
    { label: "Met in person", n: o.meetings, sub: `${pct(o.meetings, o.matches)} of matches` },
    { label: "Messages", n: o.messages, sub: `${o.messages_7d} this week` },
    { label: "Organisers", n: o.organisers, sub: `${o.communities.toLocaleString("en-US")} communities listed` },
    { label: "Push devices", n: o.push_devices, sub: "notifications turned on" },
  ];
  const todo = [
    { n: o.pending_apps, label: o.pending_apps === 1 ? "organiser application to review" : "organiser applications to review", href: "/admin/organisers" },
    { n: o.open_reports, label: o.open_reports === 1 ? "open report" : "open reports", href: "/admin/reports" },
    { n: o.pending_communities, label: o.pending_communities === 1 ? "community waiting to be listed" : "communities waiting to be listed", href: "/admin/communities" },
    { n: o.suspended, label: o.suspended === 1 ? "suspended account" : "suspended accounts", href: "/admin/users?filter=suspended" },
  ].filter((t) => t.n > 0);

  return (
    <div className="stack" style={{ "--gap": "20px" } as React.CSSProperties}>
      {deleted && <p className="card card--green">Event deleted.</p>}
      <h1 className="h1">Overview</h1>

      <section className={`card stack ${todo.length ? "card--blue" : ""}`}>
        <h2 className="h2">Needs you</h2>
        {todo.length ? (
          <ul className="admin-todo">{todo.map((t) => <li key={t.href}><Link className="link" href={t.href}><b>{t.n}</b> {t.label}</Link></li>)}</ul>
        ) : (
          <p className="muted">Nothing waiting. 🎉</p>
        )}
      </section>

      <section className="admin-tiles">
        {tiles.map((t) => (
          <div key={t.label} className="card admin-tile"><span className="hint">{t.label}</span><strong>{t.n.toLocaleString("en-US")}</strong><span className="hint">{t.sub}</span></div>
        ))}
      </section>

      <section className="card stack">
        <h2 className="h2">Sign-ups, last 14 days</h2>
        <div className="admin-bars" role="img" aria-label={`Sign-ups per day: ${days.map((d) => `${d.day} ${d.n}`).join(", ")}`}>
          {days.map((d) => (
            <div key={d.day} className="admin-bars__col" title={`${d.day}: ${d.n}`}>
              <span className="admin-bars__n">{d.n || ""}</span>
              <span className="admin-bars__bar" style={{ height: `${(100 * d.n) / peak}%` }} />
              <span className="admin-bars__day">{d.day.slice(8)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
