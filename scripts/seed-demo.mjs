// Fills a LOCAL database with made-up attendees so the directory and matching
// have something to show. Refuses to run against anything but localhost.
// Usage: npm run seed:demo   (remove with: npm run seed:demo -- --remove)
// Creates the event /e/demo-devfest with join code DEMO26 and check-in link /e/demo-devfest/checkin?k=DEMOHERE26.
// Everyone is checked in, some pairs have met, and two people already want to meet the login given with
// --for=<email> (default tester@example.test), so its first Meet on either of them is a match.
import { randomBytes } from "node:crypto";
import pg from "pg";

const url = process.env.DATABASE_URL ?? "";
if (!/@(localhost|127\.0\.0\.1)(:|\/)/.test(url)) {
  console.error("seed:demo only runs against a local database.");
  process.exit(1);
}

const people = [
  ["Tolu Adebayo", "Flutter dev at a Lagos fintech", "mobile", "senior", ["mentoring", "hiring"], ["Flutter", "Dart", "Firebase"]],
  ["Aisha Bello", "CS student, Unilorin", "student", "learning", ["mentor_wanted", "learning", "friends"], ["Python", "JavaScript"]],
  ["Ibrahim Yusuf", "Backend engineer, Go and Postgres", "backend", "mid", ["collab", "mentoring"], ["Go", "SQL", "Docker"]],
  ["Chiamaka Obi", "Product designer", "design", "mid", ["collab", "friends"], ["Figma"]],
  ["Kunle Ajayi", "Building an agritech startup", "founder", "mid", ["cofounder", "hiring"], ["Next.js", "Google Cloud"]],
  ["Fatima Abdullahi", "Self-taught frontend dev", "frontend", "junior", ["job_hunting", "mentor_wanted"], ["React", "TypeScript", "Next.js"]],
  ["Segun Olawale", "ML engineer, working with Gemini", "ai", "senior", ["mentoring", "collab"], ["Python", "TensorFlow", "Gemini"]],
  ["Halima Salihu", "Android dev learning Kotlin", "mobile", "junior", ["mentor_wanted", "learning"], ["Kotlin", "Android"]],
];

const client = new pg.Client({ connectionString: url });
await client.connect();
await client.query("DELETE FROM users WHERE email LIKE 'demo+%@example.test'");
await client.query("DELETE FROM events WHERE slug = 'demo-devfest'");
if (!process.argv.includes("--remove")) {
  const { rows: [event] } = await client.query(
    `INSERT INTO events (slug, name, city, about, join_code, checkin_key) VALUES ('demo-devfest', 'Demo DevFest', 'Ilorin',
     'A local test event full of made-up attendees.', 'DEMO26', 'DEMOHERE26') RETURNING id`,
  );
  for (const [n, [name, headline, role, level, intents, stack]] of people.entries()) {
    const { rows } = await client.query(
      "INSERT INTO users (email, google_sub) VALUES ($1, $2) RETURNING id",
      [`demo+${n}@example.test`, `demo-${randomBytes(8).toString("hex")}`],
    );
    await client.query(
      `INSERT INTO profiles (user_id, handle, name, headline, role, level, intents, stack, whatsapp, color, onboarded, bio)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11)`,
      [rows[0].id, `demo-${n}`, name, headline, role, level, intents, stack, "+234 800 000 000" + n, n % 4,
       "Demo profile for local testing. Not a real person."],
    );
    await client.query("INSERT INTO event_members (event_id, user_id, checked_in_at) VALUES ($1, $2, now())", [event.id, rows[0].id]);
  }
  const id = async (email) => (await client.query("SELECT id FROM users WHERE email = $1", [email])).rows[0]?.id;
  // Some connections, and most of them met (both halves of We met), so the leaderboard has something to show.
  const pairs = [[0, 1], [0, 5], [0, 7], [0, 2], [6, 1], [6, 7], [6, 3], [2, 4], [4, 3], [1, 5]];
  for (const [n, [a, b]] of pairs.entries()) {
    const [ua, ub] = [await id(`demo+${a}@example.test`), await id(`demo+${b}@example.test`)];
    await client.query(
      "INSERT INTO connection_requests (from_user, to_user, status, responded_at, event_id) VALUES ($1, $2, 'accepted', now(), $3)",
      [ua, ub, event.id],
    );
    if (n < 7)
      await client.query("INSERT INTO meetings (event_id, from_user, to_user) VALUES ($1, $2, $3), ($1, $3, $2)", [event.id, ua, ub]);
  }
  const login = process.argv.find((a) => a.startsWith("--for="))?.slice(6) ?? "tester@example.test";
  const me = await id(login);
  if (me) {
    await client.query("INSERT INTO event_members (event_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [event.id, me]);
    for (const n of [3, 5])
      await client.query("INSERT INTO connection_requests (from_user, to_user, event_id) VALUES ($1, $2, $3)", [await id(`demo+${n}@example.test`), me, event.id]);
  }
  console.log(`seed:demo: added ${people.length} demo attendees to /e/demo-devfest (join code DEMO26)`);
  console.log("seed:demo: check in at /e/demo-devfest/checkin?k=DEMOHERE26");
  if (me) console.log(`seed:demo: ${login} joined; Chiamaka and Fatima want to meet them`);
} else console.log("seed:demo: removed demo attendees");
await client.end();
