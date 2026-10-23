"use client";

import { useState } from "react";
import { AyoSays, type Mood } from "./Ayo";

const ERRORS: Record<string, string> = {
  cancelled: "No worries! Tap the button whenever you're ready.",
  expired: "That took a little too long. Let's try again.",
  failed: "Google didn't let us in that time. Please try again.",
  busy: "Lots of people are joining from this network. Wait a few minutes and try again.",
  config: "Google sign-in isn't set up yet. Organisers: add the Google keys (see README).",
  devemail: "Test logins must end in @example.test.",
};

export function GoogleSignIn({ next, error, devLogin, eventName }: { next: string; error: string; devLogin: boolean; eventName?: string }) {
  const [pending, setPending] = useState(false);

  let mood: Mood = "wave";
  let line = eventName
    ? `Hi, I'm Ayo! Sign in with Google to join ${eventName} and meet the right people there.`
    : "Hi, I'm Ayo! Sign in with Google and I'll help you meet the right people at your event.";
  if (error && ERRORS[error]) { mood = error === "cancelled" ? "thinking" : "sad"; line = ERRORS[error]; }
  if (pending) { mood = "excited"; line = "Off to Google… see you in a sec!"; }

  return (
    <div className="auth">
      <div className="auth__buddy">
        <AyoSays mood={mood} size={120} side="below">{line}</AyoSays>
      </div>
      <div className="card stack auth__form">
        <h1 className="h1">{eventName ? `Join ${eventName}` : "Get your badge"}</h1>
        <p className="muted">New here or coming back, it&apos;s the same button. No passwords to remember.</p>
        <form method="post" action="/api/auth/google" className="stack" onSubmit={() => setPending(true)}>
          <input type="hidden" name="next" value={next} />
          <button className="btn btn--white btn--block btn--google" disabled={pending}>
            <GoogleG />
            {pending ? "Opening Google…" : "Continue with Google"}
          </button>
        </form>
        <p className="hint">
          We only get your name, email and profile photo from Google. Your email is never shown to other attendees
          unless you add it as a contact detail.
        </p>

        {devLogin && (
          <form method="post" action="/api/auth/dev" className="stack dev-login">
            <p className="eyebrow">Local testing only</p>
            <input type="hidden" name="next" value={next} />
            <input name="email" type="email" className="input" placeholder="someone@example.test" required />
            <button className="btn btn--yellow btn--sm">Sign in as test attendee</button>
          </form>
        )}
      </div>
    </div>
  );
}

function GoogleG() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
