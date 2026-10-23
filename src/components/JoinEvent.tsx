"use client";

import { useState, useTransition } from "react";
import { joinEvent } from "@/lib/event-actions";
import { AyoSays } from "./Ayo";

export function JoinEvent({ slug, name, needsCode, code: initialCode, firstName }: {
  slug: string; name: string; needsCode: boolean; code: string; firstName: string;
}) {
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const join = () =>
    start(async () => {
      setError("");
      const res = await joinEvent(slug, code);
      if (res?.error) setError(res.error);
    });

  return (
    <div className="card stack">
      <AyoSays mood={error ? "sad" : pending ? "excited" : "wave"} size={84}>
        {error || (pending ? "Getting you in…" : `Ready to join ${name}, ${firstName}? Your badge comes with you.`)}
      </AyoSays>
      {needsCode && (
        <div className="field">
          <label htmlFor="code">Join code</label>
          <input id="code" className="input code-input" value={code} maxLength={6} autoComplete="off" autoCapitalize="characters"
            spellCheck={false} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABC123" />
          <span className="hint">Ask an organiser, or look at the screens at the venue.</span>
        </div>
      )}
      <button className="btn btn--green btn--block" disabled={pending || (needsCode && code.length !== 6)} onClick={join}>
        Join {name}
      </button>
    </div>
  );
}
