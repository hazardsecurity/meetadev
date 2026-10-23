"use client";

import { useState, useTransition } from "react";
import { blockUser, removeConnection, reportUser } from "@/lib/actions";

export function SafetyMenu({ userId, firstName, connected }: { userId: string; firstName: string; connected: boolean }) {
  const [mode, setMode] = useState<"" | "report" | "block" | "remove">("");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  return (
    <details className="safety">
      <summary>Safety options</summary>
      <div className="stack" style={{ "--gap": "10px", paddingTop: 12 } as React.CSSProperties}>
        <div className="row">
          {connected && <button className="btn btn--white btn--sm" onClick={() => setMode("remove")}>Remove connection</button>}
          <button className="btn btn--white btn--sm" onClick={() => setMode("block")}>Block</button>
          <button className="btn btn--white btn--sm" onClick={() => setMode("report")}>Report</button>
        </div>

        {mode === "remove" && (
          <div className="row">
            <span>Remove {firstName}? You&apos;ll both lose each other&apos;s contact details.</span>
            <button className="btn btn--red btn--sm" disabled={pending}
              onClick={() => start(async () => { await removeConnection(userId); setMsg("Removed."); setMode(""); })}>Remove</button>
          </div>
        )}
        {mode === "block" && (
          <div className="row">
            <span>Block {firstName}? Neither of you will see the other again.</span>
            <button className="btn btn--red btn--sm" disabled={pending} onClick={() => start(async () => { await blockUser(userId); })}>Block</button>
          </div>
        )}
        {mode === "report" && (
          <div className="field">
            <label htmlFor="reason">What happened?</label>
            <textarea id="reason" className="textarea" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="row">
              <button className="btn btn--red btn--sm" disabled={pending}
                onClick={() => start(async () => { const r = await reportUser(userId, reason); setMsg(r.error ?? r.ok ?? ""); if (r.ok) setMode(""); })}>
                Send report
              </button>
            </div>
          </div>
        )}
        {msg && <p className="hint" role="status">{msg}</p>}
      </div>
    </details>
  );
}
