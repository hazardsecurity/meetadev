import Link from "next/link";
import { LegalLinks } from "@/components/LegalLinks";
import { Logo } from "@/components/Logo";

// Plain reading pages: public, indexable, the same for everyone.
export default function LegalLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="wrap topbar__in"><Logo /><Link className="link" href="/">Back to meetadev</Link></header>
      <main className="wrap legal">{children}</main>
      <footer className="wrap footer"><LegalLinks /></footer>
    </>
  );
}
