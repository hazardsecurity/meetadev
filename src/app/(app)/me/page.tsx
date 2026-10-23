import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { AyoSays } from "@/components/Ayo";
import { BadgeQR } from "@/components/BadgeQR";
import { IntentChips, roleLine } from "@/components/Chips";
import { logout } from "@/lib/actions";
import { requireMember } from "@/lib/auth";
import { counts, profileOf } from "@/lib/people";

export const metadata: Metadata = { title: "My badge" };

export default async function MePage({ searchParams }: PageProps<"/me">) {
  const saved = !!(await searchParams).saved;
  const me = await requireMember("/me");
  const [p, c] = await Promise.all([profileOf(me.id), counts(me.id)]);
  if (!p) return null;

  const checks = [
    ["A one-line intro", !!p.headline],
    ["A short bio", p.bio.length >= 20],
    ["Your stack", p.stack.length > 0],
    ["A public link", !!(p.linkedin || p.github || p.x_handle || p.website)],
    ["WhatsApp for your contacts", !!p.whatsapp],
  ] as const;
  const done = checks.filter(([, ok]) => ok).length + 1;
  const total = checks.length + 1;
  const missing = checks.find(([, ok]) => !ok);

  return (
    <div className="me">
      <section className="lanyard">
        <div className="lanyard__strap" aria-hidden />
        <div className="badge-card">
          <div className="badge-card__band" aria-hidden><i /><i /><i /><i /></div>
          <p className="eyebrow" style={{ textAlign: "center" }}>Connect · Attendee badge</p>
          <div className="stack" style={{ justifyItems: "center", textAlign: "center", "--gap": "8px" } as React.CSSProperties}>
            <Avatar name={p.name} color={p.color} photo={p.photo_url} size={72} />
            <h1 className="h2">{p.name}</h1>
            <p className="muted">{p.headline || roleLine(p.role, p.level)}</p>
            <IntentChips intents={p.intents} max={3} />
          </div>
          <BadgeQR handle={p.handle} name={p.name} />
          <p className="hint" style={{ textAlign: "center" }}>Let people scan this to find you instantly.</p>
        </div>
      </section>

      <section className="stack">
        {saved && <p className="card card--green success">Saved! Your badge is up to date.</p>}
        <div className="card stack">
          <AyoSays mood={done === total ? "excited" : "thinking"} size={72}>
            {done === total
              ? "Your profile is complete. People can see exactly why to meet you!"
              : `Profiles with more detail get more connections. Next up: ${missing?.[0].toLowerCase()}.`}
          </AyoSays>
          <div className="row" style={{ flexWrap: "nowrap" }}>
            <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label="Profile strength">
              <div className="progress__fill" style={{ width: `${(done / total) * 100}%` }} />
            </div>
            <strong className="mono">{done}/{total}</strong>
          </div>
          <Link href="/onboarding" className="btn btn--white btn--block">Edit profile</Link>
        </div>

        <div className="stats">
          <Link href="/connections" className="card stat"><strong>{c.connected}</strong><span>Contacts</span></Link>
          <Link href="/requests" className="card stat"><strong>{c.incoming}</strong><span>New requests</span></Link>
        </div>

        <div className="row" style={{ justifyContent: "space-between" }}>
          <Link href={`/p/${p.handle}`} className="link">See my public profile</Link>
          <form action={logout}><button className="btn btn--ghost btn--sm">Log out</button></form>
        </div>
        {!p.listed && <p className="hint">You&apos;re hidden from the directory. People can still reach you through your QR code.</p>}
      </section>
    </div>
  );
}
