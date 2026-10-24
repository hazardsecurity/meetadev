"use client";

import { Bell, BellOff } from "lucide-react";
import { useEffect, useState } from "react";

type State = "loading" | "unsupported" | "ios-install" | "blocked" | "off" | "on";

const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function keyBytes(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registration() {
  return (await navigator.serviceWorker.getRegistration("/")) ?? navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

/** "Turn on notifications" for this device. Asks for permission only when tapped. */
export function PushToggle({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !KEY) {
        return setState(ios && !standalone ? "ios-install" : "unsupported");
      }
      if (Notification.permission === "denied") return setState("blocked");
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  const turnOn = async () => {
    setBusy(true);
    setError("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setState(permission === "denied" ? "blocked" : "off"); return; }
      const reg = await registration();
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(KEY) }));
      const res = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
      if (!res.ok) throw new Error("save failed");
      setState("on");
    } catch {
      setError("Couldn't turn on notifications. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  };

  if (state === "loading") return null;
  if (compact && (state === "on" || state === "unsupported")) return null;

  return (
    <div className="push">
      <span className={`push__icon ${state === "on" ? "is-on" : ""}`} aria-hidden>{state === "on" ? <Bell size={20} /> : <BellOff size={20} />}</span>
      <div className="push__text">
        <strong>Notifications</strong>
        <span className="hint">
          {state === "on" && "On for this device. You'll hear about new requests and messages."}
          {state === "off" && "Get a ping when someone wants to connect or sends you a message."}
          {state === "blocked" && "Blocked in your browser settings. Allow notifications for meetadev there, then come back."}
          {state === "ios-install" && "On iPhone: tap Share, then “Add to Home Screen”, and open meetadev from there to turn these on."}
          {state === "unsupported" && "This browser doesn't support notifications."}
        </span>
        {error && <span className="error">{error}</span>}
      </div>
      {state === "off" && <button className="btn btn--sm" onClick={turnOn} disabled={busy}>Turn on</button>}
      {state === "on" && <button className="btn btn--ghost btn--sm" onClick={turnOff} disabled={busy}>Turn off</button>}
    </div>
  );
}
