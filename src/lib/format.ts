export function formatDate(d: string | null) {
  return d
    ? new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    : "";
}

export const eventMeta = (e: { city: string; starts_on: string | null }) => [e.city, formatDate(e.starts_on)].filter(Boolean).join(" · ");
