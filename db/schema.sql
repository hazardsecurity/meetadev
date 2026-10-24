-- DevFest Ilorin Connect schema. Idempotent: safe to run on every deploy.

CREATE TABLE IF NOT EXISTS users (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL,
  google_sub text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (lower(email));
-- Sign-in is Google only. Earlier databases had a password column; keep them working.
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub text;
ALTER TABLE users DROP COLUMN IF EXISTS password_hash;
CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_key ON users (google_sub);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);

CREATE TABLE IF NOT EXISTS profiles (
  user_id       uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  handle        text NOT NULL UNIQUE,
  name          text NOT NULL,
  headline      text NOT NULL DEFAULT '',
  bio           text NOT NULL DEFAULT '',
  role          text NOT NULL DEFAULT '',
  level         text NOT NULL DEFAULT '',
  intents       text[] NOT NULL DEFAULT '{}',
  stack         text[] NOT NULL DEFAULT '{}',
  -- Private: only shown to accepted connections
  whatsapp      text NOT NULL DEFAULT '',
  phone         text NOT NULL DEFAULT '',
  contact_email text NOT NULL DEFAULT '',
  -- Public links
  linkedin      text NOT NULL DEFAULT '',
  github        text NOT NULL DEFAULT '',
  x_handle      text NOT NULL DEFAULT '',
  website       text NOT NULL DEFAULT '',
  photo_url     text NOT NULL DEFAULT '',
  color         smallint NOT NULL DEFAULT 0,
  listed        boolean NOT NULL DEFAULT true,
  onboarded     boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS photo_url text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS connection_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note         text NOT NULL DEFAULT '',
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  UNIQUE (from_user, to_user),
  CHECK (from_user <> to_user)
);
CREATE INDEX IF NOT EXISTS requests_to_idx ON connection_requests (to_user, status);

CREATE TABLE IF NOT EXISTS blocks (
  blocker    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker, blocked)
);

CREATE TABLE IF NOT EXISTS reports (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason     text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rate_limits (
  key          text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  count        integer NOT NULL
);

-- ---------------------------------------------------------------------------
-- Events: organisers create a space; attendees join it. Directory, matching and
-- requests happen inside an event. Profiles and connections are per person.

CREATE TABLE IF NOT EXISTS events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text NOT NULL UNIQUE,
  name         text NOT NULL,
  city         text NOT NULL DEFAULT '',
  starts_on    date,
  about        text NOT NULL DEFAULT '',
  join_code    text NOT NULL,
  require_code boolean NOT NULL DEFAULT false,
  created_by   uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_members (
  event_id  uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      text NOT NULL DEFAULT 'attendee' CHECK (role IN ('attendee', 'organizer')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);
CREATE INDEX IF NOT EXISTS event_members_user_idx ON event_members (user_id);

CREATE TABLE IF NOT EXISTS event_bans (
  event_id  uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  banned_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

ALTER TABLE connection_requests ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES events(id) ON DELETE SET NULL;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES events(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS reports_event_idx ON reports (event_id);

-- ---------------------------------------------------------------------------
-- Only approved GDG organisers can create events. People apply; a platform
-- admin (ADMIN_EMAILS) approves.

ALTER TABLE users ADD COLUMN IF NOT EXISTS can_create_events boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS organizer_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chapter_name text NOT NULL,
  chapter_url  text NOT NULL,
  city         text NOT NULL,
  note         text NOT NULL DEFAULT '',
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by  uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  reviewed_at  timestamptz
);
CREATE INDEX IF NOT EXISTS organizer_requests_status_idx ON organizer_requests (status, created_at);

-- Discovery: attendees follow cities; events can be listed for discovery.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cities text[] NOT NULL DEFAULT '{}';
ALTER TABLE events ADD COLUMN IF NOT EXISTS listed boolean NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS events_city_idx ON events (lower(city));
-- Organisers who already created events keep the right to create more.
UPDATE users SET can_create_events = true
 WHERE NOT can_create_events AND id IN (SELECT created_by FROM events WHERE created_by IS NOT NULL);

-- ---------------------------------------------------------------------------
-- Chat between connected people, and Web Push subscriptions.

CREATE TABLE IF NOT EXISTS messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body       text NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at    timestamptz
);
CREATE INDEX IF NOT EXISTS messages_pair_idx ON messages (LEAST(from_user, to_user), GREATEST(from_user, to_user), created_at DESC);
CREATE INDEX IF NOT EXISTS messages_unread_idx ON messages (to_user) WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint   text PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  p256dh     text NOT NULL,
  auth       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions (user_id);

-- ---------------------------------------------------------------------------
-- Developer communities (GDG chapters, student clubs, WTM, others).
-- Organisers pick theirs when applying; attendees browse them by city.

CREATE TABLE IF NOT EXISTS communities (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       text NOT NULL UNIQUE,
  name       text NOT NULL,
  kind       text NOT NULL DEFAULT 'other' CHECK (kind IN ('gdg', 'gdsc', 'wtm', 'other')),
  city       text NOT NULL,
  country    text NOT NULL DEFAULT '',
  url        text NOT NULL DEFAULT '',
  status     text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending')),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS communities_city_idx ON communities (lower(city));
CREATE UNIQUE INDEX IF NOT EXISTS communities_url_key ON communities (lower(url)) WHERE url <> '';

CREATE TABLE IF NOT EXISTS community_organizers (
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (community_id, user_id)
);

ALTER TABLE organizer_requests ADD COLUMN IF NOT EXISTS community_id uuid REFERENCES communities(id) ON DELETE SET NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS community_id uuid REFERENCES communities(id) ON DELETE SET NULL;

-- One-off data fixes, each recorded so it runs once.
CREATE TABLE IF NOT EXISTS seed_runs (key text PRIMARY KEY, ran_at timestamptz NOT NULL DEFAULT now());

-- Events made before communities existed: link each to its city's GDG chapter
-- (only when the city has exactly one), and make the event's organiser one of
-- that chapter's organisers so they can manage the link.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM seed_runs WHERE key = 'link-events-to-chapters') THEN
    UPDATE events e SET community_id = (
        SELECT c.id FROM communities c
         WHERE c.kind = 'gdg' AND c.status = 'active' AND lower(c.city) = lower(trim(split_part(e.city, ',', 1))))
     WHERE e.community_id IS NULL
       AND (SELECT count(*) FROM communities c
             WHERE c.kind = 'gdg' AND c.status = 'active' AND lower(c.city) = lower(trim(split_part(e.city, ',', 1)))) = 1;
    INSERT INTO community_organizers (community_id, user_id)
      SELECT DISTINCT e.community_id, e.created_by FROM events e JOIN users u ON u.id = e.created_by
       WHERE e.community_id IS NOT NULL AND u.can_create_events
      ON CONFLICT DO NOTHING;
    INSERT INTO seed_runs (key) VALUES ('link-events-to-chapters');
  END IF;
END $$;
