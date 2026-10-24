import assert from "node:assert/strict";
import test from "node:test";
import { rank, score } from "../src/lib/match.ts";

const me = { user_id: "me", role: "frontend", intents: ["mentoring", "collab"], stack: ["React", "Firebase"] };
const person = (user_id, extra = {}) => ({ user_id, role: "other", intents: [], stack: [], ...extra });

test("score explains the strongest reason", () => {
  const s = score(me, person("amara", { intents: ["mentor_wanted"], stack: ["Firebase"] }));
  assert.equal(s.reason, "They're looking for a mentor in Firebase. You could help.");
  assert.equal(score(me, person("nobody")), null);
});

test("rank keeps people with nothing in common, last", () => {
  const ranked = rank(me, [person("nobody"), person("collab", { intents: ["collab"] })], new Set());
  assert.deepEqual(ranked.map((p) => p.user_id), ["collab", "nobody"]);
  assert.equal(ranked[1].reason, "");
});

test("someone who wants to meet you moves up without saying so", () => {
  const people = [person("shared", { stack: ["React"] }), person("fan")];
  const ranked = rank(me, people, new Set(["fan"]));
  assert.deepEqual(ranked.map((p) => p.user_id), ["fan", "shared"]);
  assert.equal(ranked[0].reason, "");
  for (const p of ranked) assert.ok(!("wantsMe" in p) && !Object.values(p).includes(true), "nothing in the card reveals the want");
});

test("the boost doesn't beat a strong match", () => {
  const strong = person("strong", { intents: ["mentor_wanted", "collab"], stack: ["React", "Firebase"] });
  const ranked = rank(me, [person("fan"), strong], new Set(["fan"]));
  assert.equal(ranked[0].user_id, "strong");
});
