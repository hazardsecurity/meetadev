"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { useHydrated } from "./LocalTime";

/** QR + copy/share for an event link (the invite, or the check-in code). `path` is relative to the site origin. */
export function InviteQR({ path, title, size = 200, actions = true, linkName = "invite link" }: { path: string; title: string; size?: number; actions?: boolean; linkName?: string }) {
  const [svg, setSvg] = useState("");
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const hydrated = useHydrated();

  useEffect(() => {
    const link = `${window.location.origin}${path}`;
    QRCode.toString(link, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#202124", light: "#ffffff" } }).then(
      (s) => { setSvg(s); setUrl(link); },
    );
  }, [path]);

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const share = async () => {
    try { await navigator.share({ title, url }); } catch { /* dismissed */ }
  };

  return (
    <div className="stack" style={{ justifyItems: "center", "--gap": "12px" } as React.CSSProperties}>
      <div className="qr" style={{ width: size }} role="img" aria-label={`QR code for ${title}`} dangerouslySetInnerHTML={{ __html: svg }} />
      {actions && (
        <>
          <code className="invite-url">{url}</code>
          <div className="row" style={{ justifyContent: "center" }}>
            <button className="btn btn--sm" onClick={copy} disabled={!url}>{copied ? "Copied!" : `Copy ${linkName}`}</button>
            {/* After hydration only: the server can't know if this browser can share. */}
            {hydrated && "share" in navigator && (
              <button className="btn btn--white btn--sm" onClick={share} disabled={!url}>Share</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
