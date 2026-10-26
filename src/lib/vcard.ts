// vCard 3.0 text for "Save to contacts". Shared by the all-connections export and the chat contact card.
const esc = (v: string) => v.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");

/** One contact; empty fields are left out. */
export function vcard(c: { name: string; whatsapp?: string; phone?: string; email?: string; title?: string; note?: string; urls?: string[] }) {
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${esc(c.name)}`,
    c.whatsapp && `TEL;TYPE=CELL:${esc(c.whatsapp)}`,
    c.phone && c.phone !== c.whatsapp && `TEL;TYPE=VOICE:${esc(c.phone)}`,
    c.email && `EMAIL:${esc(c.email)}`,
    c.title && `TITLE:${esc(c.title)}`,
    c.note && `NOTE:${esc(c.note)}`,
    ...(c.urls ?? []).map((u) => `URL:${u}`),
    "END:VCARD",
  ].filter(Boolean).join("\r\n");
}
