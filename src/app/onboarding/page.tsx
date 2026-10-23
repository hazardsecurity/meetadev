import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Onboarding } from "@/components/Onboarding";
import { currentUser, safeNext } from "@/lib/auth";
import { knownCities } from "@/lib/events";
import { profileOf } from "@/lib/people";
import type { ProfileInput } from "@/lib/validation";

export const metadata: Metadata = { title: "Your badge", robots: { index: false, follow: false } };

export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const next = safeNext((await searchParams).next);
  const me = await currentUser();
  if (!me) redirect(`/login?next=${encodeURIComponent("/onboarding")}`);
  const p = await profileOf(me.id);
  const initial = {
    name: p?.name ?? "", headline: p?.headline ?? "", bio: p?.bio ?? "",
    role: p?.role ?? "", level: p?.level ?? "", intents: p?.intents ?? [], stack: p?.stack ?? [], cities: p?.cities ?? [],
    whatsapp: p?.whatsapp ?? "", phone: p?.phone ?? "", contact_email: p?.contact_email || me.email,
    linkedin: p?.linkedin ?? "", github: p?.github ?? "", x_handle: p?.x_handle ?? "", website: p?.website ?? "",
    listed: p?.listed ?? true,
  } as ProfileInput;
  return <Onboarding initial={initial} editing={me.onboarded} next={next} citySuggestions={await knownCities()} />;
}
