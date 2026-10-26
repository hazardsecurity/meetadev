import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { Logo } from "@/components/Logo";
import { Nav } from "@/components/Nav";
import { SignInLink } from "@/components/SignInLink";
import { currentUser } from "@/lib/auth";
import { EventSwitcher } from "@/components/EventSwitcher";
import { InboxPulse } from "@/components/InboxPulse";
import { AnalyticsIdentify } from "@/components/Analytics";
import { eventBySlug, membership, myEvents, splitByDate, type MyEvent } from "@/lib/events";
import { formatDate } from "@/lib/format";
import { unreadCount } from "@/lib/chat";

// Signed-in screens stay out of search; public event pages opt back in.
export const metadata: Metadata = { robots: { index: false, follow: false } };

// Shell for the signed-in screens. Each page still checks access itself.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const me = await currentUser();
  const member = me?.onboarded ? me : null;
  const [unread, mine] = member ? await Promise.all([unreadCount(member.id), myEvents(member.id)]) : [0, []];

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
            {member && <EventSwitcher events={switchList(mine)} currentSlug={current?.slug ?? null} />}
          </div>
          {member ? (
            <Nav unread={unread} peopleHref={peopleHref} />
          ) : me ? (
            <Suspense fallback={<Link className="btn btn--white btn--sm" href="/onboarding">Finish my badge</Link>}>
              <SignInLink to="/onboarding">Finish my badge</SignInLink>
            </Suspense>
          ) : (
            <Suspense fallback={<Link className="btn btn--white btn--sm" href="/login">Sign in</Link>}>
              <SignInLink to="/login">Sign in</SignInLink>
            </Suspense>
          )}
        </div>
      </header>
      <main className="wrap app-main">{children}</main>
      {member && <Nav unread={unread} peopleHref={peopleHref} className="nav tabbar" />}
      {member && <InboxPulse />}
      {me && <AnalyticsIdentify userId={me.id} />}
    </>
  );
}

/** Upcoming events for the header switcher, soonest first. */
function switchList(events: MyEvent[]) {
  return splitByDate(events).upcoming.slice(0, 8).map((e) => ({
    slug: e.slug,
    name: e.name,
    when: [e.starts_on ? formatDate(e.starts_on) : "Date to be announced", e.city].filter(Boolean).join(" · "),
  }));
}
