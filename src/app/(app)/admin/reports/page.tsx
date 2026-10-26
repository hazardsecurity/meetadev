import Link from "next/link";
import { ReportActions } from "@/components/AdminConsole";
import { LocalTime } from "@/components/LocalTime";
import { openReports } from "@/lib/admin";

export const metadata = { title: "Reports" };

export default async function AdminReports() {
  const reports = await openReports();
  return (
    <div className="stack" style={{ "--gap": "20px" } as React.CSSProperties}>
      <h1 className="h1">Reports <span className="chip">{reports.length} open</span></h1>
      <p className="hint">Reports from every event, most-reported people first. Organisers also see reports from their own events.</p>
      {reports.length ? (
        <ul className="admin-users">
          {reports.map((r) => (
            <li key={r.id} className="card stack" style={{ "--gap": "10px" } as React.CSSProperties}>
              <p>
                <b>{r.reported_handle ? <Link className="link" href={`/p/${r.reported_handle}`}>{r.reported_name}</Link> : (r.reported_name ?? "Deleted account")}</b>{" "}
                <span className="hint">{r.reported_email}</span>
                {r.against_total > 1 && <span className="chip chip--red" style={{ marginLeft: 8 }}>{r.against_total} open reports</span>}
                {r.reported_suspended && <span className="chip chip--red" style={{ marginLeft: 8 }}>Suspended</span>}
              </p>
              <p className="report__reason">{r.reason}</p>
              <p className="hint">
                Reported by {r.reporter_name ?? "a deleted account"}
                {r.event_name && <> at <Link className="link" href={`/e/${r.event_slug}/manage`}>{r.event_name}</Link></>} · <LocalTime iso={r.created_at} />
              </p>
              <ReportActions id={r.id} suspended={r.reported_suspended} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No open reports. 🎉</p>
      )}
    </div>
  );
}
