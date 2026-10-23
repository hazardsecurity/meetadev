// Cities are free text ("Ilorin", "lagos ", "PORT HARCOURT"). Store a tidy
// display form and always compare in lower case.

export function tidyCity(raw: string) {
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase())
    .slice(0, 60);
}

export function tidyCities(list: string[], max = 10) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of list.map(tidyCity)) {
    const key = c.toLowerCase();
    if (c.length >= 2 && !seen.has(key)) { seen.add(key); out.push(c); }
    if (out.length >= max) break;
  }
  return out;
}
