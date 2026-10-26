# Local testing

Local-only test data. Never use these on a deployed site.

- Set `ALLOW_DEV_LOGIN=1` in `.env.local`, run `npm run dev`, and use "Sign in as test attendee" on /login with any `@example.test` email.
- `npm run seed:demo` creates the event `/e/demo-devfest` (join code `DEMO26`) with 8 made-up attendees, all checked in, some already met. Check yourself in at `/e/demo-devfest/checkin?k=DEMOHERE26`. Two of them already want to meet `tester@example.test` (or `-- --for=<email>`), so its first Meet on either is a match. Remove with `npm run seed:demo -- --remove`.
- In the local test database: `tester@example.test` organises `/e/devfest-ilorin-2026` and is in the demo event;
  `newbie@example.test` is banned from `devfest-ilorin-2026`; `coder@example.test` is in the demo event.
- Set `ADMIN_EMAILS=tester@example.test` in `.env.local` to test `/admin`. `coder@example.test` is an approved organiser and created `/e/devfest-lagos-2026`.
- `neworg@example.test` went through the organiser path (badge done, not yet applied). The demo event has seeded connections for the leaderboard.
- Local test communities are named "Test …"; `neworg@example.test` organises "Test GDG Abuja" and its event `/e/test-devfest-abuja-2026`.
