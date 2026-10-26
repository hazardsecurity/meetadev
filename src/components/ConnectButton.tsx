"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { undoWant, wantToMeet } from "@/lib/actions";
import type { Relation } from "@/lib/people";

/** Meet: private until they want to meet too. `slug` credits the event this happened at. */
export function ConnectButton({ userId, relation, firstName, slug }: { userId: string; relation: Relation; firstName: string; slug?: string }) {
  const [state, setState] = useState(relation);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  // Show the result straight away; put it back if the server says no.
  const run = (fn: () => Promise<{ error?: string; ok?: string }>, next: Relation) => {
    const before = state;
    setError("");
    setState(next);
    start(async () => {
      const res = await fn().catch(() => ({ error: "Couldn't reach meetadev. Try again." }) as { error?: string; ok?: string });
      if (res.error) { setState(before); setError(res.error); }
      // It was mutual: the page now has their contact details and chat to show.
      else if (res.ok === "connected") { setState("connected"); router.refresh(); }
    });
  };

  if (state === "self") return null;

  if (state === "connected")
    return <span className="chip chip--green" style={{ justifySelf: "start" }}>🤝 Connected</span>;

  if (state === "outgoing")
    return (
      <div className="row">
        <span className="chip chip--yellow">You want to meet {firstName}</span>
        <button className="btn btn--ghost btn--sm" disabled={pending} onClick={() => run(() => undoWant(userId), "none")}>
          Undo
        </button>
      </div>
    );

  return (
    <div className="stack" style={{ "--gap": "6px" } as React.CSSProperties}>
      <button className="btn btn--sm" style={{ justifySelf: "start" }} disabled={pending} onClick={() => run(() => wantToMeet(userId, slug), "outgoing")}>
        Meet
      </button>
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
