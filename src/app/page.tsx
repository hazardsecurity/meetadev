import Link from "next/link";
import { AyoSays } from "@/components/Ayo";
import { HeroNetwork } from "@/components/HeroNetwork";
import { Logo } from "@/components/Logo";
import { currentUser } from "@/lib/auth";

export default async function Home() {
  const me = await currentUser();
  const start = me ? (me.onboarded ? "/people" : "/onboarding") : "/login";

  return (
    <>
      <header className="wrap topbar__in">
        <Logo />
        <div className="row">
          {me ? (
            <Link className="btn btn--sm" href={start}>Open Connect</Link>
          ) : (
            <Link className="btn btn--white btn--sm" href="/login">Sign in with Google</Link>
          )}
        </div>
      </header>

      <main>
        <section className="wrap hero">
          <div className="stack hero__copy" style={{ "--gap": "20px" } as React.CSSProperties}>
            <p className="eyebrow">For everyone at DevFest Ilorin</p>
            <h1 className="display">
              Meet the people <span className="hl hl--blue">you</span> came to <span className="hl hl--yellow">meet</span>.
            </h1>
            <p className="lead">
              Mentors, learners, people who are hiring, future co-founders. Tell Ayo what you&apos;re looking for, and
              you&apos;ll get a list of people at the event worth saying hi to. You only swap numbers when you both say yes.
            </p>
            <div className="row">
              <Link className="btn btn--green" href={start}>{me ? "Let's go" : "Sign in with Google"}</Link>
            </div>
          </div>
          <HeroNetwork />
        </section>

        <section className="wrap steps">
          <h2 className="h1" style={{ textAlign: "center" }}>How it works</h2>
          <ol className="steps__list">
            <li className="card">
              <span className="steps__n" style={{ background: "var(--blue)" }}>1</span>
              <h3 className="h2">Make your badge</h3>
              <p className="muted">Sign in with Google, then seven quick taps: what you do, your level, what you&apos;re here for, and your stack.</p>
            </li>
            <li className="card">
              <span className="steps__n" style={{ background: "var(--red)" }}>2</span>
              <h3 className="h2">Ayo finds your people</h3>
              <p className="muted">Want a mentor? Ayo shows you who&apos;s mentoring in your stack. Hiring? Ayo shows who&apos;s looking.</p>
            </li>
            <li className="card">
              <span className="steps__n" style={{ background: "var(--yellow)", color: "var(--ink)" }}>3</span>
              <h3 className="h2">Connect, then chat</h3>
              <p className="muted">Send a request from anywhere in the venue, or scan their badge QR. Once they accept, WhatsApp is one tap away.</p>
            </li>
          </ol>
        </section>

        <section className="wrap privacy">
          <div className="privacy__card">
            <div className="stack" style={{ "--gap": "14px" } as React.CSSProperties}>
              <p className="eyebrow" style={{ color: "#c6dafc" }}>Your number stays yours</p>
              <h2 className="h1">Nobody gets your contact details unless you say yes.</h2>
              <ul className="privacy__list">
                <li>Your WhatsApp, phone and email are only shown to people you&apos;ve connected with.</li>
                <li>Ignore any request you like. Nobody is told you turned them down.</li>
                <li>Block or report anyone, and hide yourself from the directory any time.</li>
              </ul>
            </div>
            <AyoSays mood="wink" size={110} side="below">Your secret&apos;s safe with me.</AyoSays>
          </div>
        </section>

        <section className="wrap closing">
          <AyoSays mood="excited" size={120} side="below">See you at DevFest!</AyoSays>
          <Link className="btn btn--green" href={start} style={{ minWidth: 240 }}>{me ? "Open Connect" : "Get my badge"}</Link>
        </section>
      </main>

      <footer className="wrap footer">
        <Logo />
        <p className="hint">
          Made by the community for DevFest Ilorin. Not an official Google product. Google and DevFest are trademarks of Google LLC.
        </p>
      </footer>
    </>
  );
}
