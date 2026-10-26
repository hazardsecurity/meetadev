// Product analytics (PostHog). Off unless NEXT_PUBLIC_POSTHOG_KEY is set; on that, see the privacy policy.
export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "";
export const POSTHOG_REGION = process.env.NEXT_PUBLIC_POSTHOG_REGION === "eu" ? "eu" : "us";
export const POSTHOG_HOST = `https://${POSTHOG_REGION}.i.posthog.com`;
export const POSTHOG_ASSETS = `https://${POSTHOG_REGION}-assets.i.posthog.com`;
export const POSTHOG_UI = `https://${POSTHOG_REGION}.posthog.com`;

// Set when someone turns analytics off on My badge. A cookie (not localStorage) so the server's events honour it too.
export const ANALYTICS_OPT_OUT = "mad_no_analytics";
