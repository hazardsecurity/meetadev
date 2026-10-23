import Link from "next/link";
import type { LeaderRow } from "@/lib/events";
import { Avatar } from "./Avatar";

const MEDAL = ["🥇", "🥈", "🥉"];
const PODIUM_ORDER = [1, 0, 2]; // 2nd, 1st, 3rd from left to right

export function Podium({ top }: { top: LeaderRow[] }) {
  return (
    <div className="podium" aria-label="Top three">
      {PODIUM_ORDER.map((i) => {
        const p = top[i];
        if (!p) return <div key={i} className="podium__slot" aria-hidden />;
        return (
          <Link key={p.user_id} href={`/p/${p.handle}`} className={`podium__slot podium__slot--${p.rank <= 3 ? p.rank : 3}`}>
            <span className="podium__medal" aria-hidden>{MEDAL[Math.min(p.rank, 3) - 1]}</span>
            <Avatar name={p.name} color={p.color} photo={p.photo_url} size={i === 0 ? 72 : 56} />
            <span className="podium__name">{p.name}</span>
            <span className="podium__score">{p.connections}</span>
            <span className="podium__block">{p.rank}</span>
          </Link>
        );
      })}
    </div>
  );
}

export function LeaderList({ rows, me }: { rows: LeaderRow[]; me: string }) {
  return (
    <ol className="leaders">
      {rows.map((r) => (
        <li key={r.user_id} className={r.user_id === me ? "is-me" : undefined}>
          <span className="leaders__rank">{r.rank}</span>
          <Link href={`/p/${r.handle}`} className="person__head" style={{ minWidth: 0, flex: 1 }}>
            <Avatar name={r.name} color={r.color} photo={r.photo_url} size={40} />
            <span style={{ minWidth: 0 }}>
              <span className="person__name" style={{ display: "block", fontSize: "0.95rem" }}>
                {r.name}{r.user_id === me && " (you)"}
              </span>
              {r.headline && <span className="person__meta">{r.headline}</span>}
            </span>
          </Link>
          <span className="leaders__score">{r.connections} <small>{r.connections === 1 ? "connection" : "connections"}</small></span>
        </li>
      ))}
    </ol>
  );
}
