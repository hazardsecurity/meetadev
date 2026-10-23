"use client";

import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { Ayo } from "./Ayo";
import { BrandMark } from "./BrandMark";

type Slide = { title: string; body: string; art: () => React.ReactNode };

const SLIDES: Slide[] = [
  {
    title: "meetadev",
    body: "Meet the people you came to meet at DevFest and GDG events: mentors, learners, collaborators and teams that are hiring.",
    art: () => <ArtCrowd />,
  },
  {
    title: "I'll find your people",
    body: "Tell me what you do and what you're looking for. I'll point out who at the event you should say hi to, and why.",
    art: () => <ArtMatch />,
  },
  {
    title: "Your number stays yours",
    body: "Send a request, or scan someone's badge. WhatsApp and phone numbers are only swapped when you both say yes.",
    art: () => <ArtPrivacy />,
  },
  {
    title: "Climb the leaderboard",
    body: "Every connection counts. See who's met the most people at your event, and how many more you need to move up.",
    art: () => <ArtPodium />,
  },
];
const LAST = SLIDES.length - 1;
// Finishing (or skipping) the intro remembers it was seen, then opens the homepage.
const DONE = "/api/start?choice=browse";

export function GetStarted() {
  const [[index, dir], setPage] = useState<[number, number]>([0, 1]);
  const still = useReducedMotion();
  const go = useCallback((to: number) => setPage(([i]) => [Math.max(0, Math.min(LAST, to)), to > i ? 1 : -1]), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60 || info.velocity.x < -400) go(index + 1);
    else if (info.offset.x > 60 || info.velocity.x > 400) go(index - 1);
  };

  const slide = SLIDES[index];
  const variants = {
    enter: (d: number) => (still ? { opacity: 0 } : { opacity: 0, x: d * 80 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => (still ? { opacity: 0 } : { opacity: 0, x: d * -80 }),
  };

  return (
    <main className="intro">
      <header className="intro__top">
        <span className="intro__brand"><BrandMark size={26} /><strong>meetadev</strong></span>
        {index < LAST && <a className="intro__skip" href={DONE}>Skip</a>}
      </header>

      <AnimatePresence mode="wait" custom={dir} initial={false}>
        <motion.section
          key={index}
          className="intro__slide"
          custom={dir}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.32, ease: [0.4, 0, 0.05, 1] }}
          drag={still ? false : "x"}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={onDragEnd}
          aria-roledescription="slide"
          aria-label={`${index + 1} of ${LAST + 1}`}
        >
          <div className="intro__art">{slide.art()}</div>
          <div className="intro__copy">
            <p className="eyebrow">{index + 1} of {LAST + 1}</p>
            <h1 className={index === 0 ? "display intro__title" : "h1 intro__title"}>{slide.title}</h1>
            <p className="lead">{slide.body}</p>
          </div>
        </motion.section>
      </AnimatePresence>

      <footer className="intro__foot">
        <div className="intro__dots" role="tablist" aria-label="Intro slides">
          {Array.from({ length: LAST + 1 }, (_, n) => (
            <button key={n} role="tab" aria-selected={n === index} aria-label={`Slide ${n + 1}`}
              className={n === index ? "is-on" : undefined} onClick={() => go(n)} />
          ))}
        </div>
        <div className="intro__nav">
          {index > 0 && <button className="btn btn--white" onClick={() => go(index - 1)}>Back</button>}
          {index < LAST ? (
            <button className="btn intro__next" onClick={() => go(index + 1)}>Next</button>
          ) : (
            <a className="btn intro__next" href={DONE}>Get started</a>
          )}
        </div>
      </footer>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Illustrations: simple shapes plus Ayo, in the festival colours.

const Face = ({ initials, color, big }: { initials: string; color: string; big?: boolean }) => (
  <span className={`art-face ${big ? "art-face--big" : ""}`} style={{ background: color, color: color === "var(--yellow)" ? "var(--ink)" : "#fff" }}>
    {initials}
  </span>
);

function Person({ initials, color, tag, tone }: { initials: string; color: string; tag: string; tone: string }) {
  return (
    <span className="art-person">
      <Face initials={initials} color={color} />
      <span className={`chip chip--${tone}`}>{tag}</span>
    </span>
  );
}

function ArtCrowd() {
  return (
    <div className="art">
      <div className="art__row">
        <Person initials="TA" color="var(--blue)" tag="Mentor" tone="green" />
        <Person initials="AB" color="var(--red)" tag="Learning" tone="blue" />
      </div>
      <Ayo mood="wave" size={132} />
      <div className="art__row">
        <Person initials="KA" color="var(--green)" tag="Hiring" tone="green" />
        <Person initials="CO" color="var(--yellow)" tag="Designer" tone="yellow" />
      </div>
    </div>
  );
}

function ArtMatch() {
  return (
    <div className="art">
      <div className="art-card">
        <Face initials="AB" color="var(--red)" />
        <span><strong>Aisha</strong><span className="chip chip--yellow">Wants a mentor</span></span>
      </div>
      <div className="art__row" style={{ alignItems: "center" }}>
        <Ayo mood="happy" size={84} />
        <span className="art-why">💡 You both work with Flutter</span>
      </div>
      <div className="art-card">
        <Face initials="TA" color="var(--blue)" />
        <span><strong>Tolu</strong><span className="chip chip--green">Mentors in Flutter</span></span>
      </div>
    </div>
  );
}

function ArtPrivacy() {
  const still = useReducedMotion();
  return (
    <div className="art">
      <div className="art__row" style={{ alignItems: "center", gap: 18 }}>
        <Face initials="TA" color="var(--blue)" big />
        <motion.span
          className="art-lock"
          animate={still ? {} : { rotate: [0, -12, 12, 0], scale: [1, 1.12, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 1.4 }}
          aria-hidden
        >
          🔒
        </motion.span>
        <Face initials="KA" color="var(--green)" big />
      </div>
      <div className="art__row">
        <span className="chip chip--green">✓ Tolu said yes</span>
        <span className="chip chip--green">✓ Kunle said yes</span>
      </div>
      <Ayo mood="wink" size={84} />
    </div>
  );
}

function ArtPodium() {
  return (
    <div className="art">
      <Ayo mood="excited" size={92} />
      <div className="podium art-podium">
        {[
          { rank: 2, n: 3, face: "AB", color: "var(--red)" },
          { rank: 1, n: 4, face: "TA", color: "var(--blue)" },
          { rank: 3, n: 2, face: "CO", color: "var(--green)" },
        ].map((p) => (
          <div key={p.rank} className={`podium__slot podium__slot--${p.rank}`}>
            <span className="podium__medal" aria-hidden>{["🥇", "🥈", "🥉"][p.rank - 1]}</span>
            <Face initials={p.face} color={p.color} />
            <span className="podium__score">{p.n}</span>
            <span className="podium__block">{p.rank}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
