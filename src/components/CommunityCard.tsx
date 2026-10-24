import Link from "next/link";
import { kindShort } from "@/lib/community-kinds";
import type { CommunityWithEvents } from "@/lib/communities";

const TONE: Record<string, string> = { gdg: "blue", gdsc: "green", wtm: "red", other: "yellow" };

export function CommunityCard({ c }: { c: CommunityWithEvents }) {
  return (
    <Link href={`/c/${c.slug}`} className="community-card">
      <span className={`community-card__mark avatar--${["gdg", "wtm", "other", "gdsc"].indexOf(c.kind) % 4}`} aria-hidden>
        {c.name.replace(/^(GDG|WTM|GDSC)\s+/i, "").slice(0, 1).toUpperCase()}
      </span>
      <span style={{ minWidth: 0 }}>
        <span className="person__name" style={{ display: "block" }}>{c.name}</span>
        <span className="person__meta">
          📍 {[c.city, c.country].filter(Boolean).join(", ")}
          {c.upcoming > 0 && ` · ${c.upcoming} upcoming ${c.upcoming === 1 ? "event" : "events"}`}
        </span>
      </span>
      <span className={`chip chip--${TONE[c.kind] ?? "blue"}`}>{kindShort(c.kind)}</span>
    </Link>
  );
}
