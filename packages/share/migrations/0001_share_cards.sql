-- @basenative/share — share_cards migration

CREATE TABLE IF NOT EXISTS share_cards (
  id           TEXT PRIMARY KEY,
  user_id      TEXT,
  session_id   TEXT,
  category     TEXT,
  score        INTEGER,
  won          INTEGER,
  grid         TEXT,
  payload_json TEXT,
  created_at   INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_share_cards_user    ON share_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_share_cards_session ON share_cards(session_id);
CREATE INDEX IF NOT EXISTS idx_share_cards_created ON share_cards(created_at);
