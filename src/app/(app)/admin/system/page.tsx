import { LocalTime } from "@/components/LocalTime";
import { adminLog, configStatus, seedRuns } from "@/lib/admin";

export const metadata = { title: "System" };

export default async function AdminSystem() {
  const [log, seeds] = await Promise.all([adminLog(100), seedRuns()]);
  const config = configStatus();
  return (
    <div className="stack" style={{ "--gap": "20px" } as React.CSSProperties}>
      <h1 className="h1">System</h1>
      <section className="card stack">
        <h2 className="h2">Live version</h2>
        <p className="mono" style={{ overflowWrap: "anywhere" }}>{process.env.NEXT_PUBLIC_BUILD_ID ?? "unknown"}</p>
      </section>
      <section className="card stack">
        <h2 className="h2">Settings</h2>
        <p className="hint">Set in Vercel&apos;s environment variables. Only whether each is set is shown here, never its value.</p>
        <ul className="admin-list">
          {config.map((c) => (
            <li key={c.name}>
              <span><b>{c.name}</b> <span className="hint mono">{c.key}</span>{c.note && <span className="person__meta" style={{ display: "block" }}>{c.note}</span>}</span>
              <span className={`chip ${c.ok ? "chip--green" : "chip--red"}`}>{c.ok ? "Set" : "Missing"}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="card stack">
        <h2 className="h2">Admin activity</h2>
        <p className="hint">The last 100 admin actions: suspensions, deletions, exports, approvals and imports.</p>
        {log.length ? (
          <ul className="admin-list">
            {log.map((l) => (
              <li key={l.id}>
                <span style={{ minWidth: 0 }}>
                  <b>{l.action}</b> {l.target && <span className="hint">{l.target}</span>}
                  {l.detail && <span className="person__meta" style={{ display: "block" }}>{l.detail}</span>}
                </span>
                <span className="hint" style={{ textAlign: "right" }}>{l.admin_email}<br /><LocalTime iso={l.created_at} /></span>
              </li>
            ))}
          </ul>
        ) : <p className="muted">No admin actions yet.</p>}
      </section>
      <section className="card stack">
        <h2 className="h2">One-time data updates</h2>
        <p className="hint">Run once by the build, against the live database, and recorded so they never run twice.</p>
        <ul className="admin-list">
          {seeds.map((s) => <li key={s.key}><span className="mono">{s.key}</span><span className="hint"><LocalTime iso={s.ran_at} format="day" /></span></li>)}
        </ul>
      </section>
    </div>
  );
}
