// Who to show first in the deck, and why. Pure (no database), so tests can import it.
import { roleLabel } from "./options.ts";

export type MatchProfile = { intents: string[]; stack: string[]; role: string };

const has = (p: { intents: string[] }, id: string) => p.intents.includes(id);

/** The strongest reason two people should meet, or null when there's none. */
export function score(me: MatchProfile, them: MatchProfile) {
  const shared = them.stack.filter((s) => me.stack.includes(s));
  const topic = shared[0] ?? roleLabel(them.role);
  const reasons: [number, string][] = [];
  if (has(me, "mentor_wanted") && has(them, "mentoring"))
    reasons.push([5 + shared.length, `They mentor${topic ? ` in ${topic}` : ""}, and you're looking for a mentor.`]);
  if (has(me, "mentoring") && has(them, "mentor_wanted"))
    reasons.push([4 + shared.length, `They're looking for a mentor${topic ? ` in ${topic}` : ""}. You could help.`]);
  if (has(me, "hiring") && has(them, "job_hunting")) reasons.push([5, `They're looking for a job, and you're hiring.`]);
  if (has(me, "job_hunting") && has(them, "hiring")) reasons.push([5, `They're hiring, and you're looking for a job.`]);
  if (has(me, "cofounder") && has(them, "cofounder")) reasons.push([4, `You're both looking for a co-founder.`]);
  if (has(me, "collab") && has(them, "collab")) reasons.push([3, `You both want to build something together.`]);
  if (has(me, "learning") && has(them, "learning") && shared.length)
    reasons.push([3, `You're both learning ${shared[0]}.`]);
  if (shared.length >= 2) reasons.push([shared.length, `You both work with ${shared.slice(0, 2).join(" and ")}.`]);
  else if (shared.length === 1) reasons.push([1, `You both work with ${shared[0]}.`]);
  if (me.role && me.role === them.role) reasons.push([1, `You're both into ${roleLabel(me.role).toLowerCase()}.`]);
  if (!reasons.length) return null;
  reasons.sort((a, b) => b[0] - a[0]);
  return { score: reasons.reduce((s, [n]) => s + n, 0), reason: reasons[0][1] };
}

// Big enough to beat most single reasons, not so big that the first card always means "they want you".
const WANTS_YOU = 8;

/**
 * Everyone, best match first; people with no reason in common go last rather than missing.
 * People who already want to meet the viewer move up, and nothing in the result says so.
 */
export function rank<T extends MatchProfile & { user_id: string }>(me: MatchProfile, people: T[], wantsMe: Set<string>) {
  return people
    .map((p, i) => {
      const s = score(me, p);
      return { p: { ...p, reason: s?.reason ?? "" }, n: (s?.score ?? 0) + (wantsMe.has(p.user_id) ? WANTS_YOU : 0), i };
    })
    .sort((a, b) => b.n - a.n || a.i - b.i)
    .map(({ p }) => p);
}
