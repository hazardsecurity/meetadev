import { currentUser } from "@/lib/auth";
import { connections } from "@/lib/people";
import { roleLabel } from "@/lib/options";
import { vcard } from "@/lib/vcard";

// All accepted connections as one .vcf file, ready to import into a phone.
export async function GET() {
  const me = await currentUser();
  if (!me?.onboarded) return new Response("Not signed in", { status: 401 });
  const list = await connections(me.id);
  const cards = list.map((c) =>
    vcard({
      name: c.name, whatsapp: c.whatsapp, phone: c.phone, email: c.contact_email,
      title: c.headline || roleLabel(c.role),
      note: c.event_name ? `Met at ${c.event_name}` : "Met on meetadev",
    }),
  );
  return new Response(cards.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": 'attachment; filename="meetadev-contacts.vcf"',
      "Cache-Control": "no-store",
    },
  });
}
