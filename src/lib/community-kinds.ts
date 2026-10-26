// Shared by server and client code.
export const KINDS = [
  { id: "gdg", label: "GDG chapter", short: "GDG" },
  { id: "gdsc", label: "GDG on Campus / student club", short: "On Campus" },
  { id: "wtm", label: "Women Techmakers", short: "WTM" },
  { id: "other", label: "Developer community or meetup", short: "Community" },
] as const;
export type Kind = (typeof KINDS)[number]["id"];
export const kindIds = KINDS.map((k) => k.id) as [Kind, ...Kind[]];
export const kindLabel = (id: string) => KINDS.find((k) => k.id === id)?.label ?? "Community";
export const kindShort = (id: string) => KINDS.find((k) => k.id === id)?.short ?? "Community";

export type CommunityLite = { id: string; slug: string; name: string; kind: string; city: string; country: string; url: string };
