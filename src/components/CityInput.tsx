"use client";

import { useId, useState } from "react";

const tidy = (s: string) => s.trim().replace(/\s+/g, " ");

/** Type a city, press Enter (or Add) to keep it. Suggests cities that already have events. */
export function CityInput({ value, onChange, suggestions, max = 10 }: {
  value: string[]; onChange: (cities: string[]) => void; suggestions: string[]; max?: number;
}) {
  const [draft, setDraft] = useState("");
  const listId = useId();
  const add = (raw: string) => {
    const city = tidy(raw);
    if (city.length < 2 || value.length >= max) return;
    if (!value.some((c) => c.toLowerCase() === city.toLowerCase())) onChange([...value, city]);
    setDraft("");
  };

  return (
    <div className="stack" style={{ "--gap": "10px" } as React.CSSProperties}>
      <div className="row" style={{ flexWrap: "nowrap" }}>
        <input className="input" list={listId} value={draft} placeholder="Ilorin" maxLength={60} aria-label="Add a city"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(draft); } }} />
        <button type="button" className="btn btn--white btn--sm" style={{ minHeight: 50 }} onClick={() => add(draft)} disabled={!tidy(draft)}>
          Add
        </button>
        <datalist id={listId}>{suggestions.map((c) => <option key={c} value={c} />)}</datalist>
      </div>
      {value.length > 0 && (
        <div className="chips" aria-label="Your cities">
          {value.map((c) => (
            <span key={c} className="chip chip--blue city-chip">
              📍 {c}
              <button type="button" aria-label={`Remove ${c}`} onClick={() => onChange(value.filter((x) => x !== c))}>✕</button>
            </span>
          ))}
        </div>
      )}
      <p className="hint">{value.length ? `${value.length}/${max} cities` : "Add your city, plus any others you travel to for events."}</p>
    </div>
  );
}
