import Link from "next/link";
import { AyoSays } from "@/components/Ayo";
import { HeroNetwork } from "@/components/HeroNetwork";
import { Logo } from "@/components/Logo";
import { currentUser } from "@/lib/auth";

export default async function Home() {
  const me = await currentUser();
  const createHref = me ? "/events/new" : `/login?next=${encodeURIComponent("/events/new")}`;
  const joinHref = me ? "/events" : `/login?next=${encodeURIComponent("/events")}`;

  return (
    <>
      <header className="wrap topbar__in">
        <Logo />
        <Link className="btn btn--white btn--sm" href={me ? "/events" : "/login"}>{me ? "Open Connect" : "Sign in with Google"}</Link>
      </header>

      <main>
        <section className="wrap hero">
          <div className="stack hero__copy" style={{ "--gap": "20px" } as React.CSSProperties}>
            <p className="eyebrow">For DevFest &amp; GDG events</p>
            <h1 className="display">
              Meet the people <span className="hl hl--blue">you</span> came to <span className="hl hl--yellow">meet</span>.
            </h1>
            <p className="lead">
              Organisers create a space for their event in a minute. Attendees join with a link, tell Ayo what they&apos;re
              looking for, and get a list of people worth saying hi to. Numbers are only swapped when both people say yes.
            </p>
            <div className="row">
              <Link className="btn btn--green" href={createHref}>Create your event</Link>
              <Link className="btn btn--white" href={joinHref}>Join an event</Link>
            </div>
          </div>
          <HeroNetwork />
        </section>

        <section className="wrap steps">
          <h2 className="h1" style={{ textAlign: "center" }}>How it works</h2>
          <div className="audiences">
            <div className="stack">
              <p className="eyebrow">For organisers</p>
              <ol className="steps__list steps__list--stack">
                <Step n={1} color="var(--blue)" title="Create your event">Name, city, date. You get an invite link, a QR code and a join code.</Step>
                <Step n={2} color="var(--red)" title="Put it on screen">One click opens a full-screen join slide for the projector between sessions.</Step>
                <Step n={3} color="var(--green)" title="Keep it friendly">See who&apos;s joined and how many connections are being made, handle reports, and add co-organisers.</Step>
              </ol>
            </div>
            <div className="stack">
              <p className="eyebrow">For attendees</p>
              <ol className="steps__list steps__list--stack">
                <Step n={1} color="var(--blue)" title="Make your badge once">Sign in with Google, then seven quick taps. Your badge comes with you to every event.</Step>
                <Step n={2} color="var(--yellow)" title="Ayo finds your people">Want a mentor? Ayo shows who&apos;s mentoring in your stack. Hiring? Ayo shows who&apos;s looking.</Step>
                <Step n={3} color="var(--green)" title="Connect, then chat">Send a request or scan their badge. Once they accept, WhatsApp is one tap away.</Step>
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
                <li>Only people at the same event can find you or send you a request.</li>
                <li>Ignore any request you like, block or report anyone, or hide from the directory.</li>
              </ul>
            </div>
            <AyoSays mood="wink" size={110} side="below">Your secret&apos;s safe with me.</AyoSays>
          </div>
        </section>

        <section className="wrap closing">
          <AyoSays mood="excited" size={120} side="below">See you at the next DevFest!</AyoSays>
          <div className="row" style={{ justifyContent: "center" }}>
            <Link className="btn btn--green" href={createHref}>Create your event</Link>
            <Link className="btn btn--white" href={joinHref}>Join an event</Link>
          </div>
        </section>
      </main>

      <footer className="wrap footer">
        <Logo />
        <p className="hint">
          Made by the community for DevFest and GDG events. Not an official Google product. Google, DevFest and GDG are trademarks of Google LLC.
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
