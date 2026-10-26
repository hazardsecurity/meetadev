import type { PostHog } from "posthog-js";
import { ANALYTICS_OPT_OUT, POSTHOG_KEY, POSTHOG_UI } from "./analytics-config";

export const analyticsAvailable = () => Boolean(POSTHOG_KEY);
export const analyticsOptedOut = () => typeof document !== "undefined" && document.cookie.split("; ").some((c) => c.startsWith(`${ANALYTICS_OPT_OUT}=`));

// The library is only downloaded when analytics is on, so it costs nothing otherwise.
let loading: Promise<PostHog | null> | null = null;

/**
 * Starts PostHog in the browser, through our own /ingest path so ad blockers don't drop it.
 * Screen recordings mask everything typed, and skip anything marked `ph-no-capture` (chats, contact details, admin).
 */
export function startAnalytics() {
  if (!POSTHOG_KEY || analyticsOptedOut()) return Promise.resolve(null);
  loading ??= import("posthog-js").then(({ default: posthog }) => {
    posthog.init(POSTHOG_KEY, {
      api_host: "/ingest",
      ui_host: POSTHOG_UI,
      defaults: "2026-08-30",
      person_profiles: "identified_only",
      persistence: "localStorage",
      respect_dnt: true,
      session_recording: { maskAllInputs: true },
    });
    return posthog;
  });
  return loading;
}

/** Link this browser's events to the signed-in person (by account id only). */
export function identify(userId: string) {
  void startAnalytics().then((ph) => {
    if (ph && ph.get_distinct_id() !== userId) ph.identify(userId);
  });
}

/** Forget the person on this browser, so the next one to sign in here starts fresh. */
export function resetAnalytics() {
  void loading?.then((ph) => ph?.reset());
}

export function setAnalytics(on: boolean) {
  if (on) {
    document.cookie = `${ANALYTICS_OPT_OUT}=; path=/; max-age=0; samesite=lax`;
    void startAnalytics().then((ph) => ph?.opt_in_capturing());
  } else {
    document.cookie = `${ANALYTICS_OPT_OUT}=1; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    void loading?.then((ph) => ph?.opt_out_capturing());
  }
}
