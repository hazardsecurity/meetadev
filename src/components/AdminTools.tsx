"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import type { FormState } from "@/lib/actions";
import { grantOrganizer, reviewRequest, revokeOrganizer } from "@/lib/organizer-actions";
import type { OrganizerRow, RequestWithPerson } from "@/lib/organizers";
import { Avatar } from "./Avatar";

export function PendingRequests({ list }: { list: RequestWithPerson[] }) {
  const [done, setDone] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  if (!list.length) return <p className="muted">No applications waiting.</p>;
  return (
    <div className="stack">
      {list.map((r) => (
        <div key={r.id} className="application">
          <div className="person__head">
            <Avatar name={r.name} color={r.color} photo={r.photo_url} size={44} />
            <div style={{ minWidth: 0 }}>
              <Link href={`/p/${r.handle}`} className="person__name" style={{ display: "block" }}>{r.name}</Link>
              <span className="person__meta">{r.email}</span>
            </div>
          </div>
          <p><strong>{r.chapter_name}</strong> · {r.city}</p>
          <a className="link" href={r.chapter_url} target="_blank" rel="noopener noreferrer nofollow" style={{ overflowWrap: "anywhere" }}>
            {r.chapter_url} ↗
          </a>
          {r.note && <p className="report__reason">{r.note}</p>}
          {done[r.id] ? (
            <p className="hint" role="status">{done[r.id]}</p>
          ) : (
            <div className="row">
              <button className="btn btn--green btn--sm" disabled={pending}
                onClick={() => start(async () => { const res = await reviewRequest(r.id, true); setDone((d) => ({ ...d, [r.id]: res.error ?? res.ok ?? "" })); })}>
                Approve
              </button>
              <button className="btn btn--white btn--sm" disabled={pending}
                onClick={() => start(async () => { const res = await reviewRequest(r.id, false); setDone((d) => ({ ...d, [r.id]: res.error ?? res.ok ?? "" })); })}>
                Decline
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function GrantForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(grantOrganizer, {});
  return (
    <form action={action} className="stack" style={{ "--gap": "10px" } as React.CSSProperties}>
      <label htmlFor="grant-email" className="label">Add an organiser directly</label>
      <div className="row" style={{ flexWrap: "nowrap" }}>
        <input id="grant-email" name="email" type="email" className="input" required placeholder="organiser@gmail.com" />
        <button className="btn btn--sm" style={{ minHeight: 50 }} disabled={pending}>Add</button>
      </div>
      <span className="hint">They need to have signed in to meetadev once.</span>
      {state.error && <p className="error" role="alert">{state.error}</p>}
      {state.ok && <p className="success" role="status">{state.ok}</p>}
    </form>
  );
}

export function OrganizerList({ list }: { list: OrganizerRow[] }) {
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  if (!list.length) return <p className="muted">No organisers yet.</p>;
  return (
    <div className="stack">
      {msg && <p className="hint" role="status">{msg}</p>}
      <ul className="member-list">
        {list.map((o) => (
          <li key={o.user_id}>
            <Link href={`/p/${o.handle}`} className="person__head" style={{ minWidth: 0 }}>
              <Avatar name={o.name} color={o.color} photo={o.photo_url} size={40} />
              <span style={{ minWidth: 0 }}>
                <span className="person__name" style={{ display: "block", fontSize: "0.95rem" }}>{o.name}</span>
                <span className="person__meta">{o.email} · {o.events} {o.events === 1 ? "event" : "events"}</span>
              </span>
            </Link>
            <button className="btn btn--ghost btn--sm danger" disabled={pending}
              onClick={() => confirm(`Stop ${o.name} from creating new events?`) && start(async () => { const r = await revokeOrganizer(o.user_id); setMsg(r.error ?? r.ok ?? ""); })}>
              Revoke
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
