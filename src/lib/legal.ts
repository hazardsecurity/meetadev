// Facts the legal pages quote. Check these before launch: they are the promises the pages make.
export const LEGAL = {
  /** Who runs meetadev. Use the registered business name once there is one. */
  operator: "Hazardsecurity",
  /** Where privacy and legal requests go. The mailbox must exist and be read. */
  email: "hello@meetadev.xyz",
  /** Shown as "Last updated" on every legal page. Change it whenever a page changes. */
  updated: "26 October 2026",
  country: "Nigeria",
  regulator: { name: "Nigeria Data Protection Commission (NDPC)", url: "https://ndpc.gov.ng" },
  /** How long to answer a privacy request. */
  replyDays: 30,
};

export const LEGAL_PAGES = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/guidelines", label: "Community guidelines" },
] as const;
