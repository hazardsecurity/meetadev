# Local testing

Local-only test data. Never use these on a deployed site.

- Set `ALLOW_DEV_LOGIN=1` in `.env.local`, run `npm run dev`, and use "Sign in as test attendee" on /login with any `@example.test` email.
- `npm run seed:demo` creates the event `/e/demo-devfest` (join code `DEMO26`) with 8 made-up attendees. Remove with `npm run seed:demo -- --remove`.
- In the local test database: `tester@example.test` organises `/e/devfest-ilorin-2026` and is in the demo event;
  `newbie@example.test` is banned from `devfest-ilorin-2026`; `coder@example.test` is in the demo event.
- Set `ADMIN_EMAILS=tester@example.test` in `.env.local` to test `/admin`. `coder@example.test` is an approved organiser and created `/e/devfest-lagos-2026`.
- `neworg@example.test` went through the organiser path (badge done, not yet applied). The demo event has seeded connections for the leaderboard.
