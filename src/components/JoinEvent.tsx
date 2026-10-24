"use client";

import { useState, useTransition } from "react";
import { joinEvent } from "@/lib/event-actions";
import { AyoSays } from "./Ayo";

/** Anyone signed in can join straight from the event page; no code needed. */
export function JoinEvent({ slug, name, firstName }: { slug: string; name: string; firstName: string }) {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const join = () =>
    start(async () => {
      setError("");
      const res = await joinEvent(slug);
      if (res?.error) setError(res.error);
    });

  return (
    <div className="card stack">
      <AyoSays mood={error ? "sad" : pending ? "excited" : "wave"} size={84}>
        {error || (pending ? "Getting you in…" : `Ready to join ${name}, ${firstName}? Your badge comes with you.`)}
      </AyoSays>
      <button className="btn btn--green btn--block" disabled={pending} onClick={join}>
        {pending ? "Joining…" : `Join ${name}`}
      </button>
    </div>
  );
}
