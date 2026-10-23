import Link from "next/link";
import { BrandMark } from "./BrandMark";

export function Logo({ href = "/", subtitle }: { href?: string; subtitle?: string }) {
  return (
    <Link href={href} className="logo" aria-label="meetadev, home">
      <BrandMark size={30} />
      <span className="logo__text">
        meetadev
        <small>{subtitle ?? "for DevFest & GDG events"}</small>
      </span>
    </Link>
  );
}
