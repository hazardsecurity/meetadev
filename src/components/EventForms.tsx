"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/actions";
import { createEvent, joinByCode, updateEvent } from "@/lib/event-actions";
import type { Event } from "@/lib/events";

export function EventForm({ event }: { event?: Event }) {
  const action = event ? updateEvent.bind(null, event.slug) : createEvent;
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  return (
    <form action={formAction} className="stack">
      <div className="field">
        <label htmlFor="name">Event name</label>
        <input id="name" name="name" className="input" required minLength={3} maxLength={80}
          defaultValue={event?.name} placeholder="DevFest Ilorin 2026" />
      </div>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="city">City</label>
          <input id="city" name="city" className="input" maxLength={60} defaultValue={event?.city} placeholder="Ilorin" />
        </div>
        <div className="field">
          <label htmlFor="starts_on">Date</label>
          <input id="starts_on" name="starts_on" type="date" className="input" defaultValue={event?.starts_on ?? ""} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="about">Welcome note <span className="hint">(optional)</span></label>
        <textarea id="about" name="about" className="textarea" maxLength={400} defaultValue={event?.about}
          placeholder="Shown to people when they open your invite link." />
      </div>
      <label className="check">
        <input type="checkbox" name="require_code" defaultChecked={event?.require_code ?? false} />
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
