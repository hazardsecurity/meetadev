"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/people", label: "People", icon: "👋" },
  { href: "/requests", label: "Requests", icon: "📬" },
  { href: "/connections", label: "Contacts", icon: "🤝" },
  { href: "/me", label: "My badge", icon: "🪪" },
];

export function Nav({ incoming, className = "nav" }: { incoming: number; className?: string }) {
  const path = usePathname();
  return (
    <nav className={className} aria-label="Main">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} aria-current={path.startsWith(l.href) ? "page" : undefined}>
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
