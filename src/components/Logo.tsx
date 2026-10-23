import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="logo" aria-label="DevFest Ilorin Connect, home">
      <span className="logo__mark" aria-hidden>
        <i style={{ background: "var(--blue)" }} />
        <i style={{ background: "var(--red)" }} />
        <i style={{ background: "var(--green)" }} />
        <i style={{ background: "var(--yellow)" }} />
      </span>
      <span className="logo__text">
        Connect
        <small>DevFest Ilorin</small>
      </span>
    </Link>
  );
}
