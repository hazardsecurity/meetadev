import type { NextConfig } from "next";

// Each deploy gets an ID baked into the page and the /api/version route, so
// open tabs can notice a newer version and offer to refresh.
const buildId = process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA || `local-${Date.now()}`;

// Almost every screen depends on the signed-in attendee, so the app renders
// per request instead of using Cache Components.
const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BUILD_ID: buildId },
};

export default nextConfig;
