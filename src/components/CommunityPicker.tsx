"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { KINDS, kindShort, type CommunityLite } from "@/lib/community-kinds";

/**
 * Search the community list and pick one, or switch to "add mine".
 * Writes its choice into hidden inputs so it works inside a plain <form>.
 */
export function CommunityPicker({ defaultCity, values }: { defaultCity: string; values?: Record<string, string> }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CommunityLite[]>([]);
  const [picked, setPicked] = useState<CommunityLite | null>(null);
  const [adding, setAdding] = useState(values?.mode === "new");
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) return;
    const t = setTimeout(async () => {
      const res = await fetch(`/api/communities?q=${encodeURIComponent(q)}`);
      if (res.ok) { setResults((await res.json()).results); setSearched(true); }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  if (adding) {
    return (
      <div className="stack" style={{ "--gap": "12px" } as React.CSSProperties}>
        <input type="hidden" name="mode" value="new" />
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="label">Add your community</span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setAdding(false)}>Search the list instead</button>
        </div>
        <div className="field">
          <label htmlFor="c_name">Community name</label>
          <input id="c_name" name="c_name" className="input" required minLength={3} maxLength={80} placeholder="GDG Ilorin" defaultValue={values?.c_name ?? q} />
        </div>
        <div className="field">
          <label htmlFor="c_kind">Type</label>
          <select id="c_kind" name="c_kind" className="select" defaultValue={values?.c_kind ?? "gdg"}>
            {KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="c_city">City</label>
            <input id="c_city" name="c_city" className="input" required minLength={2} maxLength={60} defaultValue={values?.c_city ?? defaultCity} placeholder="Ilorin" />
          </div>
          <div className="field">
            <label htmlFor="c_country">Country</label>
            <input id="c_country" name="c_country" className="input" maxLength={60} defaultValue={values?.c_country ?? ""} placeholder="Nigeria" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="c_url">Community page</label>
          <input id="c_url" name="c_url" type="url" className="input" required maxLength={200} defaultValue={values?.c_url ?? ""}
            placeholder="https://gdg.community.dev/gdg-ilorin/" />
          <span className="hint">For GDG chapters, the page on gdg.community.dev where you&apos;re listed as an organiser.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="stack" style={{ "--gap": "10px" } as React.CSSProperties}>
      <input type="hidden" name="mode" value="existing" />
      <input type="hidden" name="community_id" value={picked?.id ?? ""} />
      <span className="label">Your community</span>
      {picked ? (
        <div className="community-pick is-picked">
          <span className="chip chip--blue">{kindShort(picked.kind)}</span>
          <span style={{ minWidth: 0, flex: 1 }}><strong>{picked.name}</strong><span className="hint"> · {picked.city}</span></span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setPicked(null)}>Change</button>
        </div>
      ) : (
        <>
          <div className="search-input">
            <Search size={18} aria-hidden />
            <input className="input" value={q} onChange={(e) => { setQ(e.target.value); if (e.target.value.trim().length < 2) { setResults([]); setSearched(false); } }}
              placeholder="Search by name or city, e.g. GDG Ilorin" aria-label="Search communities" autoComplete="off" />
          </div>
          {results.length > 0 && (
            <ul className="community-results">
              {results.map((c) => (
                <li key={c.id}>
                  <button type="button" className="community-pick" onClick={() => setPicked(c)}>
                    <span className="chip chip--blue">{kindShort(c.kind)}</span>
                    <span style={{ minWidth: 0, flex: 1, textAlign: "left" }}><strong>{c.name}</strong><span className="hint"> · {[c.city, c.country].filter(Boolean).join(", ")}</span></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {searched && results.length === 0 && <p className="hint">No match for “{q}”.</p>}
          <button type="button" className="btn btn--white btn--sm" style={{ justifySelf: "start" }} onClick={() => setAdding(true)}>
            My community isn&apos;t listed
          </button>
        </>
      )}
    </div>
  );
}
