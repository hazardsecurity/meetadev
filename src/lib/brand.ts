// The meetadev mark: two people standing shoulder to shoulder, forming an "m".
// Drawn on a 64×64 grid; shared by the logo, app icons and share image.

export const MARK = {
  viewBox: "0 0 64 64",
  stroke: 8,
  left: { d: "M12 58V36a10 10 0 0 1 20 0v22", color: "#4285F4" },
  right: { d: "M32 58V36a10 10 0 0 1 20 0v22", color: "#EA4335" },
  heads: [
    { cx: 22, cy: 13, r: 7, color: "#FBBC05" },
    { cx: 42, cy: 13, r: 7, color: "#34A853" },
  ],
} as const;

/** Standalone SVG markup, e.g. for the favicon. */
export function markSvg(size = 64) {
  const arch = (a: { d: string; color: string }) =>
    `<path d="${a.d}" fill="none" stroke="${a.color}" stroke-width="${MARK.stroke}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const heads = MARK.heads.map((h) => `<circle cx="${h.cx}" cy="${h.cy}" r="${h.r}" fill="${h.color}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${MARK.viewBox}">${arch(MARK.left)}${arch(MARK.right)}${heads}</svg>`;
}
