-- D1: ephemeral operational diagnostic, no personal data and no credentials.
CREATE TABLE IF NOT EXISTS store_vavi_diagnostic (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  error_code TEXT,
  options_json TEXT,
  started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  finished_at TEXT
);
-- One-off probe has a fixed ID. Run only if VAVI_ONE_TIME_PROBE=true,
-- and disable this setting and remove any Cloudflare cron after inspection.
