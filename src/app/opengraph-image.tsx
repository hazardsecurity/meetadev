import { ImageResponse } from "next/og";
import { markSvg } from "@/lib/brand";

export const alt = "meetadev: meet the people you came to meet at DevFest and GDG events";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Share card shown when a meetadev link is posted on WhatsApp, X, LinkedIn…
export default function OpengraphImage() {
  const src = `data:image/svg+xml;utf8,${encodeURIComponent(markSvg(200))}`;
  const band = ["#4285F4", "#EA4335", "#FBBC05", "#34A853"];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#ffffff" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 56, padding: "0 96px" }}>
          <img src={src} width={200} height={200} alt="" />
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ fontSize: 112, fontWeight: 700, letterSpacing: -5, color: "#202124", lineHeight: 1 }}>meetadev</div>
            <div style={{ fontSize: 40, color: "#5f6368", lineHeight: 1.25, maxWidth: 760 }}>
              Meet the people you came to meet at DevFest and GDG events.
            </div>
          </div>
        </div>
        <div style={{ display: "flex", height: 18 }}>
          {band.map((c) => <div key={c} style={{ flex: 1, background: c }} />)}
        </div>
      </div>
    ),
    size,
  );
}
