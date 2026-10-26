import Link from "next/link";
import { AyoSays } from "@/components/Ayo";
import { HeroNetwork } from "@/components/HeroNetwork";
import { Logo } from "@/components/Logo";
import type { Metadata } from "next";
import { currentUser } from "@/lib/auth";
import { jsonLd, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: `${SITE_NAME} · Meet the people you came to meet at tech events` },
  alternates: { canonical: "/" },
};

const STRUCTURED = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: SITE_URL, name: SITE_NAME, description: SITE_DESCRIPTION, inLanguage: "en" },
    {
      "@type": "WebApplication", "@id": `${SITE_URL}/#app`, name: SITE_NAME, url: SITE_URL, applicationCategory: "SocialNetworkingApplication",
      operatingSystem: "Any", description: SITE_DESCRIPTION, offers: { "@type": "Offer", price: "0", priceCurrency: "NGN" },
    },
  ],
};

export default async function Home() {
  const me = await currentUser();
  const createHref = me ? "/events/new" : `/login?next=${encodeURIComponent("/events/new")}`;
  const joinHref = "/discover";

  return (
    <>
      <header className="wrap topbar__in">
        <Logo />
        <Link className="btn btn--white btn--sm" href={me ? "/events" : "/login"}>{me ? "Open meetadev" : "Sign in with Google"}</Link>
      </header>

      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(STRUCTURED)} />
      <main>
        <section className="wrap hero">
          <div className="stack hero__copy" style={{ "--gap": "20px" } as React.CSSProperties}>
            <p className="eyebrow">For tech events and meetups</p>
            <h1 className="display">
              Meet the people <span className="hl hl--blue">you</span> came to <span className="hl hl--yellow">meet</span>.
            </h1>
            <p className="lead">
              Find tech events in your cities, tell Ayo what you&apos;re looking for, and get a list of people
              worth saying hi to. Numbers are only swapped when both people say yes.
            </p>
            <div className="row">
              <Link className="btn btn--green" href={joinHref}>Find events near you</Link>
              <Link className="btn btn--white" href={createHref}>I&apos;m an event organiser</Link>
            </div>
          </div>
          <HeroNetwork />
        </section>

        <section className="wrap steps">
          <h2 className="h1" style={{ textAlign: "center" }}>How it works</h2>
          <div className="audiences">
            <div className="stack">
              <p className="eyebrow">For event organisers</p>
              <ol className="steps__list steps__list--stack">
                <Step n={1} color="var(--blue)" title="Get approved, then create">Apply once with your community or event page. Then add an event: name, city, date, colour. You get an invite link, QR code and join code.</Step>
                <Step n={2} color="var(--red)" title="Put it on screen">One click opens a full-screen join slide for the projector between sessions.</Step>
                <Step n={3} color="var(--green)" title="Keep it friendly">See who&apos;s joined and how many connections are being made, handle reports, and add co-organisers.</Step>
              </ol>
            </div>
            <div className="stack">
              <p className="eyebrow">For attendees</p>
              <ol className="steps__list steps__list--stack">
                <Step n={1} color="var(--blue)" title="Pick your cities">Sign in with Google, make your badge once, and follow every city you go to events in.</Step>
                <Step n={2} color="var(--yellow)" title="Ayo finds your people">Want a mentor? Ayo shows who&apos;s mentoring in your stack. Hiring? Ayo shows who&apos;s looking.</Step>
                <Step n={3} color="var(--green)" title="Match, then meet">At the venue, tap Meet on the people you want to meet. When it&apos;s mutual, chat, find each other, and both tap We met.</Step>
              </ol>
            </div>
          </div>
        </section>

        <section className="wrap privacy">
          <div className="privacy__card">
            <div className="stack" style={{ "--gap": "14px" } as React.CSSProperties}>
              <p className="eyebrow" style={{ color: "#c6dafc" }}>Your number stays yours</p>
              <h2 className="h1">Nobody gets your contact details unless you say yes.</h2>
              <ul className="privacy__list">
                <li>Your WhatsApp, phone and email are only shown to people you&apos;ve connected with.</li>
                <li>Only people at the same event can find you, and nobody sees who you tapped Meet on unless they tapped you too.</li>
                <li>Block or report anyone, or hide from the directory.</li>
              </ul>
            </div>
            <AyoSays mood="wink" size={110} side="below">Your secret&apos;s safe with me.</AyoSays>
          </div>
        </section>

        <section className="wrap closing">
          <AyoSays mood="excited" size={120} side="below">See you at the next event!</AyoSays>
          <div className="row" style={{ justifyContent: "center" }}>
            <Link className="btn btn--green" href={joinHref}>Find events near you</Link>
            <Link className="btn btn--white" href={createHref}>I&apos;m an event organiser</Link>
          </div>
        </section>
      </main>

      <footer className="wrap footer">
        <Logo />
        <p className="hint">
          Made by the community for tech events and meetups. Not an official Google product.
        </p>
      </footer>
    </>
  );
}

function Step({ n, color, title, children }: { n: number; color: string; title: string; children: React.ReactNode }) {
  return (
    <li className="card">
      <span className="steps__n" style={{ background: color, color: color === "var(--yellow)" ? "var(--ink)" : undefined }}>{n}</span>
      <h3 className="h2">{title}</h3>
      <p className="muted">{children}</p>
    </li>
  );
}
