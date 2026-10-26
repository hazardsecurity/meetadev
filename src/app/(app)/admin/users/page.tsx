import Link from "next/link";
import { UserActions } from "@/components/AdminConsole";
import { Avatar } from "@/components/Avatar";
import { LocalTime } from "@/components/LocalTime";
import { adminUsers, USER_FILTERS, type UserFilter } from "@/lib/admin";
import { isAdmin } from "@/lib/organizers";

export const metadata = { title: "Users" };

const LABELS: Record<UserFilter, string> = {
  all: "Everyone", new: "New this week", organisers: "Organisers", reported: "Reported", suspended: "Suspended", unfinished: "No badge yet",
};

export default async function AdminUsers({ searchParams }: PageProps<"/admin/users">) {
  const sp = await searchParams;
  const q = String(sp.q ?? "").trim().slice(0, 80);
  const filter = (USER_FILTERS as readonly string[]).includes(String(sp.filter)) ? (sp.filter as UserFilter) : "all";
  const page = Math.max(0, Number.parseInt(String(sp.page ?? "0"), 10) || 0);
  const { users, hasMore } = await adminUsers(q, filter, page);
  const link = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ q, filter, page: "0", ...patch });
    for (const [k, v] of [...p.entries()]) if (!v || (k === "filter" && v === "all") || (k === "page" && v === "0")) p.delete(k);
    return p.size ? `/admin/users?${p}` : "/admin/users";
  };

  return (
    <div className="stack" style={{ "--gap": "20px" } as React.CSSProperties}>
      <h1 className="h1">Users</h1>
      <form className="row" action="/admin/users">
        <input className="input" type="search" name="q" defaultValue={q} placeholder="Search by name, email or handle" aria-label="Search users" style={{ flex: 1, minWidth: 220 }} />
        {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
        <button className="btn btn--sm" style={{ minHeight: 50 }}>Search</button>
      </form>
      <div className="chips" aria-label="Filters">
        {USER_FILTERS.map((f) => (
          <Link key={f} href={link({ filter: f })} className={`chip ${f === filter ? "chip--blue" : ""}`} aria-current={f === filter ? "page" : undefined}>{LABELS[f]}</Link>
        ))}
      </div>

      {users.length ? (
        <ul className="admin-users">
          {users.map((u) => (
            <li key={u.id} className="card stack" style={{ "--gap": "10px" } as React.CSSProperties}>
              <div className="person__head">
                <Avatar name={u.name ?? u.email} color={u.color ?? 0} photo={u.photo_url ?? ""} size={44} />
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span className="person__name" style={{ display: "block", fontSize: "1rem" }}>
                    {u.name ?? "No badge yet"} {u.handle && <Link className="link" href={`/p/${u.handle}`} style={{ fontSize: "0.85rem" }}>@{u.handle}</Link>}
                  </span>
                  <span className="person__meta" style={{ display: "block" }}>{u.email}</span>
                </span>
              </div>
              <div className="chips">
                {isAdmin(u) && <span className="chip chip--blue">Admin</span>}
                {u.can_create_events && <span className="chip chip--green">Organiser</span>}
                {!u.onboarded && <span className="chip chip--yellow">No badge yet</span>}
                {u.suspended_at && <span className="chip chip--red">Suspended</span>}
                {u.reports_against > 0 && <span className="chip chip--red">{u.reports_against} open {u.reports_against === 1 ? "report" : "reports"}</span>}
              </div>
              <p className="hint">
                Joined <LocalTime iso={u.created_at} format="day" /> · last sign-in {u.last_seen ? <LocalTime iso={u.last_seen} /> : "never"} ·{" "}
                {u.events} {u.events === 1 ? "event" : "events"} · {u.connections} {u.connections === 1 ? "match" : "matches"} · met {u.met}
              </p>
              {u.suspended_at && <p className="hint">Suspended <LocalTime iso={u.suspended_at} format="day" />: {u.suspended_reason}</p>}
              {!isAdmin(u) && <UserActions id={u.id} email={u.email} suspended={!!u.suspended_at} />}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">Nobody matches that.</p>
      )}

      {(page > 0 || hasMore) && (
        <div className="row" style={{ justifyContent: "center" }}>
          {page > 0 && <Link className="btn btn--white btn--sm" href={link({ page: String(page - 1) })}>Previous</Link>}
          {hasMore && <Link className="btn btn--white btn--sm" href={link({ page: String(page + 1) })}>More</Link>}
        </div>
      )}
    </div>
  );
}
