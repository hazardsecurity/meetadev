import "server-only";
import { cookies } from "next/headers";
import { after } from "next/server";
import { ANALYTICS_OPT_OUT, POSTHOG_HOST, POSTHOG_KEY } from "./analytics-config";

/**
 * Records a product event for a signed-in person, after the response is sent so it never slows an action down.
 * Only ids and counts: never names, contact details or message text. Skipped when analytics is off or opted out.
 */
export async function track(userId: string, event: string, properties: Record<string, string | number | boolean> = {}) {
  if (!POSTHOG_KEY) return;
  if ((await cookies()).has(ANALYTICS_OPT_OUT)) return;
  after(async () => {
    try {
      await fetch(`${POSTHOG_HOST}/i/v0/e/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: POSTHOG_KEY, event, distinct_id: userId, properties: { ...properties, $lib: "meetadev-server", $geoip_disable: true } }),
        signal: AbortSignal.timeout(3000),
      });
    } catch {
      // Analytics is best-effort.
    }
  });
}
