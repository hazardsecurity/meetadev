"use client";

import { Bell, Check, Share, Smartphone } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { enablePush, pushState, type PushState } from "@/components/PushToggle";
import { INSTALL_EVENT, installMode, promptInstall } from "@/lib/pwa";

type Kind = "install" | "push";
const NEVER: Record<Kind, string> = { install: "mad-never-install", push: "mad-never-push" };
const ASKED = "mad-asked";
const DELAY = 1500;

// Storage can throw (private mode, blocked site data): then we simply ask again next time.
const read = (store: () => Storage, key: string) => { try { return store().getItem(key); } catch { return null; } };
const write = (store: () => Storage, key: string) => { try { store().setItem(key, "1"); } catch { /* ignore */ } };
const local = () => localStorage;
const session = () => sessionStorage;

/** Keeps the browser's install option in step with this component. */
function useInstallMode() {
  const [mode, setMode] = useState<ReturnType<typeof installMode>>(null);
  useEffect(() => {
    const sync = () => setMode(installMode());
    sync();
    window.addEventListener(INSTALL_EVENT, sync);
    return () => window.removeEventListener(INSTALL_EVENT, sync);
  }, []);
  return mode;
}

/**
 * Asks once per visit to install the app and turn on notifications, until both are done
 * or the person taps "Don't ask again". Waits while the swipe guide or a match is on screen.
 */
export function AppPrompt() {
  const [ask, setAsk] = useState<Kind[]>([]);
  const [push, setPush] = useState<PushState | null>(null);
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const mode = useInstallMode();
  const still = useReducedMotion();

  useEffect(() => {
    if (read(session, ASKED)) return;
    let timer = 0;
    const decide = async () => {
      if (document.querySelector("[data-hold-prompt]")) { timer = window.setTimeout(decide, DELAY); return; }
      const state = await pushState().catch(() => "unsupported" as const);
      const kinds: Kind[] = [];
      if (installMode() && !read(local, NEVER.install)) kinds.push("install");
      if (state === "off" && !read(local, NEVER.push)) kinds.push("push");
      setPush(state);
      if (!kinds.length) return;
      write(session, ASKED);
      setAsk(kinds);
    };
    timer = window.setTimeout(decide, DELAY);
    return () => clearTimeout(timer);
  }, []);

  const close = () => setAsk([]);
  const never = () => { ask.forEach((k) => write(local, NEVER[k])); close(); };

  const done = (kind: Kind) => (kind === "install" ? installed : push === "on");
  useEffect(() => {
    if (!ask.length || !ask.every(done)) return;
    const t = setTimeout(close, 900);
    return () => clearTimeout(t);
  });

  const install = async () => {
    setBusy(true);
    try { if (await promptInstall()) setInstalled(true); } finally { setBusy(false); }
  };
  const allow = async () => {
    setBusy(true);
    setError("");
    try { setPush(await enablePush()); } catch { setError("Couldn't turn on notifications. Try again."); } finally { setBusy(false); }
  };

  // On iPhone, installing is also how notifications work.
  const title = ask.includes("push") || mode === "ios" ? "Know the moment you match" : "Keep meetadev one tap away";

  return (
    <AnimatePresence>
      {ask.length > 0 && (
        <motion.section
          className="ask"
          role="dialog"
          aria-modal="false"
          aria-labelledby="ask-title"
          initial={still ? { opacity: 0 } : { opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          exit={still ? { opacity: 0 } : { opacity: 0, y: 32 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        >
          <h2 id="ask-title" className="ask__title">{title}</h2>
          {ask.includes("install") && (
            <div className="push">
              <span className={`push__icon ${done("install") ? "is-on" : ""}`} aria-hidden>{done("install") ? <Check size={20} /> : <Smartphone size={20} />}</span>
              <div className="push__text">
                <strong>Add it to your home screen</strong>
                <span className="hint">
                  {mode === "ios"
                    ? <>Tap <Share size={14} aria-label="Share" style={{ verticalAlign: "-2px" }} />, then “Add to Home Screen”. On iPhone, that&apos;s also how notifications work.</>
                    : "Opens like an app, straight to your event."}
                </span>
              </div>
              {mode === "prompt" && !installed && <button className="btn btn--sm" onClick={install} disabled={busy}>Install</button>}
            </div>
          )}
          {ask.includes("push") && (
            <div className="push">
              <span className={`push__icon ${done("push") ? "is-on" : ""}`} aria-hidden>{done("push") ? <Check size={20} /> : <Bell size={20} />}</span>
              <div className="push__text">
                <strong>Turn on notifications</strong>
                <span className="hint">
                  {push === "blocked"
                    ? "Blocked in your browser settings. Allow notifications for meetadev there."
                    : "Your phone buzzes when someone you want to meet wants to meet you too."}
                </span>
                {error && <span className="error">{error}</span>}
              </div>
              {push === "off" && <button className="btn btn--sm" onClick={allow} disabled={busy}>Allow</button>}
            </div>
          )}
          <div className="ask__foot">
            <button className="btn btn--ghost btn--sm" onClick={never}>Don&apos;t ask again</button>
            <button className="btn btn--white btn--sm" onClick={close}>Not now</button>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}

/** "Install meetadev" on My badge. Hidden once installed, or where this browser can't install. */
export function InstallRow() {
  const mode = useInstallMode();
  if (!mode) return null;
  return (
    <div className="card">
      <div className="push">
        <span className="push__icon" aria-hidden><Smartphone size={20} /></span>
        <div className="push__text">
          <strong>Install meetadev</strong>
          <span className="hint">
            {mode === "ios"
              ? <>Tap <Share size={14} aria-label="Share" style={{ verticalAlign: "-2px" }} />, then “Add to Home Screen”, and open meetadev from there.</>
              : "Opens like an app from your home screen, straight to your event."}
          </span>
        </div>
        {mode === "prompt" && <button className="btn btn--sm" onClick={() => void promptInstall()}>Install</button>}
      </div>
    </div>
  );
}
