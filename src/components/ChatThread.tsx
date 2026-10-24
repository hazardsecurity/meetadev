"use client";

import { SendHorizontal } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { sendMessage } from "@/lib/chat-actions";
import { AyoSays } from "./Ayo";
import { LocalTime } from "./LocalTime";
import { PushToggle } from "./PushToggle";

type Msg = { id: string; from_user: string; body: string; created_at: string; read_at: string | null; pending?: boolean };

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
    const { messages: fresh } = (await res.json()) as { messages: Msg[] };
    if (!fresh.length) return;
    latest.current = fresh.at(-1)!.created_at;
    setMessages((list) => {
      const known = new Set(list.map((m) => m.id));
      return [...list.filter((m) => !m.pending), ...fresh.filter((m) => !known.has(m.id))].sort((a, b) => a.created_at.localeCompare(b.created_at));
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
    const temp: Msg = { id: `tmp-${Date.now()}`, from_user: me, body, created_at: new Date().toISOString(), read_at: null, pending: true };
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
      setMessages((list) => list.map((m) => (m.id === temp.id ? res.message! : m)));
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
                <span className="msg__meta"><LocalTime iso={m.created_at} format="time" />{mine && !m.pending && m.read_at ? " · Seen" : ""}</span>
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
