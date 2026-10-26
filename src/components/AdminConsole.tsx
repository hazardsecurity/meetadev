"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import {
  approveCommunity, deleteUserAccount, removeCommunity, resolveReport, signOutEverywhere, suspendFromReport, suspendUser, unsuspendUser,
} from "@/lib/admin-actions";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/organisers", label: "Organisers" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/communities", label: "Communities" },
  { href: "/admin/system", label: "System" },
];

/** The admin sections. `counts` puts a badge on tabs that need attention. */
export function AdminNav({ counts }: { counts: Record<string, number> }) {
  const path = usePathname();
  return (
    <nav className="admin-nav" aria-label="Admin sections">
      {TABS.map((t) => {
        const on = t.href === "/admin" ? path === "/admin" : path.startsWith(t.href);
        const n = counts[t.href] ?? 0;
        return (
          <Link key={t.href} href={t.href} className="admin-nav__tab" aria-current={on ? "page" : undefined}>
            {t.label}
            {n > 0 && <span className="badge-count">{n > 99 ? "99+" : n}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

function useAct() {
  const [msg, setMsg] = useState<{ text: string; bad: boolean } | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ error?: string; ok?: string }>) =>
    start(async () => {
      try {
        const r = await fn();
        setMsg(r.error ? { text: r.error, bad: true } : r.ok ? { text: r.ok, bad: false } : null);
      } catch {
        setMsg({ text: "Something went wrong. Try again.", bad: true });
      }
    });
  const note = msg && <p className={msg.bad ? "error" : "hint"} role={msg.bad ? "alert" : "status"}>{msg.text}</p>;
  return { pending, run, note };
}

/** Suspend / lift, sign out everywhere, export their data, delete the account. */
export function UserActions({ id, email, suspended }: { id: string; email: string; suspended: boolean }) {
  const { pending, run, note } = useAct();
  const [mode, setMode] = useState<"" | "suspend" | "delete">("");
  const [text, setText] = useState("");
  const close = () => { setMode(""); setText(""); };
  return (
    <div className="stack admin-actions" style={{ "--gap": "8px" } as React.CSSProperties}>
      <div className="row" style={{ "--gap": "6px" } as React.CSSProperties}>
        {suspended ? (
          <button className="btn btn--white btn--sm" disabled={pending} onClick={() => run(() => unsuspendUser(id))}>Lift suspension</button>
        ) : (
          <button className="btn btn--white btn--sm danger" disabled={pending} onClick={() => setMode(mode === "suspend" ? "" : "suspend")}>Suspend…</button>
        )}
        <button className="btn btn--ghost btn--sm" disabled={pending}
          onClick={() => confirm(`Sign ${email} out of every device?`) && run(() => signOutEverywhere(id))}>Sign out everywhere</button>
        <a className="btn btn--ghost btn--sm" href={`/api/admin/export/${id}`}>Export data</a>
        <button className="btn btn--ghost btn--sm danger" disabled={pending} onClick={() => setMode(mode === "delete" ? "" : "delete")}>Delete…</button>
      </div>
      {mode === "suspend" && (
        <form className="stack" style={{ "--gap": "8px" } as React.CSSProperties}
          onSubmit={(e) => { e.preventDefault(); run(() => suspendUser(id, text)); close(); }}>
          <label className="label" htmlFor={`why-${id}`}>Why? This goes in the admin log.</label>
          <input id={`why-${id}`} className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Harassment reported at DevFest Ilorin" />
          <div className="row"><button className="btn btn--red btn--sm" disabled={text.trim().length < 3}>Suspend and sign out</button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={close}>Cancel</button></div>
        </form>
      )}
      {mode === "delete" && (
        <form className="stack" style={{ "--gap": "8px" } as React.CSSProperties}
          onSubmit={(e) => { e.preventDefault(); run(() => deleteUserAccount(id, text)); close(); }}>
          <p className="hint">For a deletion request. This removes their badge, contacts, connections and chats for good. Type <b>{email}</b> to confirm.</p>
          <input className="input" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" aria-label="Type the account's email" />
          <div className="row"><button className="btn btn--red btn--sm" disabled={text.trim().toLowerCase() !== email.toLowerCase()}>Delete account</button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={close}>Cancel</button></div>
        </form>
      )}
      {note}
    </div>
  );
}

export function ReportActions({ id, suspended }: { id: string; suspended: boolean }) {
  const { pending, run, note } = useAct();
  return (
    <div className="stack" style={{ "--gap": "6px" } as React.CSSProperties}>
      <div className="row" style={{ "--gap": "6px" } as React.CSSProperties}>
        <button className="btn btn--white btn--sm" disabled={pending} onClick={() => run(() => resolveReport(id))}>Close report</button>
        {!suspended && (
          <button className="btn btn--red btn--sm" disabled={pending}
            onClick={() => confirm("Suspend this person and close every open report about them?") && run(() => suspendFromReport(id))}>Suspend them</button>
        )}
      </div>
      {note}
    </div>
  );
}

export function CommunityReview({ id, name }: { id: string; name: string }) {
  const { pending, run, note } = useAct();
  return (
    <div className="stack" style={{ "--gap": "6px" } as React.CSSProperties}>
      <div className="row" style={{ "--gap": "6px" } as React.CSSProperties}>
        <button className="btn btn--green btn--sm" disabled={pending} onClick={() => run(() => approveCommunity(id))}>List it</button>
        <button className="btn btn--ghost btn--sm danger" disabled={pending}
          onClick={() => confirm(`Remove ${name}? It isn't listed yet.`) && run(() => removeCommunity(id))}>Remove</button>
      </div>
      {note}
    </div>
  );
}
