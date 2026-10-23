"use client";

import { motion, useReducedMotion } from "motion/react";
import { Ayo } from "./Ayo";

// Illustrative attendee types, not real people.
const BADGES = [
  { x: 22, y: 12, emoji: "📱", title: "Flutter dev", tag: "Mentors", color: "green" },
  { x: 78, y: 26, emoji: "🎒", title: "CS student", tag: "Wants a mentor", color: "yellow" },
  { x: 78, y: 70, emoji: "🧠", title: "ML engineer", tag: "Hiring", color: "green" },
  { x: 22, y: 56, emoji: "🎨", title: "Designer", tag: "Collab", color: "blue" },
  { x: 52, y: 92, emoji: "🚀", title: "Founder", tag: "Co-founder", color: "red" },
] as const;

const LINE = ["#34A853", "#FBBC05", "#4285F4", "#4285F4", "#EA4335"];

export function HeroNetwork() {
  const still = useReducedMotion();
  return (
    <div className="net" aria-hidden>
      <svg className="net__lines" viewBox="0 0 100 100" preserveAspectRatio="none">
        {BADGES.map((b, n) => (
          <motion.line
            key={n}
            x1="50" y1="48"
            stroke={LINE[n]} strokeWidth={3} strokeLinecap="round" strokeOpacity={0.8}
            vectorEffect="non-scaling-stroke"
            initial={still ? { x2: b.x, y2: b.y, opacity: 0 } : { x2: 50, y2: 48, opacity: 0 }}
            animate={{ x2: b.x, y2: b.y, opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.5 + n * 0.18, ease: [0.4, 0, 0.05, 1] }}
          />
        ))}
      </svg>
      <motion.div className="net__ayo"
        initial={still ? { opacity: 0 } : { scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 18 }}>
        <Ayo mood="wave" size={150} />
      </motion.div>
      {BADGES.map((b, n) => (
        <motion.div
          key={b.title}
          className="net__badge"
          style={{ left: `${b.x}%`, top: `${b.y}%` }}
          initial={still ? { opacity: 0 } : { opacity: 0, scale: 0.6, rotate: n % 2 ? 8 : -8 }}
          animate={{ opacity: 1, scale: 1, rotate: n % 2 ? 3 : -3 }}
          transition={{ type: "spring", stiffness: 380, damping: 17, delay: 0.9 + n * 0.18 }}
        >
          <span className="net__emoji">{b.emoji}</span>
          <span>
            <strong>{b.title}</strong>
            <span className={`chip chip--${b.color}`}>{b.tag}</span>
          </span>
        </motion.div>
      ))}
    </div>
  );
}
