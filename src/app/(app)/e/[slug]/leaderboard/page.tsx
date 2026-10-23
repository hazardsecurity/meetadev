import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AyoSays } from "@/components/Ayo";
import { LeaderList, Podium } from "@/components/Leaderboard";
import { requireMember } from "@/lib/auth";
import { eventBySlug, leaderboard, membership, myStanding } from "@/lib/events";

export const metadata: Metadata = { title: "Leaderboard", robots: { index: false } };

export default async function LeaderboardPage({ params }: PageProps<"/e/[slug]/leaderboard">) {
  const { slug } = await params;
  const me = await requireMember(`/e/${slug}/leaderboard`);
  const event = await eventBySlug(slug);
  if (!event) notFound();
  if (!(await membership(event.id, me.id))) redirect(`/e/${slug}`);

  const [rows, mine] = await Promise.all([leaderboard(event.id), myStanding(event.id, me.id)]);
  const first = me.name.split(" ")[0];
  const leader = rows[0];

  let line: string;
  if (!rows.length) line = "Nobody has connected yet. Send the first request and you'll be top of the board!";
  else if (mine?.rank === 1) line = `${first}, you're number one! Keep saying hi.`;
  else if (mine) {
    // The closest score above yours: beat it by one to move up a place.
    const above = [...rows].reverse().find((r) => r.connections > mine.connections) ?? leader;
    const gap = above.connections - mine.connections + 1;
    line = `You're #${mine.rank}. ${gap} more ${gap === 1 ? "connection" : "connections"} to move up!`;
  } else line = "You're not on the board yet. One accepted connection gets you on it.";

  return (
    <div className="stack narrow" style={{ "--gap": "24px" } as React.CSSProperties}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="stack" style={{ "--gap": "4px" } as React.CSSProperties}>
          <p className="eyebrow">{event.name}</p>
          <h1 className="h1">Leaderboard</h1>
        </div>
        <Link className="btn btn--white btn--sm" href={`/e/${slug}`}>Back to people</Link>
      </div>

      <AyoSays mood={mine?.rank === 1 ? "excited" : rows.length ? "happy" : "wave"} size={84}>{line}</AyoSays>

      {rows.length > 0 && (
        <>
          <Podium top={rows.slice(0, 3)} />
          {rows.length > 3 && <LeaderList rows={rows.slice(3)} me={me.id} />}
          {mine && mine.rank > 3 && !rows.slice(3).some((r) => r.user_id === me.id) && <LeaderList rows={[mine]} me={me.id} />}
        </>
      )}

      <p className="hint">Counts connections accepted at this event. People hidden from the directory aren&apos;t shown.</p>
    </div>
  );
}
