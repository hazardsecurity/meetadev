"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, useTransition } from "react";
import { saveProfile } from "@/lib/actions";
import { INTENTS, LEVELS, ROLES, STACK } from "@/lib/options";
import type { ProfileInput } from "@/lib/validation";
import { AyoSays, type Mood } from "./Ayo";
import { CityInput } from "./CityInput";
import { useHydrated } from "./LocalTime";

type Step = { key: string; say: (p: ProfileInput) => string; mood?: Mood; valid: (p: ProfileInput) => boolean };

// Answers so far, kept in this tab so a refresh on venue Wi-Fi doesn't lose them (cleared on Finish).
const DRAFT = "meetadev:badge-draft";
// A step must be on screen this long before Continue/Back counts, so a double tap can't skip a step unseen.
const SETTLE_MS = 350;

const STEPS: Step[] = [
  { key: "role", say: (p) => `Hey ${p.name.split(" ")[0]}! What do you do?`, mood: "wave", valid: (p) => !!p.role },
  { key: "level", say: () => "Where are you on your journey? No wrong answers.", valid: (p) => !!p.level },
  { key: "cities", say: () => "Which cities do you go to events in? I'll show you what's happening there.", mood: "thinking", valid: (p) => p.cities.length > 0 },
  { key: "intents", say: () => "What are you hoping to get from events like this? Pick all that fit.", valid: (p) => p.intents.length > 0 },
  { key: "stack", say: () => "What do you work with, or want to learn? I'll match you with people who share it.", mood: "thinking", valid: () => true },
  { key: "about", say: () => "Give people a one-line hello so they know who to look out for.", valid: (p) => p.name.trim().length >= 2 },
  { key: "contact", say: () => "How should your connections reach you? Only people you both want to meet will see this.", mood: "wink",
    valid: (p) => !!(p.whatsapp || p.phone || p.contact_email) },
  { key: "links", say: () => "Last one! Public links people at your events can see. All optional.", mood: "excited", valid: () => true },
];

