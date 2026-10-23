import Link from "next/link";
import { cookies } from "next/headers";
import { Logo } from "@/components/Logo";
import { Nav } from "@/components/Nav";
import { currentUser } from "@/lib/auth";
import { eventBySlug, membership } from "@/lib/events";
import { counts } from "@/lib/people";

// Shell for the signed-in screens. Each page still checks access itself.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const me = await currentUser();
  const member = me?.onboarded ? me : null;
  const incoming = member ? (await counts(member.id)).incoming : 0;

  // The event "People" opens: the last one visited, if they're still in it.
  const lastSlug = (await cookies()).get("dfi_event")?.value ?? "";
  const lastEvent = member && lastSlug ? await eventBySlug(lastSlug) : null;
  const current = lastEvent && member && (await membership(lastEvent.id, member.id)) ? lastEvent : null;
  const peopleHref = current ? `/e/${current.slug}` : "/events";

  return (
    <>
      <header className="topbar">
        <div className="wrap topbar__in">
          <div className="row" style={{ flexWrap: "nowrap", minWidth: 0 }}>
            <Logo href={member ? peopleHref : "/"} subtitle={current?.name} />
            {member && (
              <Link href="/events" className="event-switch" aria-label="Switch event">⇄</Link>
            )}
          </div>
          {member ? (
            <Nav incoming={incoming} peopleHref={peopleHref} />
          ) : me ? (
            <Link className="btn btn--white btn--sm" href="/onboarding">Finish my badge</Link>
          ) : (
            <Link className="btn btn--white btn--sm" href="/login">Sign in</Link>
          )}
        </div>
      </header>
      <main className="wrap app-main">{children}</main>
      {member && <Nav incoming={incoming} peopleHref={peopleHref} className="nav tabbar" />}
    </>
  );
}
