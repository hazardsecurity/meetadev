import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { AyoSays } from "@/components/Ayo";
import { IntentChips, roleLine } from "@/components/Chips";
import { ConnectButton } from "@/components/ConnectButton";
import { MetBar } from "@/components/MetBar";
import { SafetyMenu } from "@/components/SafetyMenu";
import { requireMember } from "@/lib/auth";
import { publicLinks, telLink, waLink } from "@/lib/links";
import { meetStatus, profileByHandle } from "@/lib/people";

export const metadata: Metadata = { title: "Profile", robots: { index: false } };

export default async function ProfilePage({ params }: PageProps<"/p/[handle]">) {
  const { handle } = await params;
  const me = await requireMember(`/p/${handle}`);
  const found = await profileByHandle(me.id, handle);
  if (!found) notFound();
  const { person: p, contact } = found;
  const first = p.name.split(" ")[0];
  const links = publicLinks(p);
  const connected = p.relation === "connected";
  // Badge scans land here, so this is where two people who just met tap We met.
  const met = p.relation === "self" ? null : await meetStatus(me.id, p.user_id, connected);

  return (
    <div className="profile">
      <section className="card profile__card">
        <div className="profile__head">
          <Avatar name={p.name} color={p.color} photo={p.photo_url} size={88} />
          <div className="stack" style={{ "--gap": "4px", minWidth: 0 } as React.CSSProperties}>
            <h1 className="h1" style={{ overflowWrap: "anywhere" }}>{p.name}</h1>
            {p.headline && <p className="lead">{p.headline}</p>}
            <p className="muted">{roleLine(p.role, p.level)}</p>
          </div>
        </div>
        <IntentChips intents={p.intents} />
        {p.bio && <p style={{ whiteSpace: "pre-line" }}>{p.bio}</p>}
        {p.stack.length > 0 && (
          <div className="stack" style={{ "--gap": "8px" } as React.CSSProperties}>
            <span className="eyebrow">Works with</span>
            <div className="chips">{p.stack.map((s) => <span key={s} className="chip">{s}</span>)}</div>
          </div>
        )}
        {links.length > 0 && (
          <div className="row">
            {links.map((l) => (
              <a key={l.label} className="btn btn--white btn--sm" href={l.href} target="_blank" rel="noopener noreferrer nofollow">{l.label} ↗</a>
            ))}
          </div>
        )}
      </section>

      <aside className="stack profile__side">
        {p.relation === "self" ? (
          <div className="card stack">
            <AyoSays mood="wink" size={72}>This is how other attendees see you.</AyoSays>
            <Link href="/onboarding" className="btn btn--white btn--block">Edit profile</Link>
          </div>
        ) : contact ? (
          <div className="card card--green stack">
            <h2 className="h2">Say hi to {first} 👋</h2>
            <Link className="btn btn--block" href={`/chat/${p.handle}`}>Message {first}</Link>
            {contact.whatsapp && <a className="btn btn--white btn--block" href={waLink(contact.whatsapp)} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
            {contact.phone && <a className="btn btn--white btn--block" href={telLink(contact.phone)}>Call {contact.phone}</a>}
            {contact.contact_email && <a className="btn btn--white btn--block" href={`mailto:${contact.contact_email}`}>Email</a>}
          </div>
        ) : (
          <div className="card stack">
            <AyoSays mood={p.relation === "outgoing" ? "thinking" : "happy"} size={72}>
              {p.relation === "outgoing"
                ? `You want to meet ${first}. They'll only find out if they want to meet you too, and then you can chat.`
                : `Want to meet ${first}? It stays private unless they want to meet you too.`}
            </AyoSays>
            <ConnectButton userId={p.user_id} relation={p.relation} firstName={first} />
          </div>
        )}
        {met && <MetBar otherId={p.user_id} firstName={first} status={met} connected={connected} />}
        {p.relation !== "self" && <SafetyMenu userId={p.user_id} firstName={first} connected={connected} />}
      </aside>
    </div>
  );
}
