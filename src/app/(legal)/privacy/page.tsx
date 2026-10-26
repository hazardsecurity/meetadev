import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What meetadev collects, why, who can see it, how long it is kept, and how to delete it.",
  alternates: { canonical: "/privacy" },
};

// Written from what the code actually does. When a feature changes what is stored or shown, change this page too.
export default function PrivacyPage() {
  const mail = `mailto:${LEGAL.email}`;
  return (
    <article className="stack">
      <p className="eyebrow">Last updated {LEGAL.updated}</p>
      <h1 className="h1">Privacy policy</h1>
      <p className="lead">
        meetadev helps people at developer events find who to meet. This page says what we collect, why, who can see it, how long we
        keep it, and how you can delete it. meetadev is run by {LEGAL.operator} in {LEGAL.country}, which is responsible for your data
        (the &ldquo;data controller&rdquo;). Questions or requests: <a className="link" href={mail}>{LEGAL.email}</a>.
      </p>

      <section className="stack">
        <h2 className="h2">The short version</h2>
        <ul>
          <li>You sign in with Google. We get your name, email address, profile photo and Google account ID. Never your password.</li>
          <li>Your phone number, WhatsApp and contact email are shown only to people you&apos;re connected with, which happens when you both chose to meet.</li>
          <li>Choosing &ldquo;Meet&rdquo; on someone is private. They only find out if they chose to meet you too.</li>
          <li>We don&apos;t sell your data, show ads or use tracking or analytics tools.</li>
          <li>You can delete your account yourself, any time, from My badge.</li>
        </ul>
      </section>

      <section className="stack">
        <h2 className="h2">What we collect</h2>
        <h3 className="legal__h3">From Google, when you sign in</h3>
        <p>Your name, email address, profile photo and Google account ID. We use them to create your account and sign you in.</p>
        <h3 className="legal__h3">What you put on your badge</h3>
        <p>
          Your display name, headline and intro, role, level, what you&apos;re here for (for example mentoring or hiring), the tech you
          use, the cities you follow, and optionally your LinkedIn, GitHub, X and website. Contact details you add: phone, WhatsApp
          and a contact email.
        </p>
        <h3 className="legal__h3">What you do on meetadev</h3>
        <p>
          The events you join, who you chose to meet or passed on, your connections, &ldquo;We met&rdquo; confirmations, your chat
          messages and whether they were delivered and read, people you blocked, reports you made, and, if you organise, your events
          and organiser application.
        </p>
        <h3 className="legal__h3">Technical data</h3>
        <p>
          Your IP address, used to limit sign-ups and other actions so the service can&apos;t be abused. If you turn on notifications,
          your browser&apos;s push address for this device. Our hosting provider keeps standard server logs.
        </p>
      </section>

      <section className="stack">
        <h2 className="h2">Who can see what</h2>
        <ul>
          <li><b>Anyone:</b> event and community pages, and the badge of anyone who is listed in the directory (name, photo, headline, intro, role, interests and public links).</li>
          <li><b>People at the same event:</b> your badge in their deck and the people list, unless you hid yourself from the directory. Your place on the event&apos;s leaderboard, which counts the people you met.</li>
          <li><b>Your connections only:</b> your phone, WhatsApp and contact email, and your chats with them.</li>
          <li><b>Event organisers:</b> who joined their event, a count of how many people swiped, matched and met, and reports about people at their event. Not your private contact details or messages.</li>
          <li><b>Nobody:</b> who you passed on, and who you chose to meet unless it became mutual.</li>
        </ul>
      </section>

      <section className="stack">
        <h2 className="h2">Why we use it (lawful basis)</h2>
        <ul>
          <li><b>To provide the service you signed up for:</b> your account, badge, deck, matches, connections, chat and leaderboard.</li>
          <li><b>Your consent:</b> the optional details you add, and notifications, which you can turn off at any time.</li>
          <li><b>Our legitimate interests:</b> keeping people safe and stopping abuse, through rate limits, reports, blocks and event bans.</li>
          <li><b>Legal obligations:</b> where the law requires us to keep or share information.</li>
        </ul>
      </section>

      <section className="stack">
        <h2 className="h2">Cookies and storage</h2>
        <p>We only use what the site needs to work. There are no advertising or tracking cookies, so there is nothing to opt out of.</p>
        <ul>
          <li><b>dfi_session:</b> keeps you signed in, for up to 30 days.</li>
          <li><b>Sign-in check:</b> a short-lived cookie that protects the Google sign-in step, for about 10 minutes.</li>
          <li><b>dfi_event:</b> remembers the last event you opened, for 90 days.</li>
          <li><b>mad_start:</b> remembers that you saw the welcome screen, for a year.</li>
          <li><b>Theme:</b> your light or dark choice, saved in your browser only.</li>
        </ul>
      </section>

      <section className="stack">
        <h2 className="h2">Services we use</h2>
        <p>We share data with these providers only so meetadev can run. They process it on our behalf.</p>
        <ul>
          <li><b>Google:</b> sign-in.</li>
          <li><b>Vercel:</b> hosting the website.</li>
          <li><b>Neon:</b> our database.</li>
          <li><b>Your browser&apos;s push service</b> (for example Google, Apple or Mozilla): delivering notifications you turned on, which can include a short preview of a message.</li>
        </ul>
        <p>
          Some of these providers store or process data outside {LEGAL.country}, including in the United States. Where that happens we
          rely on their contractual and security commitments to protect it as the law requires.
        </p>
      </section>

      <section className="stack">
        <h2 className="h2">How long we keep it</h2>
        <ul>
          <li>Your account, badge, connections and chats: until you delete your account.</li>
          <li>Sign-in sessions: up to 30 days, or until you log out.</li>
          <li>Rate-limit records: a counter tied to your IP address or account, replaced as soon as its time window ends.</li>
          <li>Events you created stay up for the people who joined them, unless an organiser deletes the event.</li>
        </ul>
      </section>

      <section className="stack">
        <h2 className="h2">Deleting your account</h2>
        <p>
          Go to <Link className="link" href="/me">My badge</Link> and choose &ldquo;Delete my account&rdquo;. This removes your badge,
          contact details, connections, the people you chose to meet or passed on, your chats (including the other person&apos;s copy of
          those conversations), your notification subscriptions and your sessions. It can&apos;t be undone.
        </p>
        <p>To keep the service fair and safe, a few things stay, without your name or any way to contact you:</p>
        <ul>
          <li>Meetings you confirmed still count for the people you met.</li>
          <li>Reports you made, because they are about someone else.</li>
          <li>
            Bans, blocks and reports involving you are kept against a one-way code made from your Google account ID, so they apply
            again if the same Google account signs up later. The code doesn&apos;t contain your ID, name or email, and we only use it to
            recognise a returning account.
          </li>
        </ul>
        <p>If you can&apos;t sign in any more, email us from the address on your account and we&apos;ll delete it for you.</p>
      </section>

      <section className="stack">
        <h2 className="h2">Your rights</h2>
        <p>
          Under {LEGAL.country}&apos;s Data Protection Act 2023 (and similar laws where you live) you can ask us to give you a copy of your
          data, correct it, delete it, restrict or object to how we use it, or move it to another service, and you can withdraw consent
          at any time. You can edit most of your data yourself on your badge. For anything else, email{" "}
          <a className="link" href={mail}>{LEGAL.email}</a>; we reply within {LEGAL.replyDays} days.
        </p>
        <p>
          If you&apos;re not happy with our answer, you can complain to the{" "}
          <a className="link" href={LEGAL.regulator.url} target="_blank" rel="noopener noreferrer">{LEGAL.regulator.name}</a>.
        </p>
      </section>

      <section className="stack">
        <h2 className="h2">Age</h2>
        <p>
          You must be at least 13 to use meetadev. If you&apos;re under 18, you need permission from a parent or guardian. If you
          believe a child is using meetadev without it, tell us and we&apos;ll remove the account.
        </p>
      </section>

      <section className="stack">
        <h2 className="h2">Security</h2>
        <p>
          Connections to meetadev are encrypted. We store only a scrambled form of each sign-in session, never a password, and contact
          details are only sent to people you&apos;re connected with. No system is perfectly secure: if we learn of a breach that
          affects you, we&apos;ll tell you and the regulator as the law requires.
        </p>
      </section>

      <section className="stack">
        <h2 className="h2">Changes</h2>
        <p>
          We&apos;ll update this page when what we collect or how we use it changes, and change the date at the top. Big changes will
          also be announced in the app.
        </p>
      </section>

      <p className="hint">
        See also the <Link className="link" href="/terms">terms of use</Link> and the{" "}
        <Link className="link" href="/guidelines">community guidelines</Link>.
      </p>
    </article>
  );
}
