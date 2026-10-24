"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** True only in the browser, after hydration (server snapshot is false). */
export const useHydrated = () => useSyncExternalStore(subscribe, () => true, () => false);

type Format = "time" | "day" | "smart";

export function formatLocal(iso: string | Date, format: Format) {
  const d = new Date(iso);
  if (format === "time") return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (format === "day") return d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString([], { day: "numeric", month: "short" });
}

/** A date/time in the reader's own time zone. Renders nothing on the server. */
export function LocalTime({ iso, format = "smart" }: { iso: string | Date; format?: Format }) {
  const hydrated = useHydrated();
  const value = new Date(iso).toISOString();
  return <time dateTime={value}>{hydrated ? formatLocal(iso, format) : ""}</time>;
}
