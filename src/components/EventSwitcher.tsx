"use client";

import { Check, ChevronDown, Plus, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Item = { slug: string; name: string; when: string };

/** One tap from the header to any event you're in. */
export function EventSwitcher({ events, currentSlug }: { events: Item[]; currentSlug: string | null }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const path = usePathname();
  const onEvent = path.match(/^\/e\/([^/]+)/)?.[1] ?? null;
  const current = onEvent ?? currentSlug;

  // Close after choosing, and on an outside tap or Escape.
  const close = () => setOpen(false);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <div className="switcher" ref={box}>
      <button type="button" className="event-switch" aria-label="Switch event" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((o) => !o)}>
        <ChevronDown size={18} strokeWidth={2.6} style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.15s ease" }} />
      </button>
      {open && (
        <div className="switcher__menu" role="menu">
          <p className="eyebrow switcher__title">Your events</p>
          {events.length ? (
            events.map((e) => (
              <Link key={e.slug} role="menuitem" href={`/e/${e.slug}`} onClick={close} className="switcher__item" aria-current={e.slug === current ? "true" : undefined}>
                <span style={{ minWidth: 0 }}>
                  <span className="switcher__name">{e.name}</span>
                  <span className="switcher__when">{e.when}</span>
                </span>
                {e.slug === current && <Check size={18} strokeWidth={2.6} aria-label="Current event" />}
              </Link>
            ))
          ) : (
            <p className="muted switcher__empty">No upcoming events yet.</p>
          )}
          <div className="switcher__foot">
            <Link role="menuitem" href="/events" onClick={close} className="switcher__item"><Plus size={16} strokeWidth={2.6} /> All events &amp; join code</Link>
            <Link role="menuitem" href="/discover" onClick={close} className="switcher__item"><Search size={16} strokeWidth={2.6} /> Find events</Link>
          </div>
        </div>
      )}
    </div>
  );
}
