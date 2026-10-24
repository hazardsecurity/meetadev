import Link from "next/link";
import type { Person } from "@/lib/people";
import { Avatar } from "./Avatar";
import { IntentChips, roleLine } from "./Chips";
import { ConnectButton } from "./ConnectButton";

export function PersonCard({ person, reason, slug }: { person: Person; reason?: string; slug?: string }) {
  return (
    <article className="person">
      <Link href={`/p/${person.handle}`} className="person__head">
        <Avatar name={person.name} color={person.color} photo={person.photo_url} />
        <div style={{ minWidth: 0 }}>
          <h3 className="person__name">{person.name}</h3>
          <p className="person__meta">{person.headline || roleLine(person.role, person.level)}</p>
        </div>
      </Link>
      {person.headline && <p className="person__meta">{roleLine(person.role, person.level)}</p>}
      <IntentChips intents={person.intents} max={3} />
      {reason && (
        <p className="person__why">
          <span aria-hidden>💡</span>
          {reason}
        </p>
      )}
      <ConnectButton userId={person.user_id} relation={person.relation} firstName={person.name.split(" ")[0]} slug={slug} />
    </article>
  );
}
