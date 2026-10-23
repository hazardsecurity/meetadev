import { Logo } from "@/components/Logo";
import { Nav } from "@/components/Nav";
import { currentUser } from "@/lib/auth";
import { counts } from "@/lib/people";

// Shell for the signed-in screens. Each page still checks membership itself.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const me = await currentUser();
  const incoming = me?.onboarded ? (await counts(me.id)).incoming : 0;
  return (
    <>
      <header className="topbar">
        <div className="wrap topbar__in">
          <Logo href="/people" />
          <Nav incoming={incoming} />
        </div>
      </header>
      <main className="wrap app-main">{children}</main>
      <Nav incoming={incoming} className="nav tabbar" />
    </>
  );
}
