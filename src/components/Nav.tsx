"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/people", label: "People", icon: "👋" },
  { href: "/requests", label: "Requests", icon: "📬" },
  { href: "/connections", label: "Contacts", icon: "🤝" },
  { href: "/me", label: "My badge", icon: "🪪" },
];

export function Nav({ incoming, peopleHref, className = "nav" }: { incoming: number; peopleHref: string; className?: string }) {
  const path = usePathname();
  const active = (href: string) =>
    href === "/people" ? path.startsWith("/e/") || path.startsWith("/events") || path.startsWith("/p/") : path.startsWith(href);
  return (
    <nav className={className} aria-label="Main">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href === "/people" ? peopleHref : l.href} aria-current={active(l.href) ? "page" : undefined}>
          <span className="nav__icon" aria-hidden>{l.icon}</span>
          {l.label}
          {l.href === "/requests" && incoming > 0 && (
            <span className="badge-count" aria-label={`${incoming} new`}>{incoming}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}
