import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The rules for using meetadev, for attendees and event organisers.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  const mail = `mailto:${LEGAL.email}`;
  return (
    <article className="stack">
      <p className="eyebrow">Last updated {LEGAL.updated}</p>
      <h1 className="h1">Terms of use</h1>
      <p className="lead">
        These terms are the agreement between you and {LEGAL.operator}, which runs meetadev. By signing in or using meetadev you agree
        to them, to the <Link className="link" href="/guidelines">community guidelines</Link> and to how we handle data in the{" "}
        <Link className="link" href="/privacy">privacy policy</Link>. If you don&apos;t agree, please don&apos;t use meetadev.
      </p>

      <section className="stack">
        <h2 className="h2">1. What meetadev is</h2>
        <p>
          meetadev is a free tool that helps people at developer events, such as DevFest and Google Developer Group meetups, find the
          people they want to meet. It is made by the community. It is not an official Google product and is not endorsed by Google.
          Google, DevFest and GDG are trademarks of Google LLC. Events listed on meetadev are run by their organisers, not by us.
        </p>
      </section>

      <section className="stack">
        <h2 className="h2">2. Who can use it</h2>
        <p>
          You must be at least 13. If you&apos;re under 18, you need permission from a parent or guardian. You sign in with your own
          Google account, and you&apos;re responsible for what happens on your account. Keep your Google account secure, and tell us if you
          think someone else used yours.
        </p>
      </section>

      <section className="stack">
        <h2 className="h2">3. Your badge and what you post</h2>
        <ul>
          <li>Tell the truth about who you are. Don&apos;t pretend to be someone else, a company, or an organiser you&apos;re not.</li>
          <li>
            You own what you post (your badge, messages and reports). You give us permission to store it and show it to the people the
            privacy policy describes, only so meetadev can work. That permission ends when you delete it or your account, except for the
            few things the privacy policy says we keep.
          </li>
          <li>Only add contact details you&apos;re happy for your connections to see and use to reach you.</li>
        </ul>
      </section>

      <section className="stack">
        <h2 className="h2">4. Using meetadev properly</h2>
        <p>Follow the <Link className="link" href="/guidelines">community guidelines</Link>. In particular, don&apos;t:</p>
        <ul>
          <li>harass, threaten, stalk or discriminate against anyone, online or at an event;</li>
          <li>send spam, scams, fake job offers or unsolicited sales pitches;</li>
          <li>collect other people&apos;s details to use outside meetadev without their permission, or scrape the site;</li>
          <li>break the law, or post anything that is illegal, sexual, violent or hateful;</li>
          <li>try to break, overload or get around the security or limits of the service.</li>
        </ul>
      </section>

      <section className="stack">
        <h2 className="h2">5. Organisers</h2>
        <p>
          Organisers create event spaces after we approve their application. If you organise an event on meetadev, you&apos;re responsible
          for it: that the details are accurate, that you have the right to run it, and that you act on reports about people at your event
          fairly. You can remove or ban people from your event. Don&apos;t use attendee information for anything except running that event.
          We can remove an event or an organiser&apos;s access if these terms are broken.
        </p>
      </section>

      <section className="stack">
        <h2 className="h2">6. Meeting people in person</h2>
        <p>
          meetadev introduces people; it doesn&apos;t check who they are or vouch for them. Use your judgement: meet in the event venue or
          another public place, and tell the organisers or report the person on meetadev if anything feels wrong. In an emergency,
          contact the venue&apos;s security or local emergency services first.
        </p>
      </section>

      <section className="stack">
        <h2 className="h2">7. Reports, blocks and removal</h2>
        <p>
          You can block anyone and report them to the event&apos;s organisers. We, and organisers for their own events, may remove content,
          remove people from events, or suspend or close accounts that break these terms or the guidelines, without notice where needed to
          keep people safe. You can stop using meetadev and delete your account at any time from My badge.
        </p>
      </section>

      <section className="stack">
        <h2 className="h2">8. The service is provided as it is</h2>
        <p>
          We work to keep meetadev useful and available, but it is free and provided &ldquo;as is&rdquo;. We don&apos;t promise it will
          always be available, free of errors, or that you&apos;ll meet anyone in particular. Matches, suggestions and leaderboards are
          a guide, not a guarantee.
        </p>
      </section>

      <section className="stack">
        <h2 className="h2">9. Our responsibility</h2>
        <p>
          As far as the law allows, we aren&apos;t responsible for what other people do or say, on meetadev or at events, for events run by
          organisers, or for indirect losses. Nothing in these terms limits any responsibility we have that the law doesn&apos;t allow us to
          limit.
        </p>
      </section>

      <section className="stack">
        <h2 className="h2">10. Changes and the law</h2>
        <p>
          We may update these terms. We&apos;ll change the date at the top and announce important changes in the app; using meetadev after
          that means you accept them. These terms are governed by the laws of the Federal Republic of {LEGAL.country}, and the courts of{" "}
          {LEGAL.country} handle any dispute, unless the law where you live gives you other rights.
        </p>
      </section>

      <section className="stack">
        <h2 className="h2">11. Contact</h2>
        <p>Questions about these terms: <a className="link" href={mail}>{LEGAL.email}</a>.</p>
      </section>
    </article>
  );
}
