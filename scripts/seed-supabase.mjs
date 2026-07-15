// 一次性 seed 脚本：从 scripts/data/{section}.json 读 6 个 section 的结构化种子数据 → 写入 Supabase 4 张表
// 用法：node scripts/seed-supabase.mjs
// 数据源：scripts/data/{vocabulary,grammar,reading,listening,writing,speaking}.json
// 幂等策略：
//   - levels：upsert(onConflict='id')，主键冲突时覆盖
//   - words/examples/questions：先按 level_id 删除旧数据，再插入新数据（这些表用 uuid 主键，无自然冲突列）
// 前置条件：已在 Supabase 跑过建表 SQL + agent/supabase_migration.sql（含 difficulty 列与 section 约束放宽）

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 6 个 section（已不再包含 exam；exam 内容并入 reading）
const SECTIONS = ['vocabulary', 'grammar', 'reading', 'listening', 'writing', 'speaking'];

// === 1. 从 .env.local 加载环境变量（仅填补未设置的，不覆盖已有）===
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

// === 2. 创建 Supabase client（url/key 校验）===
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY（请在 .env.local 或环境变量中设置）');
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

// === 3. 读取单个 section 的 JSON 数据 ===
function loadSectionData(section) {
  const filePath = join(__dirname, 'data', `${section}.json`);
  const data = JSON.parse(readFileSync(filePath, 'utf-8'));
  return {
    section,
    levels: data.levels || [],
    words: data.words || [],
    examples: data.examples || [],
    questions: data.questions || [],
  };
}

// === 4. 聚合 6 个 section 的数据，并打印每 section 统计 ===
function aggregateAll() {
  const aggregated = { levels: [], words: [], examples: [], questions: [] };
  for (const section of SECTIONS) {
    const data = loadSectionData(section);
    aggregated.levels.push(...data.levels);
    aggregated.words.push(...data.words);
    aggregated.examples.push(...data.examples);
    aggregated.questions.push(...data.questions);
    console.log(
      `  ${section.padEnd(11)} 关卡 ${String(data.levels.length).padStart(2)} / 词 ${String(data.words.length).padStart(3)} / 例句 ${String(data.examples.length).padStart(3)} / 题 ${String(data.questions.length).padStart(3)}`,
    );
  }
  return aggregated;
}

// === 5. 清理旧 exam section 数据（写入前调用，防止 exam 行残留）===
async function cleanupOldExam() {
  // 查询 exam section 下的所有 level_id
  const { data: examLevels, error: selErr } = await supabase
    .from('levels')
    .select('id')
    .eq('section', 'exam');
  if (selErr) throw new Error(`查询 exam levels 失败: ${selErr.message}`);

  if (!examLevels || examLevels.length === 0) {
    console.log('  无旧 exam 数据需清理');
    return;
  }

  const examIds = examLevels.map((r) => r.id);
  // 显式删子表（兼容 FK 未带 on delete cascade 的环境）
  for (const table of ['words', 'examples', 'questions']) {
    const { error: delErr } = await supabase.from(table).delete().in('level_id', examIds);
    if (delErr) throw new Error(`清理 exam ${table} 失败: ${delErr.message}`);
  }
  // 再删 levels 本身
  const { error: delLvlErr } = await supabase.from('levels').delete().in('id', examIds);
  if (delLvlErr) throw new Error(`清理 exam levels 失败: ${delLvlErr.message}`);
  console.log(`  清理旧 exam 数据：${examIds.length} 关卡及关联子表行`);
}

// === 6. upsert levels（id 主键，可幂等覆盖）===
async function upsertLevels(rows) {
  if (rows.length === 0) {
    console.log('  levels: 跳过（无数据）');
    return;
  }
  const { error } = await supabase.from('levels').upsert(rows, { onConflict: 'id' });
  if (error) throw new Error(`levels upsert 失败: ${error.message}`);
  console.log(`  levels: 写入 ${rows.length} 行 ✓`);
}

// === 7. 替换子表数据：先按 level_id 删除旧数据，再插入新数据 ===
async function replaceChildRows(table, rows, allLevelIds) {
  if (rows.length === 0) {
    console.log(`  ${table}: 跳过（无数据）`);
    return;
  }
  // 先删除这些 level_id 下的旧数据，避免重跑产生重复行
  const { error: delErr } = await supabase.from(table).delete().in('level_id', allLevelIds);
  if (delErr) throw new Error(`${table} 清理旧数据失败: ${delErr.message}`);
  // 再插入新数据
  const { error: insErr } = await supabase.from(table).insert(rows);
  if (insErr) throw new Error(`${table} insert 失败: ${insErr.message}`);
  console.log(`  ${table}: 写入 ${rows.length} 行 ✓`);
}

// === 主流程 ===
console.log('加载 6 个 section 的种子数据...');
const aggregated = aggregateAll();

const allLevelIds = aggregated.levels.map((l) => l.id);
console.log(
  `\n总计：${aggregated.levels.length} 关 / ${aggregated.words.length} 词 / ${aggregated.examples.length} 例句 / ${aggregated.questions.length} 题`,
);

console.log('\n清理旧 exam section 数据（如存在）...');
await cleanupOldExam();

console.log('\n开始写入...');
await upsertLevels(aggregated.levels);
await replaceChildRows('words', aggregated.words, allLevelIds);
await replaceChildRows('examples', aggregated.examples, allLevelIds);
await replaceChildRows('questions', aggregated.questions, allLevelIds);
console.log('\n完成。');
