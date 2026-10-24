"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { cancelRequest, respondToRequest, sendRequest } from "@/lib/actions";
import type { Relation } from "@/lib/people";

/** Connect / pending / accept, with an optional note on the full-size variant. */
export function ConnectButton({
  userId,
  requestId,
  relation,
  firstName,
  withNote = false,
}: {
  userId: string;
  requestId: string | null;
  relation: Relation;
  firstName: string;
  withNote?: boolean;
}) {
  const [state, setState] = useState(relation);
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  // Show the result straight away; put it back if the server says no.
  const run = (fn: () => Promise<{ error?: string; ok?: string }>, next: Relation) => {
    const before = state;
    setError("");
    setState(next);
    start(async () => {
      const res = await fn().catch(() => ({ error: "Couldn't reach meetadev. Try again." }) as { error?: string; ok?: string });
      if (res.error) { setState(before); setError(res.error); }
      else if (res.ok === "connected") setState("connected");
    });
  };

  if (state === "self") return null;

  if (state === "connected")
    return <span className="chip chip--green" style={{ justifySelf: "start" }}>🤝 Connected</span>;

  if (state === "incoming")
    return (
      <div className="row">
        <button className="btn btn--green btn--sm" disabled={pending}
          onClick={() => requestId && run(() => respondToRequest(requestId, true), "connected")}>
          Accept
        </button>
        <button className="btn btn--white btn--sm" disabled={pending}
          onClick={() => requestId && run(() => respondToRequest(requestId, false), "none")}>
          Not now
        </button>
        {error && <p className="error" role="alert">{error}</p>}
      </div>
    );

  if (state === "outgoing")
    return (
      <div className="row">
        <span className="chip chip--yellow">⏳ Request sent</span>
        <button className="btn btn--ghost btn--sm" disabled={pending} onClick={() => run(() => cancelRequest(userId), "none")}>
          Undo
        </button>
      </div>
    );

  return (
    <div className="stack" style={{ "--gap": "10px" } as React.CSSProperties}>
      <AnimatePresence initial={false}>
        {withNote && open && (
          <motion.div
            className="field"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            <label htmlFor="note">Say why you&apos;d like to connect (optional)</label>
            <textarea id="note" className="textarea" maxLength={200} value={note}
              placeholder={`Hi ${firstName}! I loved your talk on…`}
              onChange={(e) => setNote(e.target.value)} />
            <span className="hint">{200 - note.length} characters left</span>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="row">
        <button
          className={`btn ${withNote ? "" : "btn--sm"}`}
          disabled={pending}
          onClick={() => (withNote && !open ? setOpen(true) : run(() => sendRequest(userId, note), "outgoing"))}
        >
          {pending ? "Sending…" : withNote && open ? "Send request" : "Connect"}
        </button>
        {withNote && open && (
          <button className="btn btn--ghost btn--sm" onClick={() => run(() => sendRequest(userId, ""), "outgoing")} disabled={pending}>
            Skip note
          </button>
        )}
      </div>
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
