export function formatDate(d: string | null) {
  return d
    ? new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    : "";
}

/** "DevFest Ilorin 2026" → "devfest-ilorin-2026". Empty when nothing usable is left. */
export const slugify = (text: string, max: number) =>
  text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, max);

export const eventMeta = (e: { city: string; starts_on: string | null }) => [e.city, formatDate(e.starts_on)].filter(Boolean).join(" · ");
