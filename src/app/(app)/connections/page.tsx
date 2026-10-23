import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { AyoSays } from "@/components/Ayo";
import { roleLine } from "@/components/Chips";
import { requireMember } from "@/lib/auth";
import { telLink, waLink } from "@/lib/links";
import { connections } from "@/lib/people";

export const metadata: Metadata = { title: "Contacts" };

const GOAL = 10;

export default async function ConnectionsPage() {
  const me = await requireMember("/connections");
  const list = await connections(me.id);
  const n = list.length;

  return (
    <div className="stack narrow" style={{ "--gap": "24px" } as React.CSSProperties}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 className="h1">Your contacts</h1>
        {n > 0 && <a className="btn btn--white btn--sm" href="/api/vcard" download>Save all to phone</a>}
      </div>

      <div className="card goal">
        <AyoSays mood={n >= GOAL ? "excited" : n > 0 ? "happy" : "wave"} size={72}>
          {n >= GOAL
            ? `${n} connections! You're a networking legend.`
            : n > 0
              ? `${n} down, ${GOAL - n} to go for your goal. Keep going!`
              : `Your goal: meet ${GOAL} new people. Let's start with one.`}
        </AyoSays>
        <div className="row" style={{ flexWrap: "nowrap" }}>
          <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={GOAL} aria-valuenow={Math.min(n, GOAL)} aria-label="Connection goal">
            <div className="progress__fill" style={{ width: `${Math.min(100, (n / GOAL) * 100)}%`, background: "var(--yellow)" }} />
          </div>
          <strong className="mono">{Math.min(n, GOAL)}/{GOAL}</strong>
        </div>
      </div>

      {n === 0 ? (
        <div className="row" style={{ justifyContent: "center" }}><Link className="btn" href="/people">Find people</Link></div>
      ) : (
        list.map((c) => (
          <article key={c.user_id} className="person">
            <Link href={`/p/${c.handle}`} className="person__head">
              <Avatar name={c.name} color={c.color} photo={c.photo_url} />
              <div style={{ minWidth: 0 }}>
                <h3 className="person__name">{c.name}</h3>
                <p className="person__meta">{c.headline || roleLine(c.role, c.level)}</p>
              </div>
            </Link>
            <div className="row">
              {c.whatsapp && <a className="btn btn--green btn--sm" href={waLink(c.whatsapp)} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
              {c.phone && <a className="btn btn--white btn--sm" href={telLink(c.phone)}>Call</a>}
              {c.contact_email && <a className="btn btn--white btn--sm" href={`mailto:${c.contact_email}`}>Email</a>}
            </div>
          </article>
        ))
      )}
    </div>
  );
}
