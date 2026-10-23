import Link from "next/link";

export function Logo({ href = "/", subtitle }: { href?: string; subtitle?: string }) {
  return (
    <Link href={href} className="logo" aria-label="Connect, home">
      <span className="logo__mark" aria-hidden>
        <i style={{ background: "var(--blue)" }} />
        <i style={{ background: "var(--red)" }} />
        <i style={{ background: "var(--green)" }} />
        <i style={{ background: "var(--yellow)" }} />
      </span>
      <span className="logo__text">
        Connect
        <small>{subtitle ?? "for DevFest & GDG events"}</small>
      </span>
    </Link>
  );
}
