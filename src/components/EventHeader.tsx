import Link from "next/link";
import type { Event } from "@/lib/events";
import { eventMeta } from "@/lib/format";

export function EventHeader({ event, members, compact = false, community }: { event: Event; members: number; compact?: boolean; community?: { slug: string; name: string } | null }) {
  const meta = [eventMeta(event), `${members} ${members === 1 ? "person" : "people"} on meetadev`].filter(Boolean).join(" · ");
  return (
    <div className={`event-head ${compact ? "event-head--compact" : ""}`}>
      <div className="event-head__band" aria-hidden><i /><i /><i /><i /></div>
      <p className="eyebrow">{meta}</p>
      <h1 className={compact ? "h1" : "display"} style={{ overflowWrap: "anywhere" }}>{event.name}</h1>
      {community && <p className="muted">Hosted by <Link className="link" href={`/c/${community.slug}`}>{community.name}</Link></p>}
      {!compact && event.about && <p className="lead" style={{ whiteSpace: "pre-line" }}>{event.about}</p>}
    </div>
  );
}
