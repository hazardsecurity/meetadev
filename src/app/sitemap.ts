import type { MetadataRoute } from "next";
import { query } from "@/lib/db";
import { SITE_URL } from "@/lib/site";

// The homepage, every listed event and every community page.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const events = await query<{ slug: string; updated: Date }>(
    `SELECT slug, created_at AS updated FROM events
      WHERE listed AND (starts_on IS NULL OR starts_on >= current_date - 30)
      ORDER BY created_at DESC LIMIT 5000`,
  ).catch(() => []);
  const communities = await query<{ slug: string }>(
    "SELECT slug FROM communities WHERE status = 'active' ORDER BY name LIMIT 20000",
  ).catch(() => []);
  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    ...["/privacy", "/terms", "/guidelines"].map((p) => ({ url: `${SITE_URL}${p}`, changeFrequency: "yearly" as const, priority: 0.2 })),
    ...communities.map((c) => ({ url: `${SITE_URL}/c/${c.slug}`, changeFrequency: "weekly" as const, priority: 0.5 })),
    ...events.map((e) => ({ url: `${SITE_URL}/e/${e.slug}`, lastModified: e.updated, changeFrequency: "daily" as const, priority: 0.7 })),
  ];
}
