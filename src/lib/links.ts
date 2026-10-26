export const waLink = (n: string) => `https://wa.me/${n.replace(/[^0-9]/g, "").replace(/^0/, "234")}`;
export const telLink = (n: string) => `tel:${n.replace(/[^0-9+]/g, "")}`;
export const webLink = (v: string) => (/^https?:\/\//i.test(v) ? v : `https://${v}`);

/** Where to go after sign-in: a path on this site only. Control characters are refused
 *  because browsers drop tabs and newlines, which turns "/\t/evil.com" into "//evil.com". */
export function safeNext(value: unknown, fallback = "/events") {
  return typeof value === "string" && /^\/(?!\/)[^\\\x00-\x1f]*$/.test(value) ? value : fallback;
}

export function publicLinks(p: { linkedin: string; github: string; x_handle: string; website: string }) {
  return [
    p.linkedin && { label: "LinkedIn", href: `https://www.linkedin.com/in/${encodeURIComponent(p.linkedin)}` },
    p.github && { label: "GitHub", href: `https://github.com/${encodeURIComponent(p.github)}` },
    p.x_handle && { label: "X", href: `https://x.com/${encodeURIComponent(p.x_handle)}` },
    p.website && { label: "Website", href: webLink(p.website) },
  ].filter((l): l is { label: string; href: string } => !!l);
}
