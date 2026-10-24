"use client";

import { Check, CheckCheck, Clock3, SendHorizontal } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { sendMessage } from "@/lib/chat-actions";
import { AyoSays } from "./Ayo";
import { LocalTime } from "./LocalTime";
import { PushToggle } from "./PushToggle";

type Msg = { id: string; from_user: string; body: string; created_at: string; delivered_at: string | null; read_at: string | null; pending?: boolean };
type Receipt = { id: string; delivered_at: string | null; read_at: string | null };

// Day boundaries in UTC are only for grouping; labels are shown in local time.
const dayKey = (iso: string) => iso.slice(0, 10);

export function ChatThread({ me, other, firstName, initial }: { me: string; other: string; firstName: string; initial: Msg[] }) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [, start] = useTransition();
  const end = useRef<HTMLDivElement>(null);
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
      // A sending bubble gives way only to its own copy coming back from the server.
      const kept = updated.filter((m) => !m.pending || !added.some((a) => a.from_user === m.from_user && a.body === m.body));
      return [...kept, ...added].sort((a, b) => a.created_at.localeCompare(b.created_at));
    });
  }, [other]);

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
    const temp: Msg = { id: `tmp-${Date.now()}`, from_user: me, body, created_at: new Date().toISOString(), delivered_at: null, read_at: null, pending: true };
    setMessages((list) => [...list, temp]);
    start(async () => {
      const res = await sendMessage(other, body);
      if (res.error || !res.message) {
        setError(res.error ?? "Couldn't send. Try again.");
        setMessages((list) => list.filter((m) => m.id !== temp.id));
        setDraft(body);
        return;
      }
      latest.current = res.message.created_at > (latest.current ?? "") ? res.message.created_at : latest.current;
      const sent = res.message;
      setMessages((list) => {
        if (list.some((m) => m.id === sent.id)) return list.filter((m) => m.id !== temp.id);
        return list.some((m) => m.id === temp.id) ? list.map((m) => (m.id === temp.id ? sent : m)) : [...list, sent];
      });
    });
  };

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
          return (
            <div key={m.id}>
              {newDay && <p className="chat__day"><LocalTime iso={m.created_at} format="day" /></p>}
              <div className={`msg ${mine ? "msg--me" : "msg--them"} ${m.pending ? "is-pending" : ""}`}>
                <p>{m.body}</p>
                <span className="msg__meta"><LocalTime iso={m.created_at} format="time" />{mine && <Ticks m={m} />}</span>
              </div>
            </div>
          );
        })}
        <div ref={end} />
      </div>
      <form className="chat__composer" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <textarea className="textarea chat__input" rows={1} maxLength={2000} value={draft} placeholder={`Message ${firstName}`} aria-label="Message"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <button className="btn chat__send" aria-label="Send" disabled={!draft.trim()}><SendHorizontal size={20} /></button>
      </form>
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}

/** One tick: sent. Two: delivered to their app. Two yellow: they've read it. */
function Ticks({ m }: { m: Msg }) {
  const [Icon, state, label] = m.pending
    ? [Clock3, "sending", "Sending"]
    : m.read_at
      ? [CheckCheck, "read", "Read"]
      : m.delivered_at
        ? [CheckCheck, "delivered", "Delivered"]
        : [Check, "sent", "Sent"];
  return (
    <span className={`ticks ticks--${state}`} title={label}>
      <Icon size={15} strokeWidth={2.6} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}
