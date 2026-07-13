// 一次性 seed 脚本：从 src/data/*.js 读数据 → upsert 到 Supabase 4 张表
// 用法：node scripts/seed-supabase.mjs
// 幂等：重复跑用 upsert(onConflict) 覆盖，不会产生重复数据
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { vocabularyLevels } from '../src/data/vocabulary.js';
import { grammarLevels } from '../src/data/grammar.js';
import { readingLevels } from '../src/data/reading.js';
import { examLevels } from '../src/data/exam.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 从 .env.local 加载环境变量（仅填补未设置的，不覆盖已有）
const envPath = join(__dirname, '..', '.env.local');
try {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    const k = t.substring(0, eq).trim();
    const v = t.substring(eq + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
} catch {
  // .env.local 不存在时依赖 process.env
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY（请在 .env.local 或环境变量中设置）');
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

// 1. 聚合 4 个 section 的 levels
const allLevels = [
  ...vocabularyLevels.map(l => ({ ...l, section: 'vocabulary' })),
  ...grammarLevels.map(l => ({ ...l, section: 'grammar' })),
  ...readingLevels.map(l => ({ ...l, section: 'reading' })),
  ...examLevels.map(l => ({ ...l, section: 'exam' })),
];

const levelRows = allLevels.map(l => ({
  id: `${l.section}-${l.id}`,
  section: l.section,
  level_no: l.id,
  title: l.title,
  description: l.description,
  icon: l.icon,
  color: l.color,
  type: l.type ?? null,
  lesson: l.lesson ?? null,
  passage: l.passage ?? null,
  passage_cn: l.passageCn ?? null,
  sort_order: l.id,
}));

// 2. words
const wordRows = [];
allLevels.forEach(l => {
  (l.words || []).forEach((w, i) => {
    wordRows.push({
      level_id: `${l.section}-${l.id}`,
      en: w.en, cn: w.cn, phonetic: w.phonetic,
      example: w.example, example_cn: w.exampleCn,
      sort_order: i,
    });
  });
});

// 3. examples（语法例句）
const exampleRows = [];
allLevels.forEach(l => {
  (l.examples || []).forEach((e, i) => {
    exampleRows.push({ level_id: `${l.section}-${l.id}`, en: e.en, cn: e.cn, sort_order: i });
  });
});

// 4. questions（grammar 用 quiz，reading/exam 用 questions）
const questionRows = [];
allLevels.forEach(l => {
  const qs = l.quiz || l.questions || [];
  qs.forEach((q, i) => {
    questionRows.push({
      level_id: `${l.section}-${l.id}`,
      blank: q.blank ?? null,
      question: q.question,
      options: q.options,
      answer: q.answer,
      explanation: q.explanation,
      sort_order: i,
    });
  });
});

console.log('准备写入：');
console.log(`  levels:    ${levelRows.length}`);
console.log(`  words:     ${wordRows.length}`);
console.log(`  examples:  ${exampleRows.length}`);
console.log(`  questions: ${questionRows.length}`);

// 幂等 upsert：onConflict='id' 让重复跑覆盖旧数据
async function upsertAll(table, rows) {
  if (rows.length === 0) { console.log(`  ${table}: 跳过（无数据）`); return; }
  const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
  if (error) throw new Error(`${table} upsert 失败: ${error.message}`);
  console.log(`  ${table}: 写入 ${rows.length} 行 ✓`);
}

console.log('\n开始写入...');
await upsertAll('levels', levelRows);
await upsertAll('words', wordRows);
await upsertAll('examples', exampleRows);
await upsertAll('questions', questionRows);
console.log('\n完成。');
