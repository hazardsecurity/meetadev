"use client";

import { ArrowLeft, ArrowRight, Undo2, UserPlus, X } from "lucide-react";
import { motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { pass, undoSwipe, wantToMeet } from "@/lib/actions";
import type { DeckCard } from "@/lib/people";
import { AyoSays } from "./Ayo";
import { Avatar } from "./Avatar";
import { Celebrate } from "./Celebrate";
import { useHydrated } from "./LocalTime";
import { IntentChips, roleLine } from "./Chips";
import { SafetyMenu } from "./SafetyMenu";

type Choice = "meet" | "pass";
type Result = { error?: string; ok?: string };
const firstName = (name: string) => name.split(" ")[0];
// A card must be on screen this long before a choice counts (the second tap of a double tap lands on the next card).
const SETTLE_MS = 350;
const COACHED = "mad-deck-coached";
const wasCoached = () => { try { return !!localStorage.getItem(COACHED); } catch { return false; } };

/** People who are here, one at a time. Meet stays private until it's mutual; Pass hides them at this event. */
export function SwipeDeck({ slug, cards, me, waiting, checkin = true }: {
  slug: string; cards: DeckCard[]; me: { name: string; color: number; photo_url: string }; waiting: number;
  /** False while joining is enough: no "Here" badge or "here today" talk on the cards. */
  checkin?: boolean;
}) {
  const [i, setI] = useState(0);
  const [done, setDone] = useState<DeckCard[]>([]); // newest last; Undo walks back through it
  const [note, setNote] = useState("");
  const [match, setMatch] = useState<DeckCard | null>(null);
  const [, start] = useTransition();
  const router = useRouter();
  const card = cards[i];

  // A fresh batch from the server (Check for new people) starts from its first card.
  const [batch, setBatch] = useState(cards);
  if (batch !== cards) { setBatch(cards); setI(0); setDone([]); }

  // When a choice, Undo or "Keep going" last brought up a new card. The first card on load isn't guarded.
  const shownAt = useRef(0);

  // First visit: show how swiping works on top of the first card, and hold choices until "Got it".
  const hydrated = useHydrated();
  const [coached, setCoached] = useState(false);
  const coach = hydrated && !coached && !wasCoached();
  const endCoach = () => {
    try { localStorage.setItem(COACHED, "1"); } catch { /* private mode: shown again next visit */ }
    shownAt.current = performance.now();
    setCoached(true);
  };

  const choose = (choice: Choice) => {
    if (!card || match || coach || performance.now() - shownAt.current < SETTLE_MS) return;
    const c = card;
    shownAt.current = performance.now();
    setI((n) => n + 1);
    setDone((d) => [...d, c]);
    setNote(choice === "meet" ? `Saved. ${firstName(c.name)} only finds out if they want to meet you too.` : "");
    start(async () => {
      const res: Result = await (choice === "meet" ? wantToMeet(c.user_id, slug) : pass(slug, c.user_id))
        .catch(() => ({ error: "Couldn't save that. Check your connection and try again." }));
      if (res.error) {
        // Put them back so the choice can be made again.
        setI(cards.indexOf(c));
        setDone((d) => d.slice(0, Math.max(0, d.indexOf(c))));
        setNote(res.error);
      } else if (res.ok === "connected") {
        setNote("");
        setDone((d) => d.filter((x) => x !== c)); // a match isn't undone from the deck
        setMatch(c);
        navigator.vibrate?.([180, 80, 180]);
      }
    });
  };

  const undo = () => {
    const c = done.at(-1);
    if (!c) return;
    shownAt.current = performance.now();
    setDone((d) => d.slice(0, -1));
    setI(cards.indexOf(c));
    setNote("");
    start(async () => {
      const res: Result = await undoSwipe(slug, c.user_id).catch(() => ({ error: "Couldn't undo that. Try again." }));
      if (res.error) setNote(res.error);
    });
  };

  // Arrow keys on a keyboard; re-bound each render so they use the current card.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || (e.target instanceof HTMLElement && e.target.closest("input, textarea, select, [contenteditable='true']"))) return;
      if (e.key === "ArrowLeft") choose("pass");
      else if (e.key === "ArrowRight") choose("meet");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (match)
    return (
      <div className="deck-match" data-hold-prompt>
        <Celebrate first={firstName(me.name)} title="It's a match" cta="Say hi" next={`/chat/${match.handle}`}
          line={`You and ${firstName(match.name)} both want to meet. Say hi and find each other.`}
          art={
            <span className="deck-match__faces">
              <Avatar name={me.name} color={me.color} photo={me.photo_url} size={120} />
              <Avatar name={match.name} color={match.color} photo={match.photo_url} size={120} />
            </span>
          }>
          <button className="btn btn--white" style={{ minWidth: 220 }} onClick={() => { shownAt.current = performance.now(); setMatch(null); }}>Keep going</button>
        </Celebrate>
      </div>
    );

  if (!card)
    return (
      <div className="empty">
        <AyoSays mood="happy" side="below">
          {waiting > 0
            ? `You've seen everyone here for now. ${waiting} more ${waiting === 1 ? "person has" : "people have"} joined but not checked in yet. They'll show up once they do.`
            : "You've seen everyone here for now. New people show up as they join."}
        </AyoSays>
        <div className="row" style={{ justifyContent: "center" }}>
          {done.length > 0 && <button className="btn btn--white btn--sm" onClick={undo}>Go back one</button>}
          <button className="btn btn--sm" onClick={() => router.refresh()}>Check for new people</button>
        </div>
      </div>
    );

  return (
    <div className="deck-wrap">
      <div className="deck">
        {cards[i + 1] && <div className="dcard dcard--peek" aria-hidden />}
        <Card key={card.user_id} card={card} onSwipe={choose} checkin={checkin} locked={coach} />
        {coach && (
          <div className="coach" data-hold-prompt role="dialog" aria-label="How the deck works">
            <p className="coach__zone"><ArrowLeft size={28} aria-hidden /><strong>Swipe left to pass</strong><small>They never know.</small></p>
            <p className="coach__zone"><ArrowRight size={28} aria-hidden /><strong>Swipe right to meet</strong><small>They only find out if they want to meet you too.</small></p>
            <button className="btn btn--white coach__ok" onClick={endCoach} autoFocus>Got it</button>
          </div>
        )}
      </div>
      {note && <p className="deck__note" role="status">{note}</p>}
      <div className="deck__actions">
        <button className="round" onClick={undo} disabled={!done.length || coach} aria-label="Undo">
          <Undo2 size={20} strokeWidth={2.4} />
        </button>
        <button className="btn btn--white" onClick={() => choose("pass")} disabled={coach}><X size={20} strokeWidth={2.4} />Pass</button>
        <button className="btn btn--green" onClick={() => choose("meet")} disabled={coach}><UserPlus size={20} strokeWidth={2.4} />Meet</button>
      </div>
      <p className="hint deck__keys">On a keyboard: ← Pass, → Meet</p>
    </div>
  );
}

function Card({ card, onSwipe, checkin, locked }: { card: DeckCard; onSwipe: (c: Choice) => void; checkin: boolean; locked: boolean }) {
  const still = useReducedMotion();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 240], [-10, 10]);
  // The MEET / PASS stamps fade in as the card is dragged toward a choice.
  const meet = useTransform(x, [20, 110], [0, 1]);
  const pass = useTransform(x, [-110, -20], [1, 0]);
  return (
    <motion.article
      className="dcard"
      aria-label={card.name}
      style={{ x, rotate }}
      drag={still || locked ? false : "x"}
      dragSnapToOrigin
      onDragEnd={(_, info) => {
        if (info.offset.x > 110) onSwipe("meet");
        else if (info.offset.x < -110) onSwipe("pass");
      }}
      initial={still ? false : { scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <motion.span className="stamp stamp--meet" style={{ opacity: meet }} aria-hidden>Meet</motion.span>
      <motion.span className="stamp stamp--pass" style={{ opacity: pass }} aria-hidden>Pass</motion.span>
      <div className="dcard__top">
        <Avatar name={card.name} color={card.color} photo={card.photo_url} size={120} />
        {checkin && <span className="chip chip--green dcard__here"><span className="live" aria-hidden />Here</span>}
      </div>
      <div className="dcard__body">
        <div>
          <h2 className="dcard__name">{card.name}</h2>
          <p className="person__meta">{roleLine(card.role, card.level)}</p>
        </div>
        {card.headline && <p>{card.headline}</p>}
        <p className="person__why"><span aria-hidden>💡</span>{card.reason || (checkin ? "You're both here today. Say hi?" : "You're both going. Say hi?")}</p>
        <IntentChips intents={card.intents} max={3} />
        {card.stack.length > 0 && <div className="chips">{card.stack.slice(0, 4).map((s) => <span key={s} className="chip">{s}</span>)}</div>}
        <Link href={`/p/${card.handle}`} className="link dcard__more" draggable={false}>See their full badge</Link>
        <SafetyMenu userId={card.user_id} firstName={firstName(card.name)} connected={false} />
      </div>
    </motion.article>
  );
}
