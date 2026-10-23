# Connect, for DevFest & GDG events

Organisers create a space for their DevFest or GDG event. Attendees join it with a link or code, and find the people they should meet there (mentors, learners, people hiring, future co-founders). Contacts are swapped only when both people say yes.

Ayo, the buddy, guides people through a 7-step, Duolingo-style onboarding, suggests matches, and reacts as you go.

## For organisers

- **Create an event** at `/events/new`: name, city, date, welcome note. Anyone signed in can create one; they become its organiser.
- **Invite people**: an invite link (with the join code built in), a QR code, and a 6-character join code. "Show on screen" opens a full-screen join slide for the projector.
- **Ask for the join code** (optional): people opening the plain event page must type the code; invite links still work. "Make a new code" retires the old one.
- **Dashboard** at `/e/<slug>/manage`: people joined, connections made, mentors vs. people wanting one, reports, members.
- **Members**: make co-organisers, remove someone (they can rejoin), or ban them from the event.
- **Reports** filed by people at your event land in your dashboard.

## For attendees

- **One badge for every event**: role, level, what you're here for, stack, intro, private contact, public links.
- **Events**: join with an invite link or a code; switch between events from the top bar. The directory, suggestions and requests are limited to people at the same event.
- **"People you should meet"**: matches mentors with people who want a mentor, hiring with job hunting, co-founder with co-founder, shared stack, and so on. Every suggestion says why.
- **Directory** with search and filters (role, level, intent, stack) plus quick filters.
- **Connection requests** with an optional note. If two people request each other, they connect automatically.
- **Private contact details**: WhatsApp, phone and email are only sent to the browser once a request is accepted. A declined request still looks "sent" to the sender.
- **My badge**: a QR code that opens your profile, for connecting in person; profile strength meter.
- **Contacts**: one-tap WhatsApp, a 10-person goal, and "Save all to phone" (.vcf export).
- **Safety**: block, report, hide from the directory, rate limits (sign-ups, logins, 40 requests/day).
- **Sign in with Google only.** No passwords. First sign-in creates the account (name and photo come from Google), and later sign-ins go straight back in.

## Run locally

```bash
cp .env.example .env.local   # set DATABASE_URL to a Postgres database
npm install
npm run migrate
npm run seed:demo            # optional: a demo event (/e/demo-devfest, code DEMO26) with 8 made-up attendees
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
3. Add the Google variables above.
4. Deploy. `prebuild` runs the migration on every deploy.

## Stack

Next.js 16 (App Router, Server Actions, `proxy.ts`), Postgres via `pg`, zod, Motion, `qrcode`. Google Sans / Google Sans Code fonts. Auth is Google OpenID Connect (authorization code + PKCE, state check, no extra library); sessions are httpOnly cookies and only token hashes are stored.

## Not built yet

- Event logos or custom colours (every event uses the Google colours).
- Deleting an event (organisers can leave, but the event stays).
- Limiting who can create events. Anyone signed in can (5 per day each).
- Uploading a different profile photo (the Google photo is used, otherwise coloured initials).

Not an official Google product. Google and DevFest are trademarks of Google LLC.
