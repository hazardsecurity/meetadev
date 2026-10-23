"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveCities } from "@/lib/organizer-actions";
import { CityInput } from "./CityInput";

/** Signed-in attendees edit the cities they follow; the page refreshes to show events there. */
export function CitiesEditor({ initial, suggestions }: { initial: string[]; suggestions: string[] }) {
  const [cities, setCities] = useState(initial);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const dirty = cities.join("|") !== initial.join("|");

  const update = (next: string[]) => {
    setCities(next);
    start(async () => {
      const res = await saveCities(next);
      if (res.error) setError(res.error);
      else { setError(""); router.refresh(); }
    });
  };

  return (
    <div className="stack" style={{ "--gap": "8px" } as React.CSSProperties}>
      <span className="label">Your cities</span>
      <CityInput value={cities} onChange={update} suggestions={suggestions} />
      {pending && <p className="hint">Saving…</p>}
      {!pending && dirty && !error && <p className="hint">Saved.</p>}
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
