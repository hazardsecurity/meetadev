import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Community guidelines",
  description: "How to treat people you meet through meetadev, online and at events.",
  alternates: { canonical: "/guidelines" },
};

export default function GuidelinesPage() {
  return (
    <article className="stack">
      <p className="eyebrow">Last updated {LEGAL.updated}</p>
      <h1 className="h1">Community guidelines</h1>
      <p className="lead">
        meetadev is for meeting people at developer events: mentors, learners, collaborators and teams that are hiring. Everyone should
        feel safe saying yes, and just as safe saying nothing. These guidelines apply on meetadev and at events you found through it.
      </p>

      <section className="stack">
        <h2 className="h2">Be someone people are glad they met</h2>
        <ul>
          <li>Be yourself: your real name, your real role and level, and a photo of you or none at all.</li>
          <li>Be kind and patient, especially with beginners and students. Everyone was new once.</li>
          <li>Keep it professional. meetadev isn&apos;t a dating app.</li>
        </ul>
      </section>

      <section className="stack">
        <h2 className="h2">Respect a no</h2>
        <ul>
          <li>If someone doesn&apos;t match with you, that&apos;s their answer. Don&apos;t look for them another way to ask again.</li>
          <li>Contact details are shared because both of you said yes. Use them to follow up, not to add people to lists, groups or campaigns.</li>
          <li>If a conversation stops, let it go.</li>
        </ul>
      </section>

      <section className="stack">
        <h2 className="h2">Not allowed</h2>
        <ul>
          <li>Harassment, threats, bullying, stalking or unwanted advances.</li>
          <li>Hate or discrimination based on who someone is, including their gender, ethnicity, religion, disability, age or background.</li>
          <li>Spam, scams, fake job offers, pyramid schemes, or asking people for money.</li>
          <li>Sharing someone&apos;s private details or messages without their permission.</li>
          <li>Sexual content, violence, or anything illegal.</li>
          <li>Pretending to be someone else, or to be an event organiser.</li>
        </ul>
      </section>

      <section className="stack">
        <h2 className="h2">Hiring and job hunting</h2>
        <ul>
          <li>Recruiters and hiring managers: be clear about the role, and never ask candidates to pay for anything.</li>
          <li>Job seekers: be honest about your experience. It&apos;s fine to say you&apos;re learning.</li>
        </ul>
      </section>

      <section className="stack">
        <h2 className="h2">At the event</h2>
        <ul>
          <li>Meet in the venue or another public place.</li>
          <li>Follow the event&apos;s own code of conduct as well as these guidelines.</li>
          <li>Only tap &ldquo;We met&rdquo; for people you actually met. The leaderboard is for fun, not for gaming.</li>
        </ul>
      </section>

      <section className="stack">
        <h2 className="h2">If something&apos;s wrong</h2>
        <p>
          Block the person from their badge, so you stop seeing each other, and report them, which goes to the event&apos;s organisers.
          Tell an organiser at the venue if you feel unsafe. Organisers can remove and ban people from their event, and we can suspend
          or close accounts. Serious or repeated breaches can mean losing access to meetadev altogether.
        </p>
        <p>
          You can also write to us at <a className="link" href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. See the{" "}
          <Link className="link" href="/terms">terms of use</Link> for the full rules.
        </p>
      </section>
    </article>
  );
}
