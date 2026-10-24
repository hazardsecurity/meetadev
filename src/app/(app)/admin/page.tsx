import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GrantForm, ImportCommunities, OrganizerList, PendingRequests } from "@/components/AdminTools";
import { communityCount } from "@/lib/communities";
import { requireMember } from "@/lib/auth";
import { isAdmin, organizers, requestsByStatus } from "@/lib/organizers";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default async function AdminPage() {
  const me = await requireMember("/admin");
  if (!isAdmin(me)) notFound();
  const [pending, list, communities] = await Promise.all([requestsByStatus("pending"), organizers(), communityCount()]);

  return (
    <div className="stack narrow" style={{ "--gap": "24px" } as React.CSSProperties}>
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
    </div>
  );
}
