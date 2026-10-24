"use client";

import { useState, useTransition } from "react";
import { undoMet, weMet } from "@/lib/actions";
import type { MeetStatus } from "@/lib/people";

/** "We met": each person taps it; it counts once both have, at an event they're both checked in at. */
export function MetBar({ otherId, firstName, status, connected }: { otherId: string; firstName: string; status: MeetStatus; connected: boolean }) {
  const [state, setState] = useState(status.state);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const { event, earlier } = status;
  if (!event && !earlier) return null;

  const run = (fn: () => Promise<{ error?: string; ok?: string }>, next: MeetStatus["state"]) => {
    const before = state;
    setError("");
    setState(next);
    start(async () => {
      const res = await fn().catch(() => ({ error: "Couldn't reach meetadev. Try again." }) as { error?: string; ok?: string });
      if (res.error) { setState(before); setError(res.error); }
      else if (res.ok === "met") setState("both");
    });
  };
  const claim = <button className="btn btn--green btn--sm" disabled={pending} onClick={() => run(() => weMet(otherId), state === "theirs" ? "both" : "mine")}>We met</button>;

  let tone = "";
  let text: string;
  let action: React.ReactNode = null;
  if (!event) { tone = "is-done"; text = `You met at ${earlier}.`; }
  else if (state === "both") { tone = "is-done"; text = `You met at ${event.name}.`; }
  else if (state === "mine") {
    tone = "is-waiting";
    text = connected ? `Waiting for ${firstName} to confirm.` : `Waiting for ${firstName}. Ask them to scan your badge and tap We met. Until then, nothing shows on their side.`;
    action = <button className="btn btn--ghost btn--sm" disabled={pending} onClick={() => run(() => undoMet(otherId), "none")}>Undo</button>;
  } else if (state === "theirs") { tone = "is-asked"; text = `${firstName} says you two met. Did you?`; action = claim; }
  else { text = earlier ? `You met at ${earlier}. Met again here?` : "Met in person?"; action = claim; }

  return (
    <div className={`metbar ${tone}`} role="status">
      <span className="metbar__text">{text}</span>
      {action}
      {error && <p className="error" role="alert" style={{ flexBasis: "100%" }}>{error}</p>}
    </div>
  );
}
