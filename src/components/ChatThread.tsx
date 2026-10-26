"use client";

import { Check, CheckCheck, Clock3, Contact, SendHorizontal } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { Message, Receipt, SharedContact } from "@/lib/chat";
import { sendMessage, shareContact } from "@/lib/chat-actions";
import { telLink, waLink } from "@/lib/links";
import { vcard } from "@/lib/vcard";
import { AyoSays } from "./Ayo";
import { CHECK_INBOX } from "./InboxPulse";
import { LocalTime } from "./LocalTime";
import { PushToggle } from "./PushToggle";

type Msg = Message & { pending?: boolean };

// Day boundaries in UTC are only for grouping; labels are shown in local time.
const dayKey = (iso: string) => iso.slice(0, 10);
const byTime = (a: Msg, b: Msg) => a.created_at.localeCompare(b.created_at);

/** `events`: events we were both checked in at, oldest first; a line names each one where the conversation reaches it. */
export function ChatThread({ me, other, firstName, initial, events = [] }: {
  me: string; other: string; firstName: string; initial: Msg[]; events?: { name: string; at: string }[];
}) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [askNumber, setAskNumber] = useState(false);
  const [number, setNumber] = useState("");
  const [pending, start] = useTransition();
  const end = useRef<HTMLDivElement>(null);
  // Only moved by polls: a reply saved just before our own send must still be fetched.
  const latest = useRef(initial.at(-1)?.created_at);

  // Braces matter: newer browsers return a Promise from scrollIntoView, and an
  // effect's return value is treated as its cleanup.
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  // Check for new messages every few seconds while the chat is on screen.
  const poll = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    const res = await fetch(`/api/chat/${other}${latest.current ? `?after=${encodeURIComponent(latest.current)}` : ""}`, { cache: "no-store" });
    if (!res.ok) return;
    const { messages: fresh, receipts = [] } = (await res.json()) as { messages: Msg[]; receipts?: Receipt[] };
    if (fresh.length) latest.current = fresh.at(-1)!.created_at;
    // The server just marked these read, so the Chats badge can drop now.
    if (fresh.some((m) => m.from_user === other && !m.read_at)) window.dispatchEvent(new Event(CHECK_INBOX));
    const ticks = new Map(receipts.map((r) => [r.id, r]));
    setMessages((list) => {
      const known = new Set(list.map((m) => m.id));
      // Update ticks on messages already on screen, without re-rendering unchanged ones.
      const updated = list.map((m) => {
        const r = ticks.get(m.id);
        return r && (r.delivered_at !== m.delivered_at || r.read_at !== m.read_at) ? { ...m, ...r } : m;
      });
      const added = fresh.filter((m) => !known.has(m.id));
      if (!added.length && updated.every((m, n) => m === list[n])) return list;
      // Each of my messages coming back from the server replaces one sending bubble with the same text.
      const back = added.filter((a) => a.from_user === me).map((a) => a.body);
      const kept = updated.filter((m) => {
        const i = m.pending ? back.indexOf(m.body) : -1;
        if (i >= 0) back.splice(i, 1);
        return i < 0;
      });
      return [...kept, ...added].sort(byTime);
    });
  }, [me, other]);

  useEffect(() => {
    const timer = setInterval(poll, 3000);
    const onFocus = () => void poll();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => { clearInterval(timer); window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onFocus); };
  }, [poll]);

  const send = () => {
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    setError("");
    const temp: Msg = { id: `tmp-${Date.now()}`, from_user: me, kind: "text", body, created_at: new Date().toISOString(), delivered_at: null, read_at: null, pending: true };
    setMessages((list) => [...list, temp]);
    start(async () => {
      const res = await sendMessage(other, body);
      if (res.error || !res.message) {
        setError(res.error ?? "Couldn't send. Try again.");
        setMessages((list) => list.filter((m) => m.id !== temp.id));
        setDraft(body);
        return;
      }
      const sent = res.message;
      setMessages((list) => [...list.filter((m) => m.id !== temp.id && m.id !== sent.id), sent].sort(byTime));
    });
  };

  // My contact card; with no number on my badge, the first try asks for one.
  const share = (withNumber = "") => {
    setError("");
    start(async () => {
      const res: Awaited<ReturnType<typeof shareContact>> = await shareContact(other, withNumber)
        .catch(() => ({ error: "Couldn't share your contact. Try again." }));
      if (res.needNumber) return setAskNumber(true);
      if (!res.message) return setError(res.error ?? "Couldn't share your contact. Try again.");
      const sent = res.message;
      setAskNumber(false);
      setNumber("");
      setMessages((list) => [...list.filter((m) => m.id !== sent.id), sent].sort(byTime));
    });
  };

  const sharedMine = messages.some((m) => m.kind === "contact" && m.from_user === me);

  // Both sides are UTC ISO strings, so comparing them as text compares the times.
  const eventAt = (iso: string) => events.filter((e) => e.at <= iso).at(-1)?.name ?? null;

  return (
    <div className="chat">
      <div className="card chat__push"><PushToggle compact /></div>
      <div className="chat__list" aria-live="polite">
        {messages.length === 0 && (
          <div className="empty"><AyoSays mood="wave" side="below">{`Say hi to ${firstName}! Maybe mention what you'd like to talk about.`}</AyoSays></div>
        )}
        {messages.map((m, n) => {
          const mine = m.from_user === me;
          const newDay = n === 0 || dayKey(messages[n - 1].created_at) !== dayKey(m.created_at);
          const event = eventAt(m.created_at);
          const newEvent = event !== null && (n === 0 || eventAt(messages[n - 1].created_at) !== event);
          return (
            <div key={m.id}>
              {newEvent && <p className="chat__event">{event}</p>}
              {newDay && <p className="chat__day"><LocalTime iso={m.created_at} format="day" /></p>}
              <div className={`msg ${mine ? "msg--me" : "msg--them"} ${m.pending ? "is-pending" : ""}`}>
                {m.kind === "contact" ? <ContactCard body={m.body} mine={mine} /> : <p>{m.body}</p>}
                <span className="msg__meta">
                  <LocalTime iso={m.created_at} format="time" />
                  {mine && <Ticks pending={m.pending} delivered={!!m.delivered_at} read={!!m.read_at} />}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={end} />
      </div>
      <div className="chat__dock">
        {askNumber ? (
          <form className="card chat__number" onSubmit={(e) => { e.preventDefault(); share(number); }}>
            <label htmlFor="share-number" className="label">Your WhatsApp number</label>
            <span className="hint" id="share-number-hint">There&apos;s no number on your badge yet. It&apos;s saved there too, and only people you&apos;ve connected with can see it.</span>
            <div className="row" style={{ flexWrap: "nowrap" }}>
              <input id="share-number" className="input" type="tel" inputMode="tel" autoComplete="tel" required maxLength={24}
                placeholder="+234 801 234 5678" value={number} onChange={(e) => setNumber(e.target.value)} aria-describedby="share-number-hint" autoFocus />
              {/* Keeps focus in the field, as Send does (BUG-025): a blur moves the dock before the tap lands. */}
              <button className="btn" disabled={pending || !number.trim()} onMouseDown={(e) => e.preventDefault()}>Share</button>
            </div>
            <button type="button" className="btn btn--ghost btn--sm" style={{ justifySelf: "start" }} onMouseDown={(e) => e.preventDefault()} onClick={() => setAskNumber(false)}>Cancel</button>
          </form>
        ) : !sharedMine && (
          <button type="button" className="btn btn--ghost btn--sm chat__share" disabled={pending} onClick={() => share()}>
            <Contact size={18} aria-hidden />Share my contact
          </button>
        )}
        <form className="chat__composer" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <textarea className="textarea chat__input" rows={1} maxLength={2000} value={draft} placeholder={`Message ${firstName}`} aria-label="Message"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
          {/* Keep focus in the box: on a phone, losing it brings the tab bar back and moves Send before the tap lands (BUG-025). */}
          <button className="btn chat__send" aria-label="Send" disabled={!draft.trim()} onMouseDown={(e) => e.preventDefault()}><SendHorizontal size={20} /></button>
        </form>
        {error && <p className="error" role="alert">{error}</p>}
      </div>
    </div>
  );
}

/** A shared contact: tap to WhatsApp, call or email, open their links, or save it to the phone's contacts. */
function ContactCard({ body, mine }: { body: string; mine: boolean }) {
  let c: SharedContact;
  try { c = JSON.parse(body); } catch { return <p>Contact card</p>; }
  const links = c.links.filter((l) => /^https?:\/\//.test(l.href));
  const save = () => {
    const url = URL.createObjectURL(new Blob([vcard({ ...c, urls: links.map((l) => l.href), note: "From meetadev" })], { type: "text/vcard" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `${c.name}.vcf` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="contact">
      <p className="contact__name"><Contact size={18} aria-hidden />{mine ? "You shared your contact" : c.name}</p>
      <dl className="contact__rows">
        {c.whatsapp && <><dt>WhatsApp</dt><dd>{c.whatsapp}</dd></>}
        {c.phone && c.phone !== c.whatsapp && <><dt>Phone</dt><dd>{c.phone}</dd></>}
        {c.email && <><dt>Email</dt><dd><a className="link" href={`mailto:${c.email}`}>{c.email}</a></dd></>}
      </dl>
      {links.length > 0 && (
        <p className="contact__links">{links.map((l) => <a key={l.href} className="link" href={l.href} target="_blank" rel="noopener noreferrer">{l.label}</a>)}</p>
      )}
      {!mine && (
        <div className="contact__actions">
          {c.whatsapp && <a className="btn btn--green btn--sm" href={waLink(c.whatsapp)} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
          {(c.phone || c.whatsapp) && <a className="btn btn--white btn--sm" href={telLink(c.phone || c.whatsapp)}>Call</a>}
          <button type="button" className="btn btn--white btn--sm" onClick={save}>Save contact</button>
        </div>
      )}
    </div>
  );
}

/** One tick: sent. Two: delivered to their app. Two blue on white: they've read it.
 *  The state is an aria-label, not text, so the chat's live region doesn't read every change aloud. */
export function Ticks({ pending = false, delivered, read, prefix = "", className = "ticks" }: {
  pending?: boolean; delivered: boolean; read: boolean; prefix?: string; className?: string;
}) {
  const [Icon, state, label] = pending
    ? [Clock3, "sending", "Sending"]
    : read
      ? [CheckCheck, "read", "Read"]
      : delivered
        ? [CheckCheck, "delivered", "Delivered"]
        : [Check, "sent", "Sent"];
  return (
    <span className={`${className} ticks--${state}`} title={label} role="img" aria-label={prefix + label}>
      <Icon size={15} strokeWidth={2.6} aria-hidden />
    </span>
  );
}
