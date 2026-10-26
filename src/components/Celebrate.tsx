"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Ayo } from "./Ayo";

const COLORS = ["#4285F4", "#EA4335", "#FBBC05", "#34A853"];
// Fixed confetti layout so server and client render the same thing.
const PIECES = Array.from({ length: 28 }, (_, n) => ({
  x: ((n * 37) % 100) - 50,
  y: -120 - ((n * 53) % 120),
  r: (n * 47) % 360,
  c: COLORS[n % 4],
  round: n % 3 === 0,
  d: (n % 7) * 0.04,
}));

/** Full-screen moment with confetti. Defaults to "your badge is ready"; `title`, `art` and `children` (extra actions) reuse it. */
export function Celebrate({ first, line, cta, next, title, art, children }: {
  first: string; line: string; cta?: string; next?: string; title?: string; art?: React.ReactNode; children?: React.ReactNode;
}) {
  const still = useReducedMotion();
  return (
    <div className="celebrate">
      <div className="celebrate__stage" aria-hidden>
        {!still && PIECES.map((p, n) => (
          <motion.i
            key={n}
            className="confetti"
            style={{ background: p.c, borderRadius: p.round ? "50%" : 3 }}
            initial={{ x: 0, y: 0, opacity: 0, rotate: 0, scale: 0.4 }}
            animate={{ x: p.x * 5, y: [0, p.y, p.y + 260], opacity: [0, 1, 0], rotate: p.r * 2, scale: 1 }}
            transition={{ duration: 1.8, delay: 0.35 + p.d, ease: [0.16, 1, 0.3, 1] }}
          />
        ))}
        <motion.div
          initial={still ? { opacity: 0 } : { scale: 0.3, y: 40, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 380, damping: 16 }}
        >
          {art ?? <Ayo mood="excited" size={170} />}
        </motion.div>
      </div>
      <motion.div className="stack" style={{ justifyItems: "center", textAlign: "center" }}
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}>
        <h1 className="h1" style={{ color: "var(--green-shade)" }}>{title ?? `Your badge is ready, ${first}!`}</h1>
        <p className="lead">{line}</p>
        {next && <Link href={next} className="btn btn--green" style={{ minWidth: 220, marginTop: 8 }}>{cta}</Link>}
        {children}
      </motion.div>
    </div>
  );
}
