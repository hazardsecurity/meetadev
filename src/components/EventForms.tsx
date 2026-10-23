"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/actions";
import { createEvent, joinByCode, updateEvent } from "@/lib/event-actions";
import { applyForOrganizer } from "@/lib/organizer-actions";
import type { Event } from "@/lib/events";

export function EventForm({ event }: { event?: Event }) {
  const action = event ? updateEvent.bind(null, event.slug) : createEvent;
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const v = state.values;
  return (
    <form action={formAction} className="stack">
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
      <label className="check">
        <input type="checkbox" name="require_code" defaultChecked={v ? v.require_code === "on" : (event?.require_code ?? false)} />
        <span>
          <strong>Ask for the join code</strong>
          <span className="hint">
            {" "}Invite links still work without typing it. Turn this on if the event page link might leak beyond your attendees.
          </span>
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
      <div className="field">
        <label htmlFor="chapter_name">GDG chapter</label>
        <input id="chapter_name" name="chapter_name" className="input" required minLength={3} maxLength={80} placeholder="GDG Ilorin" defaultValue={v?.chapter_name} />
      </div>
      <div className="field">
        <label htmlFor="chapter_url">Chapter page</label>
        <input id="chapter_url" name="chapter_url" type="url" className="input" required maxLength={200}
          placeholder="https://gdg.community.dev/gdg-ilorin/" defaultValue={v?.chapter_url} />
        <span className="hint">Your chapter&apos;s page on gdg.community.dev, where you&apos;re listed as an organiser.</span>
      </div>
      <div className="field">
        <label htmlFor="apply_city">City</label>
        <input id="apply_city" name="city" className="input" required minLength={2} maxLength={60} defaultValue={v?.city ?? defaultCity} placeholder="Ilorin" />
      </div>
      <div className="field">
        <label htmlFor="note">Anything else? <span className="hint">(optional)</span></label>
        <textarea id="note" name="note" className="textarea" maxLength={400}
          placeholder="Your role in the chapter, or an event you're planning." defaultValue={v?.note} />
      </div>
      {state.error && <p className="error" role="alert">{state.error}</p>}
      <button className="btn btn--green" disabled={pending}>{pending ? "Sending…" : "Apply"}</button>
    </form>
  );
}
