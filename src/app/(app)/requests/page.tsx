import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { AyoSays } from "@/components/Ayo";
import { IntentChips, roleLine } from "@/components/Chips";
import { ConnectButton } from "@/components/ConnectButton";
import { requireMember } from "@/lib/auth";
import { incomingRequests, outgoingRequests, type RequestRow } from "@/lib/people";

export const metadata: Metadata = { title: "Requests" };

export default async function RequestsPage() {
  const me = await requireMember("/requests");
  const [incoming, outgoing] = await Promise.all([incomingRequests(me.id), outgoingRequests(me.id)]);

  return (
    <div className="stack narrow" style={{ "--gap": "28px" } as React.CSSProperties}>
      <section className="stack">
        <h1 className="h1">Requests</h1>
        {incoming.length ? (
          incoming.map((r) => <RequestCard key={r.request_id} r={r} incoming />)
        ) : (
          <div className="empty">
            <AyoSays mood="happy" side="below">No new requests. Go say hi to someone. Most people are waiting for you to make the first move!</AyoSays>
            <Link href="/people" className="btn">Find people</Link>
          </div>
        )}
      </section>

      {outgoing.length > 0 && (
        <section className="stack">
          <h2 className="h2">Waiting for a reply</h2>
          {outgoing.map((r) => <RequestCard key={r.request_id} r={r} />)}
        </section>
      )}
    </div>
  );
}

function RequestCard({ r, incoming = false }: { r: RequestRow; incoming?: boolean }) {
  return (
    <article className="person">
      <Link href={`/p/${r.handle}`} className="person__head">
        <Avatar name={r.name} color={r.color} photo={r.photo_url} />
        <div style={{ minWidth: 0 }}>
          <h3 className="person__name">{r.name}</h3>
          <p className="person__meta">{r.headline || roleLine(r.role, r.level)}</p>
        </div>
      </Link>
      <IntentChips intents={r.intents} max={3} />
      {r.note && <p className="bubble" style={{ fontSize: "0.95rem" }}>“{r.note}”</p>}
      <ConnectButton userId={r.user_id} requestId={r.request_id} relation={incoming ? "incoming" : "outgoing"} firstName={r.name.split(" ")[0]} />
    </article>
  );
}
