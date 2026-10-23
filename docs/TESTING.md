# Local testing

Local-only test data. Never use these on a deployed site.

- Set `ALLOW_DEV_LOGIN=1` in `.env.local`, run `npm run dev`, and use "Sign in as test attendee" on /login with any `@example.test` email.
  `tester@example.test` already has a finished profile and two connections in the local test database.
- Demo attendees (no login): `npm run seed:demo`; remove with `npm run seed:demo -- --remove`.
