import type { Metadata } from "next";
import { Celebrate } from "@/components/Celebrate";
import { requireMember, safeNext } from "@/lib/auth";
import { profileOf, suggestions } from "@/lib/people";

export const metadata: Metadata = { title: "Welcome" };

export default async function WelcomePage({ searchParams }: PageProps<"/welcome">) {
  const next = safeNext((await searchParams).next);
  const me = await requireMember("/welcome");
  const profile = await profileOf(me.id);
  const matches = profile ? (await suggestions(profile, 50)).length : 0;
  return <Celebrate first={me.name.split(" ")[0]} matches={matches} next={next} />;
}
