-- Agent 自适应引擎所需的 Supabase 扩展

-- 1. 用户答题记录表（agent 分析数据来源）
CREATE TABLE IF NOT EXISTS user_answers (
  id          BIGSERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL,
  question_id TEXT NOT NULL,
  level_id    TEXT NOT NULL,
  section     TEXT NOT NULL,            -- vocabulary | grammar | reading | listening | writing | speaking
  is_correct  BOOLEAN NOT NULL,
  time_spent  INTEGER,                  -- 答题耗时(秒)
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_answers_user_level
  ON user_answers(user_id, level_id);

-- 2. levels 表扩展（agent 写回调整结果）
ALTER TABLE levels ADD COLUMN IF NOT EXISTS difficulty_override FLOAT;
ALTER TABLE levels ADD COLUMN IF NOT EXISTS question_pool JSONB;  -- agent 推荐的题目 ID 列表

-- 3. levels 表新增 difficulty 列（6 section 重构后用于难度分组）
-- 取值：'l1' 入门 / 'l2' 进阶 / 'l3' 冲刺
ALTER TABLE levels ADD COLUMN IF NOT EXISTS difficulty TEXT;

-- 4. 清理旧 exam section 数据（必须在添加新 CHECK 约束前执行，否则约束会因 exam 行存在而失败）
-- 子表 words/examples/questions 显式删除以兼容 FK 未带 cascade 的环境
DELETE FROM words     WHERE level_id IN (SELECT id FROM levels WHERE section = 'exam');
DELETE FROM examples  WHERE level_id IN (SELECT id FROM levels WHERE section = 'exam');
DELETE FROM questions WHERE level_id IN (SELECT id FROM levels WHERE section = 'exam');
DELETE FROM levels    WHERE section = 'exam';

-- 5. 放宽 levels.section 的 CHECK 约束：移除 'exam'，新增 'listening'/'writing'/'speaking'
-- 原 schema 内联约束默认名为 levels_section_check；如曾手动改名请相应调整
ALTER TABLE levels DROP CONSTRAINT IF EXISTS levels_section_check;
ALTER TABLE levels ADD CONSTRAINT levels_section_check
  CHECK (section IN ('vocabulary','grammar','reading','listening','writing','speaking'));

-- Tutor 扩展见 supabase_migration_tutor.sql
