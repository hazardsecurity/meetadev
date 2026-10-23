import type { NextConfig } from "next";

// Almost every screen depends on the signed-in attendee, so the app renders
// per request instead of using Cache Components.
const nextConfig: NextConfig = {};

export default nextConfig;
