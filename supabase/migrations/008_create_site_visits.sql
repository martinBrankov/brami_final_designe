-- Site visit tracking
-- A "visit" is one browser-session worth of activity. When the user closes
-- the tab and returns, sessionStorage is gone, so the client mints a new
-- session_id and a new visit row is inserted.

CREATE TABLE IF NOT EXISTS site_visits (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      text NOT NULL UNIQUE,
  started_at      timestamptz NOT NULL DEFAULT now(),
  last_seen_at    timestamptz NOT NULL DEFAULT now(),
  pageview_count  integer NOT NULL DEFAULT 0,
  referrer        text,
  user_agent      text,
  landing_path    text,
  ip_hash         text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS site_visits_started_at_idx ON site_visits(started_at DESC);

CREATE TABLE IF NOT EXISTS visit_pageviews (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id    uuid NOT NULL REFERENCES site_visits(id) ON DELETE CASCADE,
  path        text NOT NULL,
  title       text,
  viewed_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS visit_pageviews_visit_id_idx ON visit_pageviews(visit_id);
CREATE INDEX IF NOT EXISTS visit_pageviews_viewed_at_idx ON visit_pageviews(viewed_at DESC);
CREATE INDEX IF NOT EXISTS visit_pageviews_path_idx ON visit_pageviews(path);

-- RLS: only the service role (admin) reads these tables. The /api/track
-- endpoint writes via the service-role client, so no public policies needed.
ALTER TABLE site_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_pageviews ENABLE ROW LEVEL SECURITY;
