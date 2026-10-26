import type { NextConfig } from "next";
import { POSTHOG_ASSETS, POSTHOG_HOST } from "./src/lib/analytics-config";

// Each deploy gets an ID baked into the page and the /api/version route, so
// open tabs can notice a newer version and offer to refresh.
const buildId = process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA || `local-${Date.now()}`;

// Almost every screen depends on the signed-in attendee, so the app renders
// per request instead of using Cache Components.
const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BUILD_ID: buildId },
  // Keep tabs someone just visited for 30s, so switching back is instant.
  // Actions that change data still refresh what they touch.
  experimental: { staleTimes: { dynamic: 30 } },
  // Analytics goes through our own domain (/ingest), so ad blockers don't drop it and no third-party host is contacted directly.
  async rewrites() {
    return [
      { source: "/ingest/static/:path*", destination: `${POSTHOG_ASSETS}/static/:path*` },
      { source: "/ingest/array/:path*", destination: `${POSTHOG_ASSETS}/array/:path*` },
      { source: "/ingest/:path*", destination: `${POSTHOG_HOST}/:path*` },
    ];
  },
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
