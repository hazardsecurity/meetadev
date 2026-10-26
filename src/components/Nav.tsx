"use client";

import { IdCard, MessageCircle, Trophy, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { UNREAD_EVENT } from "./InboxPulse";

type Tab = { key: string; label: string; Icon: LucideIcon; tone: "blue" | "red" | "green" | "yellow" };

const TABS: Tab[] = [
  { key: "people", label: "People", Icon: Users, tone: "blue" },
  { key: "contacts", label: "Chats", Icon: MessageCircle, tone: "green" },
  { key: "leaderboard", label: "Leaderboard", Icon: Trophy, tone: "yellow" },
  { key: "me", label: "My badge", Icon: IdCard, tone: "blue" },
];

export function Nav({ unread = 0, peopleHref, className = "nav" }: { unread?: number; peopleHref: string; className?: string }) {
  const path = usePathname();
  // The layout's count is from page load; InboxPulse keeps it fresh.
  const [live, setLive] = useState<number | null>(null);
  useEffect(() => {
    const on = (e: Event) => setLive((e as CustomEvent<number>).detail);
    window.addEventListener(UNREAD_EVENT, on);
    return () => window.removeEventListener(UNREAD_EVENT, on);
  }, []);
  // Android's Back button closes the keyboard but leaves the field focused, which keeps
  // the tab bar hidden (see globals.css). Once the screen grows back, let go of the field.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!className.includes("tabbar") || !vv) return;
    let low = vv.height;
    const onFocus = () => { low = vv.height; };
    const onResize = () => {
      low = Math.min(low, vv.height);
      const field = document.activeElement;
      // shortcut: turning the phone while typing can also look like "grew back"; watch orientation if people notice.
      if (vv.height - low > 150 && field instanceof HTMLElement && field.matches("input, textarea, select, [contenteditable='true']")) field.blur();
    };
    document.addEventListener("focusin", onFocus);
    vv.addEventListener("resize", onResize);
    return () => { document.removeEventListener("focusin", onFocus); vv.removeEventListener("resize", onResize); };
  }, [className]);
  const unreadNow = live ?? unread;
  const href = (key: string) =>
    ({
      people: peopleHref,
      contacts: "/connections",
      // Straight to the current event's board, skipping /leaderboard's redirect.
      leaderboard: peopleHref.startsWith("/e/") ? `${peopleHref}/leaderboard` : "/leaderboard",
      me: "/me",
    })[key]!;
  const active = (key: string) => {
    if (key === "leaderboard") return path === "/leaderboard" || path.endsWith("/leaderboard");
    if (key === "contacts") return path.startsWith("/connections") || path.startsWith("/chat/");
    if (key === "people") return (path.startsWith("/e/") || path.startsWith("/events") || path.startsWith("/p/") || path === "/discover") && !path.endsWith("/leaderboard");
    return path.startsWith(href(key));
  };

  return (
    <nav className={className} aria-label="Main">
      {TABS.map(({ key, label, Icon, tone }) => (
        <Link key={key} href={href(key)} className={`tab tab--${tone}`} aria-current={active(key) ? "page" : undefined}>
          <span className="tab__icon" aria-hidden>
            <Icon size={20} strokeWidth={2.4} />
            {key === "contacts" && unreadNow > 0 && <span className="badge-count tab__badge">{unreadNow > 9 ? "9+" : unreadNow}</span>}
          </span>
          <span className="tab__label">{label}</span>
          {key === "contacts" && unreadNow > 0 && <span className="sr-only">, {unreadNow} unread</span>}
        </Link>
      ))}
    </nav>
  );
}
