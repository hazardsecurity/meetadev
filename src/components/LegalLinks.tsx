import Link from "next/link";
import { LEGAL_PAGES } from "@/lib/legal";

/** Privacy · Terms · Community guidelines, for footers. */
export function LegalLinks() {
  return (
    <nav className="legal-links" aria-label="Legal">
      {LEGAL_PAGES.map((p) => <Link key={p.href} href={p.href}>{p.label}</Link>)}
    </nav>
  );
}
