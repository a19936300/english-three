-- Tutor Agent: sessions + long-term teaching memory
-- 在已有 user_answers / levels 扩展之后执行

CREATE TABLE IF NOT EXISTS tutor_sessions (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL,
  discussion_scene JSONB NOT NULL,
  messages         JSONB NOT NULL DEFAULT '[]',
  presence_last    JSONB,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tutor_sessions_user ON tutor_sessions(user_id);

CREATE TABLE IF NOT EXISTS tutor_memory (
  id          BIGSERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL,
  kind        TEXT NOT NULL,
  content     TEXT NOT NULL,
  meta        JSONB,
  importance  SMALLINT DEFAULT 1,
  source      TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  expired_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_tutor_memory_user ON tutor_memory(user_id, kind);
