import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GrantForm, ImportCommunities, OrganizerList, PendingRequests } from "@/components/AdminTools";
import { communityCount } from "@/lib/communities";
import { requireMember } from "@/lib/auth";
import { allEvents } from "@/lib/events";
import { formatDate } from "@/lib/format";
import { isAdmin, organizers, requestsByStatus } from "@/lib/organizers";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const deleted = !!(await searchParams).deleted;
  const me = await requireMember("/admin");
  if (!isAdmin(me)) notFound();
  const [pending, list, communities, events] = await Promise.all([requestsByStatus("pending"), organizers(), communityCount(), allEvents()]);

  return (
    <div className="stack narrow" style={{ "--gap": "24px" } as React.CSSProperties}>
      {deleted && <p className="card card--green">Event deleted.</p>}
      <div className="stack" style={{ "--gap": "4px" } as React.CSSProperties}>
        <p className="eyebrow">meetadev admin</p>
        <h1 className="h1">Organisers</h1>
      </div>
      <section className="card stack">
        <h2 className="h2">Applications {pending.length > 0 && <span className="badge-count">{pending.length}</span>}</h2>
        <p className="hint">Check that they&apos;re listed as an organiser on the chapter page before approving.</p>
        <PendingRequests list={pending} />
      </section>
      <section className="card"><GrantForm /></section>
      <section className="card stack">
        <h2 className="h2">Communities <span className="chip">{communities} listed</span></h2>
        <ImportCommunities />
      </section>
      <section className="card stack">
        <h2 className="h2">Approved organisers</h2>
        <OrganizerList list={list} />
      </section>
      <section className="card stack" id="events">
        <h2 className="h2">All events <span className="chip">{events.length}</span></h2>
        <p className="hint">Open an event&apos;s organiser tools to edit or delete it.</p>
        {events.length ? (
          <ul className="admin-events">
            {events.map((e) => (
              <li key={e.id}>
                <span style={{ minWidth: 0 }}>
                  <strong style={{ display: "block", overflowWrap: "anywhere" }}>{e.name}</strong>
                  <span className="person__meta">
                    {[e.city, e.starts_on ? formatDate(e.starts_on) : "No date", `${e.members} joined`, e.listed ? "Listed" : "Unlisted", e.organiser].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <Link className="btn btn--white btn--sm" href={`/e/${e.slug}/manage`}>Manage</Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No events yet.</p>
        )}
      </section>
    </div>
  );
}
