"use client";

import { useState, useTransition } from "react";
import { deleteAccount } from "@/lib/actions";
import { resetAnalytics } from "@/lib/analytics-client";

/** Delete my account, after typing DELETE. Mirrors "Delete this event" on Manage. */
export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const matches = typed.trim().toUpperCase() === "DELETE";
  if (!open)
    return (
      <button className="btn btn--white btn--sm danger" style={{ justifySelf: "start" }} onClick={() => setOpen(true)}>
        Delete my account…
      </button>
    );
  return (
    <form className="card stack" style={{ "--gap": "10px" } as React.CSSProperties}
      onSubmit={(e) => {
        e.preventDefault();
        if (matches) start(async () => { resetAnalytics(); const res = await deleteAccount(typed); if (res?.error) setError(res.error); });
      }}>
      <p>
        This deletes your badge, contacts, connections, chats and notifications. Meetings you confirmed still count
        for the people you met, without your name. Bans, blocks and reports stay, tied only to a scrambled code of
        your Google account, so they apply again if you come back. <strong>It can&apos;t be undone.</strong>
      </p>
      <div className="field">
        <label htmlFor="confirm-delete">Type DELETE to confirm</label>
        <input id="confirm-delete" className="input" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} />
      </div>
      <div className="row">
        <button className="btn btn--red btn--sm" disabled={!matches || pending}>{pending ? "Deleting…" : "Delete my account"}</button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setOpen(false); setTyped(""); setError(""); }}>Cancel</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
    </form>
  );
}
