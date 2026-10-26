import { GrantForm, OrganizerList, PendingRequests } from "@/components/AdminTools";
import { formatDate } from "@/lib/format";
import { organizers, requestsByStatus } from "@/lib/organizers";

export const metadata = { title: "Organisers" };

export default async function AdminOrganisers() {
  const [pending, approved, rejected, list] = await Promise.all([
    requestsByStatus("pending"), requestsByStatus("approved"), requestsByStatus("rejected"), organizers(),
  ]);
  const history = [...approved, ...rejected].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 50);
  return (
    <div className="stack" style={{ "--gap": "20px" } as React.CSSProperties}>
      <h1 className="h1">Organisers</h1>
      <section className="card stack">
        <h2 className="h2">Applications {pending.length > 0 && <span className="badge-count">{pending.length}</span>}</h2>
        <p className="hint">Check that they&apos;re listed as an organiser on the chapter page before approving.</p>
        <PendingRequests list={pending} />
      </section>
      <section className="card"><GrantForm /></section>
      <section className="card stack">
        <h2 className="h2">Approved organisers <span className="chip">{list.length}</span></h2>
        <OrganizerList list={list} />
      </section>
      <section className="card stack">
        <h2 className="h2">Past applications</h2>
        {history.length ? (
          <ul className="admin-list">
            {history.map((r) => (
              <li key={r.id}>
                <span style={{ minWidth: 0 }}>
                  <b>{r.name}</b> <span className="hint">{r.email}</span>
                  <span className="person__meta" style={{ display: "block" }}>{r.chapter_name} · {r.city} · applied {formatDate(new Date(r.created_at).toISOString().slice(0, 10))}</span>
                </span>
                <span className={`chip ${r.status === "approved" ? "chip--green" : "chip--red"}`}>{r.status === "approved" ? "Approved" : "Declined"}</span>
              </li>
            ))}
          </ul>
        ) : <p className="muted">None yet.</p>}
      </section>
    </div>
  );
}