export function Onboarding({ initial, editing, next, citySuggestions }: {
  initial: ProfileInput; editing: boolean; next: string; citySuggestions: string[];
}) {
  const [p, setP] = useState(initial);
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const still = useReducedMotion();
  const shownAt = useRef(0);

  // Bring back a draft from this tab once, after hydration (the server can't see sessionStorage).
  const hydrated = useHydrated();
  const [restored, setRestored] = useState(editing);
  if (hydrated && !restored) {
    setRestored(true);
    const draft = readDraft();
    if (draft?.owner === initial.contact_email) { setP({ ...initial, ...draft.p }); setI(draft.i); }
  }
  const saveDraft = () => { try { sessionStorage.setItem(DRAFT, JSON.stringify({ owner: initial.contact_email, p, i })); } catch {} };
  useEffect(() => { if (restored && !editing && !pending) saveDraft(); });
  const step = STEPS[i];
  // Coming from "I'm a GDG organiser": explain why organisers make a badge too.
  const organiser = !editing && next.startsWith("/events/new");
  const say = (p: ProfileInput) =>
    organiser && i === 0
      ? `Hey ${p.name.split(" ")[0]}! Organisers get a badge too, so attendees can find you. First, what do you do?`
      : organiser && i === STEPS.length - 1
        ? "Last one! After this, you'll apply as an organiser."
        : step.say(p);
  const last = i === STEPS.length - 1;

  const set = <K extends keyof ProfileInput>(k: K, v: ProfileInput[K]) => { setP((s) => ({ ...s, [k]: v })); setError(""); };
  const toggle = (k: "intents" | "stack", v: string, max = 10) =>
    setP((s) => {
      const list = s[k] as string[];
      return { ...s, [k]: list.includes(v) ? list.filter((x) => x !== v) : list.length >= max ? list : [...list, v] };
    });

  const ready = () => performance.now() - shownAt.current >= SETTLE_MS;
  const go = (d: number) => {
    shownAt.current = performance.now();
    setDir(d); setError(""); setI((n) => Math.min(STEPS.length - 1, Math.max(0, n + d)));
  };
  const submit = () =>
    start(async () => {
      try { sessionStorage.removeItem(DRAFT); } catch {}
      const res = await saveProfile(p, next);
      if (res?.error) setError(res.error);
    });

  const slide = still ? {} : { x: dir * 40 };

  return (
    <div className="onb">
      <div className="onb__top wrap">
        <Link href={editing ? "/me" : "/"} className="onb__close" aria-label="Close">✕</Link>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={STEPS.length} aria-valuenow={i + 1} aria-label="Profile progress">
          <div className="progress__fill" style={{ width: `${((i + 1) / STEPS.length) * 100}%` }} />
        </div>
      </div>

      <div className="wrap onb__body">
        <AyoSays mood={error ? "sad" : step.mood ?? "happy"} size={104}>{error || say(p)}</AyoSays>

        <AnimatePresence mode="wait" initial={false}>
          <motion.section
            key={step.key}
            initial={{ opacity: 0, ...slide }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: still ? 0 : dir * -40 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.05, 1] }}
            className="onb__step"
          >
            {step.key === "role" && (
              <div className="tiles tiles--2" role="group" aria-label="What you do">
                {ROLES.map((r) => (
                  <button key={r.id} type="button" className="tile" aria-pressed={p.role === r.id} onClick={() => set("role", r.id)}>
                    <span className="tile__emoji" aria-hidden>{r.emoji}</span>{r.label}
                  </button>
                ))}
              </div>
            )}

            {step.key === "level" && (
              <div className="tiles" role="group" aria-label="Your level">
                {LEVELS.map((l, n) => (
                  <button key={l.id} type="button" className="tile" aria-pressed={p.level === l.id} onClick={() => set("level", l.id)}>
                    <Bars n={n + 1} />
                    <span>{l.label}<span className="tile__hint">{l.hint}</span></span>
                  </button>
                ))}
              </div>
            )}

            {step.key === "cities" && (
              <CityInput value={p.cities} onChange={(c) => set("cities", c)} suggestions={citySuggestions} />
            )}

            {step.key === "intents" && (
              <div className="tiles tiles--2" role="group" aria-label="What you're here for">
                {INTENTS.map((it) => (
                  <button key={it.id} type="button" className="tile" aria-pressed={p.intents.includes(it.id)} onClick={() => toggle("intents", it.id, 8)}>
                    <span className={`dot dot--${it.color}`} aria-hidden />{it.label}
                  </button>
                ))}
              </div>
            )}

            {step.key === "stack" && (
              <div className="stack">
                <div className="chips" role="group" aria-label="Your stack" style={{ gap: 8 }}>
                  {STACK.map((s) => (
                    <button key={s} type="button" className="toggle-tag" aria-pressed={p.stack.includes(s)} onClick={() => toggle("stack", s)}>
                      {s}
                    </button>
                  ))}
                </div>
                <p className="hint">{p.stack.length}/10 picked</p>
              </div>
            )}

            {step.key === "about" && (
              <div className="stack">
                <Field id="name" label="Name" value={p.name} onChange={(v) => set("name", v)} max={60} autoComplete="name" />
                <Field id="headline" label="One-line intro" hint="e.g. Flutter dev at a fintech, CS student at Unilorin" value={p.headline} onChange={(v) => set("headline", v)} max={80} />
                <div className="field">
                  <label htmlFor="bio">A little more about you</label>
                  <textarea id="bio" className="textarea" maxLength={280} value={p.bio} onChange={(e) => set("bio", e.target.value)}
                    placeholder="What you're building, what you'd love to talk about, what you can help with." />
                  <span className="hint">{280 - p.bio.length} characters left</span>
                </div>
              </div>
            )}

            {step.key === "contact" && (
              <div className="stack">
                <p className="lock-note"><span aria-hidden>🔒</span> Private. Only shown to people once you <strong>both</strong> tap Meet.</p>
                <Field id="whatsapp" label="WhatsApp number" type="tel" placeholder="+234 801 234 5678" value={p.whatsapp} onChange={(v) => set("whatsapp", v)} max={24} autoComplete="tel" />
                <Field id="phone" label="Phone number (if different)" type="tel" value={p.phone} onChange={(v) => set("phone", v)} max={24} />
                <Field id="contact_email" label="Email for contacts" type="email" value={p.contact_email} onChange={(v) => set("contact_email", v)} max={120} autoComplete="email" />
              </div>
            )}

            {step.key === "links" && (
              <div className="stack">
                <Field id="linkedin" label="LinkedIn" placeholder="linkedin.com/in/yourname" value={p.linkedin} onChange={(v) => set("linkedin", v)} max={120} />
                <Field id="github" label="GitHub" placeholder="yourname" value={p.github} onChange={(v) => set("github", v)} max={120} />
                <Field id="x_handle" label="X (Twitter)" placeholder="@yourname" value={p.x_handle} onChange={(v) => set("x_handle", v)} max={120} />
                <Field id="website" label="Website or portfolio" placeholder="yourname.dev" value={p.website} onChange={(v) => set("website", v)} max={120} />
                <button type="button" className="tile" aria-pressed={p.listed} onClick={() => set("listed", !p.listed)}>
                  <span className="tile__emoji" aria-hidden>{p.listed ? "👀" : "🙈"}</span>
                  <span>Show me in the attendee directory<span className="tile__hint">
                    {p.listed ? "People can find you by searching." : "Hidden. People can still connect by scanning your badge QR."}
                  </span></span>
                </button>
              </div>
            )}
          </motion.section>
        </AnimatePresence>
      </div>

      <footer className="onb__foot">
        <div className="wrap row" style={{ justifyContent: "space-between" }}>
          {i > 0 ? <button type="button" className="btn btn--white" onClick={() => ready() && go(-1)}>Back</button> : <span />}
          <button
            type="button"
            className={`btn ${step.valid(p) ? "btn--green" : ""}`}
            disabled={!step.valid(p) || pending}
            onClick={() => { if (!ready()) return; if (last) submit(); else go(1); }}
          >
            {last ? (pending ? "Saving…" : editing ? "Save" : "Finish") : "Continue"}
          </button>
        </div>
      </footer>
    </div>
  );
}

function readDraft(): { owner: string; p: Partial<ProfileInput>; i: number } | null {
  try { return JSON.parse(sessionStorage.getItem(DRAFT) ?? "null"); } catch { return null; }
}

function Bars({ n }: { n: number }) {
  return (
    <span className="bars" aria-hidden>
      {[1, 2, 3, 4, 5].map((b) => <i key={b} style={{ height: 4 + b * 4, opacity: b <= n ? 1 : 0.2 }} />)}
    </span>
  );
}

function Field({ id, label, hint, value, onChange, max, type = "text", placeholder, autoComplete }: {
  id: string; label: string; hint?: string; value: string; onChange: (v: string) => void; max: number;
  type?: string; placeholder?: string; autoComplete?: string;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} className="input" type={type} value={value} maxLength={max} placeholder={placeholder}
        autoComplete={autoComplete} onChange={(e) => onChange(e.target.value)} />
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}
