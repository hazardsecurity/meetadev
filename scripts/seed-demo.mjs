// Fills a LOCAL database with made-up attendees so the directory and matching
// have something to show. Refuses to run against anything but localhost.
// Usage: npm run seed:demo   (remove with: npm run seed:demo -- --remove)
// Creates the event /e/demo-devfest with join code DEMO26.
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
    `INSERT INTO events (slug, name, city, about, join_code) VALUES ('demo-devfest', 'Demo DevFest', 'Ilorin',
     'A local test event full of made-up attendees.', 'DEMO26') RETURNING id`,
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
    await client.query("INSERT INTO event_members (event_id, user_id) VALUES ($1, $2)", [event.id, rows[0].id]);
  }
  console.log(`seed:demo: added ${people.length} demo attendees to /e/demo-devfest (join code DEMO26)`);
} else console.log("seed:demo: removed demo attendees");
await client.end();
