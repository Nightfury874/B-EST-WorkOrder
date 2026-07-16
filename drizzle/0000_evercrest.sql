CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS staff_outbox (
  conversation_id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  sent_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS system_logs (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  timestamp TEXT NOT NULL
);
