import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Ayo } from "@/components/Ayo";
import { InviteQR } from "@/components/InviteQR";
import { requireMember } from "@/lib/auth";
import { eventBySlug, membership } from "@/lib/events";

export const metadata: Metadata = { title: "Join screen", robots: { index: false } };

// Full-screen join slide for the projector between sessions.
export default async function ScreenPage({ params }: PageProps<"/e/[slug]/screen">) {
  const { slug } = await params;
  const me = await requireMember(`/e/${slug}/screen`);
  const event = await eventBySlug(slug);
  if (!event) notFound();
  if ((await membership(event.id, me.id)) !== "organizer") redirect(`/e/${slug}`);

  return (
    <main className="screen">
      <div className="screen__copy">
        <p className="eyebrow">Find the people you should meet</p>
        <h1 className="display">{event.name}</h1>
        <p className="screen__lead">Scan to join, then sign in with Google. Ayo will show you who to say hi to.</p>
        <p className="screen__code">Join code <strong className="join-code">{event.join_code}</strong></p>
        <Ayo mood="wave" size={150} />
      </div>
      <InviteQR path={`/e/${slug}?code=${event.join_code}`} title={event.name} size={420} actions={false} />
    </main>
  );
}
