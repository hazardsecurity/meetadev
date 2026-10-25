"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteEvent, dismissReport, leaveEvent, newCheckinCode, newCode, removeMember, setRole } from "@/lib/event-actions";
import type { MemberRow, ReportRow } from "@/lib/events";
import { Avatar } from "./Avatar";
import { LocalTime } from "./LocalTime";

function useAct() {
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ error?: string; ok?: string } | void>) =>
    start(async () => {
      try {
        const r = await fn();
        setMsg(r ? (r.error ?? r.ok ?? "") : "");
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  return { msg, pending, run };
}

export function CodeTools({ slug, code }: { slug: string; code: string }) {
  const { msg, pending, run } = useAct();
  return (
    <div className="stack" style={{ justifyItems: "center", "--gap": "8px" } as React.CSSProperties}>
      <span className="eyebrow">Join code</span>
      <strong className="join-code">{code}</strong>
      <button className="btn btn--ghost btn--sm" disabled={pending} onClick={() => run(() => newCode(slug))}>Make a new code</button>
      {msg && <p className="hint" role="status">{msg}</p>}
    </div>
  );
}

export function CheckinTools({ slug }: { slug: string }) {
  const { msg, pending, run } = useAct();
  return (
    <div className="stack" style={{ justifyItems: "center", "--gap": "8px" } as React.CSSProperties}>
      <div className="row" style={{ justifyContent: "center" }}>
        <Link className="btn btn--white btn--sm" href={`/e/${slug}/screen?show=checkin`} target="_blank">Show on screen ↗</Link>
        <button className="btn btn--ghost btn--sm" disabled={pending}
          onClick={() => confirm("Make a new check-in code? The one on your posters stops working.") && run(() => newCheckinCode(slug))}>
          Make a new code
        </button>
      </div>
      {msg && <p className="hint" role="status">{msg}</p>}
    </div>
  );
}

export function MemberList({ slug, me, list }: { slug: string; me: string; list: MemberRow[] }) {
  const { msg, pending, run } = useAct();
  const [query, setQuery] = useState("");
  const [hereOnly, setHereOnly] = useState(false);
  const here = list.filter((m) => m.checked_in_at).length;
  const shown = list
    .filter((m) => (!hereOnly || m.checked_in_at) && m.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 200);
  return (
    <div className="stack">
      <div className="row">
        <button className="toggle-tag" aria-pressed={hereOnly} onClick={() => setHereOnly(!hereOnly)}>Here</button>
        <span className="hint">{hereOnly ? `${here} here` : `${list.length} joined, ${here} here`}</span>
      </div>
      <input className="input" type="search" placeholder={`Search ${list.length} members`} value={query}
        onChange={(e) => setQuery(e.target.value)} aria-label="Search members" />
      {msg && <p className="hint" role="status">{msg}</p>}
      <ul className="member-list">
        {shown.map((m) => (
          <li key={m.user_id}>
            <Link href={`/p/${m.handle}`} className="person__head" style={{ minWidth: 0 }}>
              <Avatar name={m.name} color={m.color} photo={m.photo_url} size={40} />
              <span style={{ minWidth: 0 }}>
                <span className="person__name" style={{ display: "block", fontSize: "0.95rem" }}>{m.name}</span>
                <span className="person__meta" style={{ display: "block" }}>{m.onboarded ? m.headline || "No intro yet" : "Still making their badge"}</span>
                <span className="person__meta" style={{ display: "block" }}>
                  {m.checked_in_at ? <>Here since <LocalTime iso={m.checked_in_at} /></> : "Not here yet"}
                  {m.met > 0 && `, met ${m.met}`}
                </span>
              </span>
            </Link>
            <div className="row member-list__actions">
              {m.role === "organizer" ? (
                <>
                  <span className="chip chip--blue">Organiser</span>
                  {m.user_id !== me && (
                    <button className="btn btn--ghost btn--sm" disabled={pending} onClick={() => run(() => setRole(slug, m.user_id, "attendee"))}>
                      Make attendee
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button className="btn btn--ghost btn--sm" disabled={pending} onClick={() => run(() => setRole(slug, m.user_id, "organizer"))}>
                    Make organiser
                  </button>
                  <button className="btn btn--ghost btn--sm" disabled={pending}
                    onClick={() => confirm(`Remove ${m.name} from this event?`) && run(() => removeMember(slug, m.user_id, false))}>
                    Remove
                  </button>
                  <button className="btn btn--ghost btn--sm danger" disabled={pending}
                    onClick={() => confirm(`Remove and ban ${m.name}? They won't be able to rejoin.`) && run(() => removeMember(slug, m.user_id, true))}>
                    Ban
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
      {list.length > shown.length && !query && <p className="hint">Showing 200 of {list.length}. Search to find someone.</p>}
    </div>
  );
}

export function Reports({ slug, list }: { slug: string; list: ReportRow[] }) {
  const { msg, pending, run } = useAct();
  if (!list.length) return <p className="muted">No reports. 🎉</p>;
  return (
    <div className="stack">
      {msg && <p className="hint" role="status">{msg}</p>}
      {list.map((r) => (
        <div key={r.id} className="report">
          <p>
            <strong>{r.reporter_name}</strong> reported {r.reported_handle ? <Link className="link" href={`/p/${r.reported_handle}`}>{r.reported_name}</Link> : r.reported_name}
            <span className="hint"> · {new Date(r.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
          </p>
          <p className="report__reason">{r.reason}</p>
          <div className="row">
            <button className="btn btn--white btn--sm" disabled={pending} onClick={() => run(() => dismissReport(slug, r.id))}>Dismiss</button>
            <button className="btn btn--red btn--sm" disabled={pending}
              onClick={() => confirm(`Remove and ban ${r.reported_name}?`) && run(async () => {
                const res = await removeMember(slug, r.reported_id, true);
                if (!res.error) await dismissReport(slug, r.id);
                return res;
              })}>
              Remove &amp; ban
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function LeaveEvent({ slug, name }: { slug: string; name?: string }) {
  const { msg, pending, run } = useAct();
  return (
    <div className="stack" style={{ "--gap": "8px" } as React.CSSProperties}>
      <button className="btn btn--ghost btn--sm danger" style={{ justifySelf: "start" }} disabled={pending}
        onClick={() => confirm(`Leave ${name ?? "this event"}? You'll drop off its people list and leaderboard. Your connections and chats stay, and you can rejoin with the invite link.`) && run(() => leaveEvent(slug))}>
        {pending ? "Leaving…" : "Leave this event"}
      </button>
      {msg && <p className="error" role="alert">{msg}</p>}
    </div>
  );
}

export function DeleteEvent({ slug, name }: { slug: string; name: string }) {
  const { msg, pending, run } = useAct();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const matches = typed.trim().toLowerCase() === name.trim().toLowerCase();
  if (!open)
    return (
      <button className="btn btn--white btn--sm danger" style={{ justifySelf: "start" }} onClick={() => setOpen(true)}>
        Delete this event…
      </button>
    );
  return (
    <form className="stack" style={{ "--gap": "10px" } as React.CSSProperties}
      onSubmit={(e) => { e.preventDefault(); if (matches) run(() => deleteEvent(slug, typed)); }}>
      <p>
        This removes <strong>{name}</strong> for everyone: its people list, leaderboard, join code and reports.
        Connections people made here stay. <strong>It can&apos;t be undone.</strong>
      </p>
      <div className="field">
        <label htmlFor="confirm-name">Type the event&apos;s name to confirm</label>
        <input id="confirm-name" className="input" autoComplete="off" value={typed} placeholder={name}
          onChange={(e) => setTyped(e.target.value)} />
      </div>
      <div className="row">
        <button className="btn btn--red btn--sm" disabled={!matches || pending}>{pending ? "Deleting…" : "Delete forever"}</button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setOpen(false); setTyped(""); }}>Cancel</button>
      </div>
      {msg && <p className="error" role="alert">{msg}</p>}
    </form>
  );
}
