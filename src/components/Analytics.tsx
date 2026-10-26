"use client";

import { useEffect, useSyncExternalStore } from "react";
import { analyticsAvailable, analyticsOptedOut, identify, setAnalytics } from "@/lib/analytics-client";

/** Ties this browser's analytics to the signed-in account id. Renders nothing. */
export function AnalyticsIdentify({ userId }: { userId: string }) {
  useEffect(() => identify(userId), [userId]);
  return null;
}

// The opt-out cookie is the source of truth; the switch tells listeners when it changes.
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const isOn = () => !analyticsOptedOut();

function choose(on: boolean) {
  setAnalytics(on);
  listeners.forEach((fn) => fn());
}

/** "Help improve meetadev": on unless turned off. Shown only when analytics is set up. */
export function AnalyticsToggle() {
  const on = useSyncExternalStore(subscribe, isOn, () => true);
  if (!analyticsAvailable()) return null;
  return (
    <div className="card stack" style={{ "--gap": "10px" } as React.CSSProperties}>
      <div>
        <strong>Help improve meetadev</strong>
        <p className="hint">
          Shares how you use the app (pages, taps, and screen recordings with your typing, chats and contact details hidden) so we can
          fix what&apos;s confusing. Never sold or used for ads. <a className="link" href="/privacy#analytics">More</a>
        </p>
      </div>
      <div className="theme-switch" role="radiogroup" aria-label="Usage analytics">
        <button type="button" role="radio" aria-checked={on} className="theme-switch__opt" onClick={() => choose(true)}>On</button>
        <button type="button" role="radio" aria-checked={!on} className="theme-switch__opt" onClick={() => choose(false)}>Off</button>
      </div>
    </div>
  );
}
