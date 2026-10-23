import type { Metadata } from "next";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="wrap topbar__in"><Logo /></header>
      <main className="wrap" style={{ paddingBlock: "8px 64px" }}>{children}</main>
    </>
  );
}
