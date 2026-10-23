"use client";

import { motion, useReducedMotion } from "motion/react";
import { Ayo } from "./Ayo";
import { BrandMark } from "./BrandMark";

const OPTIONS = [
  { choice: "attend", emoji: "🎟️", title: "I'm attending", hint: "Find events in your city and the people worth meeting there", tone: "blue" },
  { choice: "organise", emoji: "🎤", title: "I'm organising", hint: "Set up your GDG chapter's event with an invite link and QR code", tone: "green" },
] as const;

export function GetStarted() {
  const still = useReducedMotion();
  const pop = (n: number) =>
    still ? {} : { initial: { opacity: 0, y: 16, scale: 0.96 }, animate: { opacity: 1, y: 0, scale: 1 }, transition: { type: "spring" as const, stiffness: 380, damping: 24, delay: 0.25 + n * 0.08 } };

  return (
    <main className="start">
      <div className="start__brand"><BrandMark size={28} /><strong>meetadev</strong></div>

      <div className="start__body">
        <motion.div {...(still ? {} : { initial: { scale: 0.5, opacity: 0 }, animate: { scale: 1, opacity: 1 }, transition: { type: "spring", stiffness: 400, damping: 18 } })}>
          <Ayo mood="wave" size={132} label="Ayo, the meetadev buddy, waving" />
        </motion.div>
        <motion.div className="bubble start__q" {...pop(0)}>
          Hi, I&apos;m Ayo! Are you heading to a DevFest or GDG event?
        </motion.div>

        <div className="start__options">
          {OPTIONS.map((o, n) => (
            <motion.a key={o.choice} href={`/api/start?choice=${o.choice}`} className={`start__option start__option--${o.tone}`} {...pop(n + 1)}>
              <span className="start__emoji" aria-hidden>{o.emoji}</span>
              <span>
                <strong>{o.title}</strong>
                <span className="start__hint">{o.hint}</span>
              </span>
              <span className="start__arrow" aria-hidden>→</span>
            </motion.a>
          ))}
        </div>

        <motion.div className="start__links" {...pop(3)}>
          <a href="/api/start?choice=code">I have a join code</a>
          <span aria-hidden>·</span>
          <a href="/api/start?choice=browse">Just looking around</a>
        </motion.div>
      </div>
    </main>
  );
}
