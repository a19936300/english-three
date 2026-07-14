-- Agent 自适应引擎所需的 Supabase 扩展

-- 1. 用户答题记录表（agent 分析数据来源）
CREATE TABLE IF NOT EXISTS user_answers (
  id          BIGSERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL,
  question_id TEXT NOT NULL,
  level_id    TEXT NOT NULL,
  section     TEXT NOT NULL,            -- vocabulary | grammar | reading | exam
  is_correct  BOOLEAN NOT NULL,
  time_spent  INTEGER,                  -- 答题耗时(秒)
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_answers_user_level
  ON user_answers(user_id, level_id);

-- 2. levels 表扩展（agent 写回调整结果）
ALTER TABLE levels ADD COLUMN IF NOT EXISTS difficulty_override FLOAT;
ALTER TABLE levels ADD COLUMN IF NOT EXISTS question_pool JSONB;  -- agent 推荐的题目 ID 列表
