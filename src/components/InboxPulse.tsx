"use client";

import { useEffect } from "react";

const EVERY = 15_000;
export const UNREAD_EVENT = "meetadev:unread";
/** Fire this to check in now instead of waiting for the next beat. */
export const CHECK_INBOX = "meetadev:check-inbox";

/** While a signed-in tab is open, mark incoming messages delivered and share the unread count. */
export function InboxPulse() {
  useEffect(() => {
    let stopped = false;
    const beat = async () => {
      if (stopped || document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/inbox", { method: "POST", cache: "no-store" });
        if (!res.ok) return;
        const { unread } = (await res.json()) as { unread: number };
        window.dispatchEvent(new CustomEvent(UNREAD_EVENT, { detail: unread }));
      } catch { /* offline: next beat */ }
    };
    const timer = setInterval(beat, EVERY);
    document.addEventListener("visibilitychange", beat);
    window.addEventListener(CHECK_INBOX, beat);
    void beat();
    return () => { stopped = true; clearInterval(timer); document.removeEventListener("visibilitychange", beat); window.removeEventListener(CHECK_INBOX, beat); };
  }, []);
  return null;
}
