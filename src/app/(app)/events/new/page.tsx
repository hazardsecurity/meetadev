import type { Metadata } from "next";
import { AyoSays } from "@/components/Ayo";
import { EventForm } from "@/components/EventForms";
import { requireMember } from "@/lib/auth";

export const metadata: Metadata = { title: "Create an event" };

export default async function NewEventPage() {
  await requireMember("/events/new");
  return (
    <div className="stack narrow" style={{ "--gap": "20px" } as React.CSSProperties}>
      <AyoSays mood="excited" size={96}>Ooh, a new event! Tell me about it and I&apos;ll make you an invite link.</AyoSays>
      <div className="card"><EventForm /></div>
    </div>
  );
}
