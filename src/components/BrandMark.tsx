import { MARK } from "@/lib/brand";

export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox={MARK.viewBox} aria-hidden style={{ display: "block", flex: "none" }}>
      {[MARK.left, MARK.right].map((a) => (
        <path key={a.d} d={a.d} fill="none" stroke={a.color} strokeWidth={MARK.stroke} strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {MARK.heads.map((h) => (
        <circle key={h.cx} cx={h.cx} cy={h.cy} r={h.r} fill={h.color} />
      ))}
    </svg>
  );
}
