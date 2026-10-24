"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { THEME_KEY, type ThemeChoice } from "@/lib/theme";

const OPTIONS: { id: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { id: "system", label: "System", Icon: Monitor },
  { id: "light", label: "Light", Icon: Sun },
  { id: "dark", label: "Dark", Icon: Moon },
];

// The <html data-theme> attribute is the source of truth; subscribe to its changes.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
const current = (): ThemeChoice => (document.documentElement.dataset.theme as ThemeChoice | undefined) ?? "system";

/** Set the theme on the page now and remember it on this device. */
function applyTheme(choice: ThemeChoice) {
  if (choice === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", choice);
  try {
    if (choice === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, choice);
  } catch { /* private mode: the choice lasts for this visit */ }
}

/** System / Light / Dark. Saved on this device only. */
export function ThemeSwitch() {
  const theme = useSyncExternalStore(subscribe, current, () => "system" as ThemeChoice);

  return (
    <div className="theme-switch" role="radiogroup" aria-label="Appearance">
      {OPTIONS.map(({ id, label, Icon }) => (
        <button key={id} type="button" role="radio" aria-checked={theme === id} className="theme-switch__opt" onClick={() => applyTheme(id)}>
          <Icon size={16} strokeWidth={2.4} aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}
