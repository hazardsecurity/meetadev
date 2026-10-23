// The vocabulary people pick from during onboarding and filter by in the directory.

export const COLORS = ["blue", "red", "yellow", "green"] as const;
export type ColorName = (typeof COLORS)[number];

export const ROLES = [
  { id: "frontend", label: "Frontend", emoji: "🎨" },
  { id: "backend", label: "Backend", emoji: "⚙️" },
  { id: "mobile", label: "Mobile", emoji: "📱" },
  { id: "fullstack", label: "Full-stack", emoji: "🧱" },
  { id: "ai", label: "AI / ML", emoji: "🧠" },
  { id: "data", label: "Data", emoji: "📊" },
  { id: "cloud", label: "Cloud / DevOps", emoji: "☁️" },
  { id: "security", label: "Security", emoji: "🔐" },
  { id: "design", label: "Product design", emoji: "✏️" },
  { id: "product", label: "Product / PM", emoji: "🧭" },
  { id: "community", label: "Community", emoji: "🎤" },
  { id: "student", label: "Student", emoji: "🎒" },
  { id: "founder", label: "Founder", emoji: "🚀" },
  { id: "other", label: "Something else", emoji: "✨" },
] as const;

export const LEVELS = [
  { id: "curious", label: "Just curious", hint: "I haven't started coding yet" },
  { id: "learning", label: "Learning", hint: "I'm picking up the basics" },
  { id: "junior", label: "Junior", hint: "0–2 years building things" },
  { id: "mid", label: "Mid-level", hint: "2–5 years in" },
  { id: "senior", label: "Senior", hint: "5+ years, I've seen things" },
] as const;

export const INTENTS = [
  { id: "mentor_wanted", label: "Looking for a mentor", short: "Wants a mentor", color: "yellow" },
  { id: "mentoring", label: "Open to mentoring", short: "Mentors", color: "green" },
  { id: "learning", label: "Learning with others", short: "Learning", color: "blue" },
  { id: "job_hunting", label: "Looking for a job", short: "Job hunting", color: "red" },
  { id: "hiring", label: "Hiring", short: "Hiring", color: "green" },
  { id: "collab", label: "Looking for collaborators", short: "Collab", color: "blue" },
  { id: "cofounder", label: "Looking for a co-founder", short: "Co-founder", color: "red" },
  { id: "friends", label: "Just making friends", short: "Friends", color: "yellow" },
] as const satisfies readonly { id: string; label: string; short: string; color: ColorName }[];

export const STACK = [
  "JavaScript", "TypeScript", "React", "Next.js", "Vue", "Angular", "Node.js",
  "Python", "Django", "Go", "Java", "Kotlin", "Android", "Swift", "Flutter", "Dart",
  "PHP", "Laravel", "C#", ".NET", "Rust", "SQL", "Firebase", "Google Cloud",
  "AWS", "Docker", "Kubernetes", "TensorFlow", "Gemini", "Figma", "Web3",
] as const;

export type RoleId = (typeof ROLES)[number]["id"];
export type LevelId = (typeof LEVELS)[number]["id"];
export type IntentId = (typeof INTENTS)[number]["id"];

export const roleIds = ROLES.map((r) => r.id) as [RoleId, ...RoleId[]];
export const levelIds = LEVELS.map((l) => l.id) as [LevelId, ...LevelId[]];
export const intentIds = INTENTS.map((i) => i.id) as [IntentId, ...IntentId[]];

export const roleLabel = (id: string) => ROLES.find((r) => r.id === id)?.label ?? "";
export const roleEmoji = (id: string) => ROLES.find((r) => r.id === id)?.emoji ?? "✨";
export const levelLabel = (id: string) => LEVELS.find((l) => l.id === id)?.label ?? "";
export const intent = (id: string) => INTENTS.find((i) => i.id === id);
