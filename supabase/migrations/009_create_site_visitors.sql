-- Unique visitors (one row per device/browser identity, persists across sessions)
-- A "visitor" is identified by a stable token (localStorage) and/or fingerprint
-- hash. A "visit" (site_visits) is one browser session of that visitor.

CREATE TABLE IF NOT EXISTS site_visitors (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_token     text NOT NULL UNIQUE,
  fingerprint_hash  text,
  first_seen_at     timestamptz NOT NULL DEFAULT now(),
  last_seen_at      timestamptz NOT NULL DEFAULT now(),
  visit_count       integer NOT NULL DEFAULT 0,
  ip_hash           text,
  country           text,
  country_code      text,
  region            text,
  city              text,
  latitude          double precision,
  longitude         double precision,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS site_visitors_fingerprint_idx ON site_visitors(fingerprint_hash);
CREATE INDEX IF NOT EXISTS site_visitors_last_seen_idx ON site_visitors(last_seen_at DESC);

ALTER TABLE site_visitors ENABLE ROW LEVEL SECURITY;

-- Link each visit to its visitor + carry geo at visit-time so geo changes
-- (VPN, travel) are still visible per-session in history.
ALTER TABLE site_visits
  ADD COLUMN IF NOT EXISTS visitor_id   uuid REFERENCES site_visitors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS country      text,
  ADD COLUMN IF NOT EXISTS country_code text,
  ADD COLUMN IF NOT EXISTS region       text,
  ADD COLUMN IF NOT EXISTS city         text,
  ADD COLUMN IF NOT EXISTS latitude     double precision,
  ADD COLUMN IF NOT EXISTS longitude    double precision;

CREATE INDEX IF NOT EXISTS site_visits_visitor_id_idx ON site_visits(visitor_id);
CREATE INDEX IF NOT EXISTS site_visits_country_code_idx ON site_visits(country_code);
