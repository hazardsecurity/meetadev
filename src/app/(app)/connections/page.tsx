import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { AyoSays } from "@/components/Ayo";
import { roleLine } from "@/components/Chips";
import { LocalTime } from "@/components/LocalTime";
import { PushToggle } from "@/components/PushToggle";
import { requireMember } from "@/lib/auth";
import { summaries } from "@/lib/chat";
import { connections } from "@/lib/people";

export const metadata: Metadata = { title: "Chats" };

const GOAL = 10;


export default async function ChatsPage() {
  const me = await requireMember("/connections");
  const [list, chats] = await Promise.all([connections(me.id), summaries(me.id)]);
  const byPerson = new Map(chats.map((c) => [c.other, c]));
  // Latest conversation first, then people you haven't messaged yet.
  const sorted = [...list].sort((a, b) => {
    const ta = byPerson.get(a.user_id)?.last_at ?? a.connected_at;
    const tb = byPerson.get(b.user_id)?.last_at ?? b.connected_at;
    return new Date(tb).getTime() - new Date(ta).getTime();
  });
  const n = list.length;

  return (
    <div className="stack narrow" style={{ "--gap": "20px" } as React.CSSProperties}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 className="h1">Chats</h1>
        {n > 0 && <a className="btn btn--white btn--sm" href="/api/vcard" download>Save contacts to phone</a>}
      </div>

      {n === 0 ? (
        <>
          <div className="card">
            <AyoSays mood="wave" size={72}>{`Once someone accepts your request, you can chat here. Your goal: meet ${GOAL} new people!`}</AyoSays>
          </div>
          <Link className="btn" href="/people" style={{ justifySelf: "start" }}>Find people</Link>
        </>
      ) : (
        <>
          <div className="card"><PushToggle compact /></div>
          <ul className="chats">
            {sorted.map((c) => {
              const s = byPerson.get(c.user_id);
              return (
                <li key={c.user_id}>
                  <Link href={`/chat/${c.handle}`} className={`chats__row ${s?.unread ? "is-unread" : ""}`}>
                    <Avatar name={c.name} color={c.color} photo={c.photo_url} size={48} />
                    <span className="chats__main">
                      <span className="chats__top">
                        <span className="person__name">{c.name}</span>
                        {s && <span className="chats__time"><LocalTime iso={s.last_at} /></span>}
                      </span>
                      <span className="chats__preview">
                        {s ? `${s.last_from_me ? "You: " : ""}${s.last_body}` : c.headline || roleLine(c.role, c.level) || "Say hi 👋"}
                      </span>
                    </span>
                    {s?.unread ? <span className="badge-count" aria-label={`${s.unread} unread`}>{s.unread}</span> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="hint">{n >= GOAL ? `${n} connections. You're a networking legend!` : `${n} of your ${GOAL}-person goal. Keep going!`}</p>
        </>
      )}
    </div>
  );
}
