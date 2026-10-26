import Link from "next/link";
import { CommunityReview } from "@/components/AdminConsole";
import { ImportCommunities } from "@/components/AdminTools";
import { LocalTime } from "@/components/LocalTime";
import { pendingCommunities } from "@/lib/admin";
import { communityCount } from "@/lib/communities";

export const metadata = { title: "Communities" };

export default async function AdminCommunities() {
  const [pending, listed] = await Promise.all([pendingCommunities(), communityCount()]);
  return (
    <div className="stack" style={{ "--gap": "20px" } as React.CSSProperties}>
      <h1 className="h1">Communities <span className="chip">{listed.toLocaleString("en-US")} listed</span></h1>
      <section className="card stack">
        <h2 className="h2">Waiting to be listed {pending.length > 0 && <span className="badge-count">{pending.length}</span>}</h2>
        <p className="hint">Added by organisers when they applied. Approving their application also lists their community.</p>
        {pending.length ? (
          <ul className="admin-list">
            {pending.map((c) => (
              <li key={c.id}>
                <span style={{ minWidth: 0 }}>
                  <b>{c.name}</b> <span className="hint">{[c.city, c.country].filter(Boolean).join(", ")}</span>
                  <span className="person__meta" style={{ display: "block" }}>
                    {c.url && <><a className="link" href={c.url} target="_blank" rel="noopener noreferrer nofollow">{c.url.replace(/^https?:\/\//, "")}</a> · </>}
                    by {c.by_name ?? c.by_email ?? "unknown"} · <LocalTime iso={c.created_at} format="day" />
                  </span>
                </span>
                <CommunityReview id={c.id} name={c.name} />
              </li>
            ))}
          </ul>
        ) : <p className="muted">Nothing waiting.</p>}
      </section>
      <section className="card stack">
        <h2 className="h2">Import</h2>
        <ImportCommunities />
      </section>
      <p className="hint">Public community pages live at <Link className="link" href="/discover">Find events</Link> and /c/&lt;slug&gt;.</p>
    </div>
  );
}
