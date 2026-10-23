import { ImageResponse } from "next/og";
import { markSvg } from "@/lib/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Home-screen icon: the mark on white, with iOS-friendly padding.
export default function AppleIcon() {
  const src = `data:image/svg+xml;utf8,${encodeURIComponent(markSvg(120))}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff" }}>
        <img src={src} width={120} height={120} alt="" />
      </div>
    ),
    size,
  );
}
