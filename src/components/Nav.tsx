"use client";

import { Handshake, IdCard, Inbox, Trophy, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { key: string; label: string; Icon: LucideIcon; tone: "blue" | "red" | "green" | "yellow" };

const TABS: Tab[] = [
  { key: "people", label: "People", Icon: Users, tone: "blue" },
  { key: "requests", label: "Requests", Icon: Inbox, tone: "red" },
  { key: "contacts", label: "Contacts", Icon: Handshake, tone: "green" },
  { key: "leaderboard", label: "Leaderboard", Icon: Trophy, tone: "yellow" },
  { key: "me", label: "My badge", Icon: IdCard, tone: "blue" },
];

export function Nav({ incoming, peopleHref, className = "nav" }: { incoming: number; peopleHref: string; className?: string }) {
  const path = usePathname();
  const href = (key: string) =>
    ({ people: peopleHref, requests: "/requests", contacts: "/connections", leaderboard: "/leaderboard", me: "/me" })[key]!;
  const active = (key: string) => {
    if (key === "leaderboard") return path === "/leaderboard" || path.endsWith("/leaderboard");
    if (key === "people") return (path.startsWith("/e/") || path.startsWith("/events") || path.startsWith("/p/") || path === "/discover") && !path.endsWith("/leaderboard");
    return path.startsWith(href(key));
  };

  return (
    <nav className={className} aria-label="Main">
      {TABS.map(({ key, label, Icon, tone }) => (
        <Link key={key} href={href(key)} className={`tab tab--${tone}`} aria-current={active(key) ? "page" : undefined}>
          <span className="tab__icon" aria-hidden>
            <Icon size={20} strokeWidth={2.4} />
            {key === "requests" && incoming > 0 && <span className="badge-count tab__badge">{incoming > 9 ? "9+" : incoming}</span>}
          </span>
          <span className="tab__label">{label}</span>
          {key === "requests" && incoming > 0 && <span className="sr-only">, {incoming} new</span>}
        </Link>
      ))}
    </nav>
  );
}
