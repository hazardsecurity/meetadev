import { Logo } from "@/components/Logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="wrap topbar__in"><Logo /></header>
      <main className="wrap" style={{ paddingBlock: "8px 64px" }}>{children}</main>
    </>
  );
}
