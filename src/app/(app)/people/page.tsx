import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Old link target: send people to the event they were last in.
export default async function PeopleRedirect({ searchParams }: PageProps<"/people">) {
  const slug = (await cookies()).get("dfi_event")?.value;
  const qs = new URLSearchParams(Object.entries(await searchParams).filter(([, v]) => typeof v === "string") as [string, string][]);
  redirect(slug && /^[a-z0-9-]+$/.test(slug) ? `/e/${slug}${qs.size ? `?${qs}` : ""}` : "/events");
}
