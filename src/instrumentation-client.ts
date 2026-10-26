import { startAnalytics } from "@/lib/analytics-client";

// Runs before the app is interactive. Analytics loads in the background and must never break the page.
startAnalytics().catch(() => {});
