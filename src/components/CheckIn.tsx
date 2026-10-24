"use client";

import { useState, useTransition } from "react";
import { checkIn } from "@/lib/event-actions";

/** One tap after scanning the venue's code: from here on, this person is "here". */
export function CheckInButton({ slug, checkinKey }: { slug: string; checkinKey: string }) {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <>
      <button className="btn btn--green btn--block" disabled={pending}
        onClick={() => start(async () => { setError(""); const res = await checkIn(slug, checkinKey); if (res?.error) setError(res.error); })}>
        {pending ? "Checking you in…" : "I'm here"}
      </button>
      {error && <p className="error" role="alert">{error}</p>}
    </>
  );
}
