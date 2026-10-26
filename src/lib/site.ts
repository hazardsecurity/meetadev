// Public site address, for canonicals, the sitemap and structured data.
export const SITE_URL = (process.env.APP_URL || "https://www.meetadev.xyz").replace(/\/$/, "");
export const SITE_NAME = "meetadev";
export const SITE_DESCRIPTION =
  "Find the people you should meet at tech events and meetups: mentors, learners, collaborators and teams that are hiring. Contacts are only swapped when both people say yes.";

const NOINDEX = { index: false, follow: false } as const;
export const noindex = { robots: NOINDEX };

/** JSON-LD for a <script type="application/ld+json">, with "<" escaped. */
export const jsonLd = (data: unknown) => ({ __html: JSON.stringify(data).replace(/</g, "\\u003c") });
