import { currentUser } from "@/lib/auth";
import { connections } from "@/lib/people";
import { roleLabel } from "@/lib/options";

const esc = (v: string) => v.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");

// All accepted connections as one .vcf file, ready to import into a phone.
export async function GET() {
  const me = await currentUser();
  if (!me?.onboarded) return new Response("Not signed in", { status: 401 });
  const list = await connections(me.id);
  const cards = list.map((c) =>
    [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${esc(c.name)}`,
      c.whatsapp && `TEL;TYPE=CELL:${esc(c.whatsapp)}`,
      c.phone && c.phone !== c.whatsapp && `TEL;TYPE=VOICE:${esc(c.phone)}`,
      c.contact_email && `EMAIL:${esc(c.contact_email)}`,
      `TITLE:${esc(c.headline || roleLabel(c.role))}`,
      `NOTE:${esc(c.event_name ? `Met at ${c.event_name}` : "Met on Connect")}`,
      "END:VCARD",
    ].filter(Boolean).join("\r\n"),
  );
  return new Response(cards.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": 'attachment; filename="devfest-ilorin-contacts.vcf"',
      "Cache-Control": "no-store",
    },
  });
}
