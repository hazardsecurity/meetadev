import type { MetadataRoute } from "next";
import { query } from "@/lib/db";
import { SITE_URL } from "@/lib/site";

// The homepage plus every listed event's public page.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const events = await query<{ slug: string; updated: Date }>(
    `SELECT slug, created_at AS updated FROM events
      WHERE listed AND (starts_on IS NULL OR starts_on >= current_date - 30)
      ORDER BY created_at DESC LIMIT 5000`,
  ).catch(() => []);
  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    ...events.map((e) => ({ url: `${SITE_URL}/e/${e.slug}`, lastModified: e.updated, changeFrequency: "daily" as const, priority: 0.7 })),
  ];
}
