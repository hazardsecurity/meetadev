// Installing meetadev as an app. Shared by the root layout (boot script) and client components.

/** Chrome's install prompt, kept so our own Install button can show it later. */
export type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

declare global {
  interface Window { __installPrompt?: InstallPrompt | null }
}

export const INSTALL_EVENT = "mad-installable";

/**
 * Runs in <head>: the browser can fire its install prompt before React loads, so catch it
 * early and hold it. Also registers the service worker on every visit, which installing needs.
 */
export const pwaBootScript = `addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__installPrompt=e;dispatchEvent(new Event("${INSTALL_EVENT}"))});addEventListener("appinstalled",function(){window.__installPrompt=null;dispatchEvent(new Event("${INSTALL_EVENT}"))});if("serviceWorker"in navigator)addEventListener("load",function(){navigator.serviceWorker.register("/sw.js",{scope:"/"}).catch(function(){})});`;

/** Opened from the home screen rather than a browser tab. */
export const isInstalled = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** iPhone or iPad Safari: no install prompt, but Share → Add to Home Screen works. In-app browsers can't. */
export const isIosSafari = () => {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|FBAN|FBAV|Instagram|Line\/|Twitter|WhatsApp/.test(ua);
};

/** How this browser can install the app right now: its own prompt, iPhone steps, or not at all. */
export function installMode(): "prompt" | "ios" | null {
  if (isInstalled()) return null;
  if (window.__installPrompt) return "prompt";
  return isIosSafari() ? "ios" : null;
}

/** Shows the browser's install prompt. True when the person accepted. */
export async function promptInstall() {
  const e = window.__installPrompt;
  if (!e) return false;
  window.__installPrompt = null;
  await e.prompt();
  const { outcome } = await e.userChoice;
  window.dispatchEvent(new Event(INSTALL_EVENT));
  return outcome === "accepted";
}
