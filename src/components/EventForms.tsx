"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/actions";
import { createEvent, joinByCode, updateEvent } from "@/lib/event-actions";
import { applyForOrganizer } from "@/lib/organizer-actions";
import { CommunityPicker } from "./CommunityPicker";
import type { CommunityLite } from "@/lib/community-kinds";
import type { Event } from "@/lib/events";

export function EventForm({ event, communities = [] }: { event?: Event; communities?: CommunityLite[] }) {
  const action = event ? updateEvent.bind(null, event.slug) : createEvent;
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const v = state.values;
  return (
    <form action={formAction} className="stack">
      {communities.length > 0 && (
        <div className="field">
          <label htmlFor="community_id">Community</label>
          <select id="community_id" name="community_id" className="select"
            defaultValue={v?.community_id ?? event?.community_id ?? (event ? "" : communities[0].id)}>
            <option value="">Not linked to a community</option>
            {communities.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.city}</option>)}
          </select>
          <span className="hint">The event shows on your community&apos;s page, for people who follow its city.</span>
        </div>
      )}
      <div className="field">
        <label htmlFor="name">Event name</label>
        <input id="name" name="name" className="input" required minLength={3} maxLength={80}
          defaultValue={v?.name ?? event?.name} placeholder="DevFest Ilorin 2026" />
      </div>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="city">City</label>
          <input id="city" name="city" className="input" required minLength={2} maxLength={60} defaultValue={v?.city ?? event?.city} placeholder="Ilorin" />
        </div>
        <div className="field">
          <label htmlFor="starts_on">Date</label>
          <input id="starts_on" name="starts_on" type="date" className="input" defaultValue={v?.starts_on ?? event?.starts_on ?? ""} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="about">Welcome note <span className="hint">(optional)</span></label>
        <textarea id="about" name="about" className="textarea" maxLength={400} defaultValue={v?.about ?? event?.about}
          placeholder="Shown to people when they open your invite link." />
      </div>
      <label className="check">
        <input type="checkbox" name="listed" defaultChecked={v ? v.listed === "on" : (event?.listed ?? true)} />
        <span>
          <strong>Show in &quot;Find events&quot;</strong>
          <span className="hint"> People who follow your city will see this event and can open its page.</span>
        </span>
      </label>
      {state.error && <p className="error" role="alert">{state.error}</p>}
      {state.ok && <p className="success" role="status">{state.ok}</p>}
      <button className="btn btn--green" disabled={pending}>{pending ? "Saving…" : event ? "Save changes" : "Create event"}</button>
    </form>
  );
}

export function JoinCodeForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(joinByCode, {});
  return (
    <form action={formAction} className="stack" style={{ "--gap": "10px" } as React.CSSProperties}>
      <label htmlFor="join-code" className="label">Have a join code?</label>
      <div className="row" style={{ flexWrap: "nowrap" }}>
        <input id="join-code" name="code" className="input code-input" required maxLength={6} autoComplete="off"
          autoCapitalize="characters" spellCheck={false} placeholder="ABC123" />
        <button className="btn" disabled={pending}>Join</button>
      </div>
      {state.error && <p className="error" role="alert">{state.error}</p>}
    </form>
  );
}

export function OrganizerApplyForm({ defaultCity }: { defaultCity: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(applyForOrganizer, {});
  const v = state.values;
  if (state.ok) return <p className="card card--green success">Application sent! We&apos;ll review it soon. Check back on this page.</p>;
  return (
    <form action={formAction} className="stack">
      <CommunityPicker defaultCity={defaultCity} values={v} />
      <div className="field">
        <label htmlFor="note">Your role, or anything else? <span className="hint">(optional)</span></label>
        <textarea id="note" name="note" className="textarea" maxLength={400} defaultValue={v?.note}
          placeholder="I'm a co-organiser of the chapter and we're planning DevFest in November." />
      </div>
      {state.error && <p className="error" role="alert">{state.error}</p>}
      <button className="btn btn--green" disabled={pending}>{pending ? "Sending…" : "Apply"}</button>
    </form>
  );
}
