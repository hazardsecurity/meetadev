import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { AyoSays } from "@/components/Ayo";
import { ChatThread } from "@/components/ChatThread";
import { MetBar } from "@/components/MetBar";
import { requireMember } from "@/lib/auth";
import { canChat, markRead, thread } from "@/lib/chat";
import { waLink } from "@/lib/links";
import { eventsTogether } from "@/lib/events";
import { meetStatus, profileByHandle } from "@/lib/people";

export const metadata: Metadata = { title: "Chat" };

export default async function ChatPage({ params }: PageProps<"/chat/[handle]">) {
  const { handle } = await params;
  const me = await requireMember(`/chat/${handle}`);
  const found = await profileByHandle(me.id, handle);
  if (!found || found.person.relation === "self") notFound();
  const { person: p, contact } = found;
  const first = p.name.split(" ")[0];

  if (!(await canChat(me.id, p.user_id))) {
    return (
      <div className="stack narrow">
        <AyoSays mood="thinking" size={84}>{`You can chat with ${first} once you're connected.`}</AyoSays>
        <Link className="btn" href={`/p/${p.handle}`} style={{ justifySelf: "start" }}>View {first}&apos;s profile</Link>
      </div>
    );
  }

  const [messages, met, together] = await Promise.all([thread(me.id, p.user_id), meetStatus(me.id, p.user_id, true), eventsTogether(me.id, p.user_id)]);
  await markRead(me.id, p.user_id);

  return (
    <div className="narrow chat-page">
      <header className="chat__head">
        <Link href="/connections" className="chat__back" aria-label="Back to chats">←</Link>
        <Link href={`/p/${p.handle}`} className="person__head" style={{ minWidth: 0, flex: 1 }}>
          <Avatar name={p.name} color={p.color} photo={p.photo_url} size={40} />
          <span style={{ minWidth: 0 }}>
            <span className="person__name" style={{ display: "block" }}>{p.name}</span>
            <span className="person__meta">{p.headline || "Tap to see their badge"}</span>
          </span>
        </Link>
        {contact?.whatsapp && <a className="btn btn--white btn--sm ph-no-capture" href={waLink(contact.whatsapp)} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
      </header>
      <MetBar otherId={p.user_id} firstName={first} status={met} connected />
      <ChatThread me={me.id} other={p.user_id} firstName={first} initial={messages}
        events={together.map((e) => ({ name: e.name, at: e.at.toISOString() }))} />
    </div>
  );
}
