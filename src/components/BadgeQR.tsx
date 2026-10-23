"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

/** QR code that opens your profile; scanning it is the fastest way to connect in person. */
export function BadgeQR({ handle, name }: { handle: string; name: string }) {
  const [svg, setSvg] = useState("");
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const link = `${window.location.origin}/p/${handle}`;
    QRCode.toString(link, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#202124", light: "#ffffff" } })
      .then((s) => { setSvg(s); setUrl(link); });
  }, [handle]);

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: `${name} on meetadev`, url }); } catch { /* dismissed */ }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="stack" style={{ justifyItems: "center" }}>
      <div className="qr" role="img" aria-label="QR code linking to your profile" dangerouslySetInnerHTML={{ __html: svg }} />
      <button className="btn btn--white btn--sm" onClick={share} disabled={!url}>{copied ? "Link copied!" : "Share my profile link"}</button>
    </div>
  );
}
