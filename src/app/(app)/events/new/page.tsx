import type { Metadata } from "next";
import { AyoSays } from "@/components/Ayo";
import { EventForm, OrganizerApplyForm } from "@/components/EventForms";
import { requireMember } from "@/lib/auth";
import { myCommunities } from "@/lib/communities";
import { canCreateEvents, latestRequest } from "@/lib/organizers";
import { profileOf } from "@/lib/people";

export const metadata: Metadata = { title: "Create an event" };

export default async function NewEventPage() {
  const me = await requireMember("/events/new");

  if (await canCreateEvents(me)) {
    return (
      <div className="stack narrow" style={{ "--gap": "20px" } as React.CSSProperties}>
        <AyoSays mood="excited" size={96}>Ooh, a new event! Tell me about it and I&apos;ll make you an invite link.</AyoSays>
        <div className="card"><EventForm communities={await myCommunities(me.id)} /></div>
      </div>
    );
  }

  const [request, profile] = await Promise.all([latestRequest(me.id), profileOf(me.id)]);
  return (
    <div className="stack narrow" style={{ "--gap": "20px" } as React.CSSProperties}>
      {request?.status === "pending" ? (
        <div className="card">
          <AyoSays mood="thinking" size={96}>
            {`Thanks! Your application for ${request.chapter_name} is being reviewed. Once it's approved, you can create events right here.`}
          </AyoSays>
        </div>
      ) : (
        <>
          <AyoSays mood={request?.status === "rejected" ? "sad" : "wave"} size={96}>
            {request?.status === "rejected"
              ? "Your last application wasn't approved. If something was missing, you can apply again."
              : "Events on meetadev are run by their organisers. Tell us about your community or event and we'll check it."}
          </AyoSays>
          <div className="card stack">
            <h1 className="h2">Apply to be an organiser</h1>
            <OrganizerApplyForm defaultCity={profile?.cities[0] ?? ""} />
          </div>
        </>
      )}
    </div>
  );
}
