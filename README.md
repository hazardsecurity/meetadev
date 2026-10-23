# DevFest Ilorin Connect

Find the people you should meet at DevFest Ilorin (mentors, learners, people hiring, future co-founders) and swap contacts only when both people say yes.

Ayo, the buddy, guides people through a 7-step, Duolingo-style onboarding, suggests matches, and reacts as you go.

## What it does

- **Badge onboarding**: role, level, what you're here for, stack, intro, private contact, public links.
- **"People you should meet"**: matches mentors with people who want a mentor, hiring with job hunting, co-founder with co-founder, shared stack, and so on. Every suggestion says why.
- **Directory** with search and filters (role, level, intent, stack) plus quick filters.
- **Connection requests** with an optional note. If two people request each other, they connect automatically.
- **Private contact details**: WhatsApp, phone and email are only sent to the browser once a request is accepted. A declined request still looks "sent" to the sender.
- **My badge**: a QR code that opens your profile, for connecting in person; profile strength meter.
- **Contacts**: one-tap WhatsApp, a 10-person goal, and "Save all to phone" (.vcf export).
- **Safety**: block, report, hide from the directory, rate limits (sign-ups, logins, 40 requests/day).
- **Sign in with Google only.** No passwords. First sign-in creates the account (name and photo come from Google), and later sign-ins go straight back in.
- Optional **event code**: set `EVENT_CODE` and first-time sign-ins must enter it.

## Run locally

```bash
cp .env.example .env.local   # set DATABASE_URL to a Postgres database
npm install
npm run migrate
npm run seed:demo            # optional: 8 made-up attendees (local DBs only)
npm run dev
```

Without Google keys you can still test locally: set `ALLOW_DEV_LOGIN=1` in `.env.local` and a "sign in as test attendee" form appears for `@example.test` emails. It only works under `next dev`; production builds return 404 for it. See `docs/TESTING.md`.

## Set up Google sign-in

1. In [Google Cloud Console](https://console.cloud.google.com/) create or pick a project, then go to **APIs & Services → OAuth consent screen**. Choose **External**, fill in the app name ("DevFest Ilorin Connect") and support email, add the scopes `openid`, `email` and `profile`, and **publish** the app so anyone can sign in.
2. **Credentials → Create credentials → OAuth client ID → Web application.**
   - Authorised JavaScript origin: `https://your-domain`
   - Authorised redirect URI: `https://your-domain/api/auth/google/callback`
   - For local work also add `http://localhost:3000` and `http://localhost:3000/api/auth/google/callback` (use your port).
3. Put `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `APP_URL` in Vercel → Settings → Environment Variables (and in `.env.local` for local).

## Deploy (Vercel + Neon)

1. Push to GitHub and import the repo in Vercel.
2. Add a Neon Postgres database from the Vercel Marketplace. That sets `DATABASE_URL` / `DATABASE_URL_UNPOOLED`.
3. Add the Google variables above, and optionally `EVENT_CODE`.
4. Deploy. `prebuild` runs the migration on every deploy.

## Stack

Next.js 16 (App Router, Server Actions, `proxy.ts`), Postgres via `pg`, zod, Motion, `qrcode`. Google Sans / Google Sans Code fonts. Auth is Google OpenID Connect (authorization code + PKCE, state check, no extra library); sessions are httpOnly cookies and only token hashes are stored.

## Not built yet

- An organiser page for reading reports. For now: `SELECT * FROM reports`.
- Uploading a different profile photo (the Google photo is used, otherwise coloured initials).

Not an official Google product. Google and DevFest are trademarks of Google LLC.
