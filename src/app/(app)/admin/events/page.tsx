import Link from "next/link";
import { adminEvents } from "@/lib/admin";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Events" };

const WHEN = [["upcoming", "Upcoming"], ["past", "Past"], ["all", "All"]] as const;

export default async function AdminEvents({ searchParams }: PageProps<"/admin/events">) {
  const sp = await searchParams;
  const when = (["upcoming", "past", "all"] as const).find((w) => w === sp.when) ?? "upcoming";
  const q = String(sp.q ?? "").trim().slice(0, 80);
  const events = await adminEvents(when, q);
  return (
    <div className="stack" style={{ "--gap": "20px" } as React.CSSProperties}>
      <h1 className="h1">Events <span className="chip">{events.length}</span></h1>
      <form className="row" action="/admin/events">
        <input type="hidden" name="when" value={when} />
        <input className="input" type="search" name="q" defaultValue={q} placeholder="Search by name or city" aria-label="Search events" style={{ flex: 1, minWidth: 220 }} />
        <button className="btn btn--sm" style={{ minHeight: 50 }}>Search</button>
      </form>
      <div className="chips">
        {WHEN.map(([w, label]) => (
          <Link key={w} href={`/admin/events?when=${w}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={`chip ${w === when ? "chip--blue" : ""}`}>{label}</Link>
        ))}
      </div>
      {events.length ? (
        <ul className="admin-list">
          {events.map((e) => (
            <li key={e.id}>
              <span style={{ minWidth: 0 }}>
                <strong style={{ display: "block", overflowWrap: "anywhere" }}>{e.name}</strong>
                <span className="person__meta">
                  {[e.city, e.starts_on ? formatDate(e.starts_on) : "No date", e.listed ? "Listed" : "Unlisted", e.organiser].filter(Boolean).join(" · ")}
                </span>
                <span className="person__meta" style={{ display: "block" }}>
                  {e.members} joined · {e.matches} matches · {e.meetings} met in person
                  {e.reports > 0 && <> · <b style={{ color: "var(--red-ink)" }}>{e.reports} open {e.reports === 1 ? "report" : "reports"}</b></>}
                </span>
              </span>
              <span className="row" style={{ "--gap": "6px", flexWrap: "nowrap" } as React.CSSProperties}>
                <Link className="btn btn--ghost btn--sm" href={`/e/${e.slug}`}>Open</Link>
                <Link className="btn btn--white btn--sm" href={`/e/${e.slug}/manage`}>Manage</Link>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No events here.</p>
      )}
    </div>
  );
}
