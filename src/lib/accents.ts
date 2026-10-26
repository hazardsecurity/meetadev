import type { CSSProperties } from "react";

// Event colours an organiser can pick. Shared by server and client code.
// Each text colour is checked against its fill: 4.5:1 or better.
export const ACCENTS = [
  { id: "meetadev", label: "meetadev colours", bg: "#4285f4", shade: "#2f6fd6", fg: "#ffffff" },
  { id: "purple", label: "Purple", bg: "#7c3aed", shade: "#5b21b6", fg: "#ffffff" },
  { id: "pink", label: "Pink", bg: "#d81b60", shade: "#ad1457", fg: "#ffffff" },
  { id: "red", label: "Red", bg: "#d93025", shade: "#a50e0e", fg: "#ffffff" },
  { id: "orange", label: "Orange", bg: "#fa7b17", shade: "#c25e0a", fg: "#202124" },
  { id: "yellow", label: "Yellow", bg: "#fbbc05", shade: "#d99f00", fg: "#202124" },
  { id: "green", label: "Green", bg: "#188038", shade: "#0d652d", fg: "#ffffff" },
  { id: "teal", label: "Teal", bg: "#00796b", shade: "#004d40", fg: "#ffffff" },
] as const;

export type AccentId = (typeof ACCENTS)[number]["id"];
export const accentIds = ACCENTS.map((a) => a.id) as [AccentId, ...AccentId[]];

/** CSS variables that recolour an event's buttons and stripe. None for the default. */
export function accentStyle(id: string | undefined) {
  const a = ACCENTS.find((x) => x.id === id);
  if (!a || a.id === "meetadev") return undefined;
  return { "--accent": a.bg, "--accent-shade": a.shade, "--on-accent": a.fg } as CSSProperties;
}
