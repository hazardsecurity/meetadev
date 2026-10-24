"use client";

import { RefreshCw, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

const MINE = process.env.NEXT_PUBLIC_BUILD_ID;
const EVERY = 60_000;

/** "New changes have been made to meetadev" when a newer version is live. */
export function UpdateBanner() {
  const [stale, setStale] = useState(false);
  const [hidden, setHidden] = useState(false);
  const still = useReducedMotion();

  useEffect(() => {
    let stopped = false;
    const check = async () => {
      if (stopped || document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        const { build } = (await res.json()) as { build?: string };
        if (build && MINE && build !== MINE) setStale(true);
      } catch { /* offline: try again later */ }
    };
    const timer = setInterval(check, EVERY);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    void check();
    return () => { stopped = true; clearInterval(timer); document.removeEventListener("visibilitychange", check); window.removeEventListener("focus", check); };
  }, []);

  return (
    <AnimatePresence>
      {stale && !hidden && (
        <motion.div
          className="update"
          role="status"
          initial={still ? { opacity: 0 } : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={still ? { opacity: 0 } : { opacity: 0, y: 24 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
        >
          <span className="update__icon" aria-hidden><RefreshCw size={18} /></span>
          <span className="update__text">New changes have been made to meetadev.</span>
          <button className="btn btn--sm" onClick={() => window.location.reload()}>Refresh</button>
          <button className="update__close" aria-label="Dismiss" onClick={() => setHidden(true)}><X size={18} /></button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
