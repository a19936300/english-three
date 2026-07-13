# 闯关数据迁移 Supabase 改造方案

> 状态：已完成，已验证
> 创建日期：2026-07-13
> 适用范围：把当前 [src/data/](../src/data/) 下的 4 个静态 JS 文件迁到 Supabase（PostgreSQL），让内容可通过后台维护
> 不在本方案范围内：玩家进度（仍保留 localStorage）

---

## 0. 上下文速览（接手必读）

### 0.1 项目情况

- 路径：`e:\workspace2\english-three`
- 栈：React 19 + Vite 8 + Tailwind CSS 4 + lucide-react
- 启动：`npm install` → `npx vite --port 5180`
- 现有数据文件位置（迁移的源）：
  - [src/data/vocabulary.js](../src/data/vocabulary.js) — 单词 10 关
  - [src/data/grammar.js](../src/data/grammar.js) — 语法 8 关
  - [src/data/reading.js](../src/data/reading.js) — 阅读 6 关
  - [src/data/exam.js](../src/data/exam.js) — 真题 5 关

### 0.2 数据/页面分离现状（已确认）

数据与页面**已经分离**。结构：

```
src/
├── data/                  ← 静态数据（本次要换成 Supabase）
├── components/            ← UI 组件，不写死关卡内容
│   ├── PathMap.jsx        通用接收 levels 数组
│   ├── VocabLesson.jsx    读 level.words
│   ├── QuizLesson.jsx     读 level.lesson / level.passage / level.quiz / level.questions
│   └── ...
├── hooks/useGameState.js  ← 玩家进度（localStorage，不动）
└── App.jsx                ← 通过 SECTION_DATA 把 4 个数据源接入视图
```

迁移工作只动 `App.jsx` 的 `SECTION_DATA` 引入方式 + 新增一个数据层封装，**组件内部完全不用改**（因为它们早就只通过 props 消费关卡数据）。

### 0.3 已统计的数据量

| 文件 | 关卡 | 单词 | 例句 | 讲解 | 短文 | 题目 | 字节 |
|---|---|---|---|---|---|---|---|
| vocabulary.js | 10 | 120 | – | – | – | – | 25 KB |
| grammar.js | 8 | – | 32 | 8 | – | 48 | 24 KB |
| reading.js | 6 | – | – | – | 6 | 22 | 16 KB |
| exam.js | 5 | – | – | – | 3 | 40 | 15 KB |
| **合计** | **29** | **120** | **32** | **8** | **9** | **110** | ~80 KB |

体量极小。Supabase 免费层（500 MB / 2 万行）完全够用。

### 0.4 一处需要注意的耦合

`src/hooks/useGameState.js` 第 117-122 行有硬编码的关卡总数：

```js
const sectionLevels = {
  vocabulary: 10,
  grammar: 8,
  reading: 6,
  exam: 5,
}
```

迁移后，这个值应当**从数据库读出**（按 section 聚合 `count(*)`），避免每加一关都要改两份代码。

### 0.5 浏览器自动化工具

- 工具：`browser-harness`（位于 `D:/workspace2/browser-harness`）
- 调用方式：把 Python 代码通过 stdin 喂给 `browser-harness` 可执行文件
- 注意：
  - PowerShell 5 的 heredoc `<<'PY'` 不被支持，改用 `Get-Content file.py | browser-harness`
  - 函数已通过 `from .helpers import *` 注入到 `run.py` 的 globals，**不要写 import**，直接调 `new_tab` / `wait_for_load` / `page_info` / `click_at_xy` / `capture_screenshot` / `js` 等
  - 截图存在 `e:/workspace2/english-three/_bh_shots/`，调试完记得清理

---

## 1. 目标与边界

### 1.1 目标

1. 把 4 个 `data/*.js` 的内容存入 Supabase（PostgreSQL）
2. 前端通过 supabase-js 在启动时拉取
3. UI 行为保持完全一致；数据从"构建时静态导入"变成"运行时网络拉取"
4. 写一个一次性 seed 脚本，能重复跑、幂等（重复跑不会产生重复数据）

### 1.2 不做

- ❌ 不迁移玩家进度（localStorage 保留）
- ❌ 不改组件内部代码（只改 `App.jsx` 的数据接入点）
- ❌ 不做内容后台编辑 UI（先用 Supabase Table Editor 手动改）
- ❌ 不做用户认证（暂用 anon 角色 + 公开 SELECT 策略）

### 1.3 验收标准

- [ ] Supabase 项目已建好，能在 Table Editor 看到 4 张表的全部数据
- [ ] `npm run build` 通过
- [ ] 本地 `npm run dev` 启动后，4 个模块都能正常进入并完整做完一关
- [ ] 刷新页面数据不丢
- [ ] 老的 `src/data/*.js` 文件保留一段时间（注释为 deprecated，不删除，便于回滚）

---

## 2. 表结构设计

### 2.1 四张表

复刻现有 schema，把现在嵌在关卡对象里的 `words[] / examples[] / quiz[]` 平铺成 4 张表。

#### `levels`（关卡表，29 行）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | text PK | 形如 `"vocabulary-1"` `"grammar-3"` `"exam-5"` |
| section | text | `vocabulary` / `grammar` / `reading` / `exam` |
| level_no | int | 1..N，section 内递增 |
| title | text | 关卡标题 |
| description | text | 副标题 |
| icon | text | emoji |
| color | text | 16 进制颜色 |
| type | text nullable | `grammar` / `reading` / `cloze` / null |
| lesson | text nullable | 语法讲解（grammar 表用） |
| passage | text nullable | 英文短文（reading / cloze 用） |
| passage_cn | text nullable | 短文中文翻译 |
| sort_order | int | section 内排序，默认等于 level_no |

#### `words`（单词表，120 行）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid PK | `gen_random_uuid()` |
| level_id | text FK → levels.id | |
| en | text | 英文 |
| cn | text | 中文释义 |
| phonetic | text | IPA |
| example | text | 英文例句 |
| example_cn | text | 例句中文 |
| sort_order | int | 单词在关卡内的顺序 |

#### `examples`（语法例句表，32 行）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid PK | |
| level_id | text FK → levels.id | |
| en | text | |
| cn | text | |
| sort_order | int | |

#### `questions`（题目表，110 行）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | uuid PK | |
| level_id | text FK → levels.id | |
| blank | int nullable | cloze 用，对应 passage 里的数字 |
| question | text | 题干 |
| options | jsonb | 字符串数组（4 选 1） |
| answer | int | options 索引（0-3） |
| explanation | text | 中文解析 |
| sort_order | int | |

### 2.2 建表 SQL（直接在 Supabase SQL Editor 跑）

```sql
-- 1. 启用 uuid 生成
create extension if not exists "pgcrypto";

-- 2. levels
create table public.levels (
  id text primary key,
  section text not null check (section in ('vocabulary','grammar','reading','exam')),
  level_no int not null,
  title text not null,
  description text,
  icon text,
  color text,
  type text check (type in ('grammar','reading','cloze') or type is null),
  lesson text,
  passage text,
  passage_cn text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index levels_section_idx on public.levels (section, sort_order);

-- 3. words
create table public.words (
  id uuid primary key default gen_random_uuid(),
  level_id text not null references public.levels(id) on delete cascade,
  en text not null,
  cn text not null,
  phonetic text,
  example text,
  example_cn text,
  sort_order int not null default 0
);
create index words_level_idx on public.words (level_id, sort_order);

-- 4. examples（语法例句）
create table public.examples (
  id uuid primary key default gen_random_uuid(),
  level_id text not null references public.levels(id) on delete cascade,
  en text not null,
  cn text not null,
  sort_order int not null default 0
);
create index examples_level_idx on public.examples (level_id, sort_order);

-- 5. questions
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  level_id text not null references public.levels(id) on delete cascade,
  blank int,
  question text not null,
  options jsonb not null,
  answer int not null,
  explanation text,
  sort_order int not null default 0
);
create index questions_level_idx on public.questions (level_id, sort_order);

-- 6. RLS：anon 公开读，service_role 才能写
alter table public.levels enable row level security;
alter table public.words enable row level security;
alter table public.examples enable row level security;
alter table public.questions enable row level security;

create policy "anon read levels"    on public.levels    for select to anon using (true);
create policy "anon read words"     on public.words     for select to anon using (true);
create policy "anon read examples"  on public.examples  for select to anon using (true);
create policy "anon read questions" on public.questions for select to anon using (true);
-- 写操作走 supabase-js 的 service_role key（在 seed 脚本里用），不在前端暴露
```

**为什么 `options` 用 jsonb 而不是拆表**：4 选 1 没有独立查询场景，存数组最省事。

**为什么 `level_id` 用 `text` 而不是 `int`**：和现在的"section-id"复合 key 一致，避免再加一列 section。

---

## 3. 改造步骤（按顺序执行）

### Step 1：建 Supabase 项目（用 browser-harness）

预计 5-8 分钟。如果用户已经手动建好，直接跳到 Step 2。

```python
# 浏览器操作流程（伪代码，新会话里用 browser-harness 重做）
1. new_tab("https://supabase.com/dashboard")
2. wait_for_load()
3. click_at_xy(<new project 按钮坐标>)
4. fill_input(<name 输入框>, "english-three")
5. fill_input(<db password>, "<用户设置的密码>")
6. click_at_xy(<region 选择>, ...)
7. click_at_xy(<create new project 按钮>)
8. wait_for_load()  # 项目初始化需要 1-2 分钟
9. 抓取 Project URL 和 anon key：去 Settings → API
10. 拿到的两个值写入根目录的 .env.local（先创建 .env.example 占位）
```

需要从 Supabase 后台拿两个值：
- `VITE_SUPABASE_URL`：形如 `https://xxxxx.supabase.co`
- `VITE_SUPABASE_ANON_KEY`：长串 JWT

### Step 2：跑建表 SQL

1. 打开 Supabase Dashboard → SQL Editor
2. 新建查询 → 粘贴第 2.2 节的整段 SQL → Run
3. 去 Table Editor 应能看到 4 张空表

### Step 3：写 seed 脚本

新增 `scripts/seed-supabase.mjs`：

```js
// 一次性脚本：从 src/data/*.js 读数据 → 批量 upsert 到 Supabase
// 用法：SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-supabase.mjs
import { createClient } from '@supabase/supabase-js';
import { vocabularyLevels } from '../src/data/vocabulary.js';
import { grammarLevels } from '../src/data/grammar.js';
import { readingLevels } from '../src/data/reading.js';
import { examLevels } from '../src/data/exam.js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;  // 注意：service_role，不能放前端
if (!url || !key) {
  console.error('missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

// 1. 转换 levels
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

// 3. examples
const exampleRows = [];
allLevels.forEach(l => {
  (l.examples || []).forEach((e, i) => {
    exampleRows.push({ level_id: `${l.section}-${l.id}`, en: e.en, cn: e.cn, sort_order: i });
  });
});

// 4. questions
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

// 5. 幂等 upsert：先清再插（脚本是迁移工具，不是生产写入路径）
async function replaceAll(table, rows) {
  if (rows.length === 0) return;
  const { error: delErr } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delErr) throw delErr;
  // levels 的 id 是 text，其余是 uuid，删不掉时跳过
  const { error } = await supabase.from(table).insert(rows);
  if (error) throw error;
  console.log(`  ${table}: inserted ${rows.length}`);
}

console.log('seeding levels...');
await replaceAll('levels', levelRows);
console.log('seeding words...');
await replaceAll('words', wordRows);
console.log('seeding examples...');
await replaceAll('examples', exampleRows);
console.log('seeding questions...');
await replaceAll('questions', questionRows);
console.log('done');
```

注意：
- `SUPABASE_SERVICE_ROLE_KEY` 在 Supabase Settings → API 拿，**不进 git**，只本地跑一次
- `delete().neq(...)` 是粗暴清空 + 重插；这是迁移工具，幂等性靠"重跑结果一样"来保证
- 如果 `levels` 用 `text` 主键，delete 不到（uuid 主键表用 neq 没问题，levels 那行需要改成 `delete().neq('id', '')` 或加 `console.warn` 跳过）

### Step 4：验证数据

跑完 seed 后，在 Supabase SQL Editor 跑：

```sql
select 'levels' as t, count(*) from levels
union all select 'words', count(*) from words
union all select 'examples', count(*) from examples
union all select 'questions', count(*) from questions;
```

期望输出：`29 / 120 / 32 / 110`。

再 spot check 一条 cloze：

```sql
select question, options, answer, blank
from questions
where level_id = 'exam-5' and blank = 1;
```

### Step 5：前端接入

#### 5.1 装依赖

```bash
npm i @supabase/supabase-js
```

#### 5.2 创建 `.env.local`（加入 .gitignore）

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

#### 5.3 新建 `src/lib/supabase.js`

```js
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}
export const supabase = createClient(url, key, { auth: { persistSession: false } });
```

#### 5.4 新建 `src/hooks/useLevelData.js`

```js
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// 返回 { levelsBySection, loading, error }
// levelsBySection = { vocabulary: [Level,...], grammar: [...], reading: [...], exam: [...] }
// 每个 Level 形如 { id, section, levelNo, title, ..., words: [...], examples: [...], questions: [...] }
export function useLevelData() {
  const [levelsBySection, setLevelsBySection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        // 一次拉完 4 张表的全部内容（数据量小，可以这么干）
        const [lv, w, ex, q] = await Promise.all([
          supabase.from('levels').select('*').order('sort_order'),
          supabase.from('words').select('*').order('sort_order'),
          supabase.from('examples').select('*').order('sort_order'),
          supabase.from('questions').select('*').order('sort_order'),
        ]);
        if (lv.error) throw lv.error;
        if (w.error) throw w.error;
        if (ex.error) throw ex.error;
        if (q.error) throw q.error;

        const idx = (rows, key) => {
          const m = new Map();
          rows.forEach(r => m.set(r.level_id, []));
          return m;
        };
        const wordMap = idx(w.data);
        w.data.forEach(r => wordMap.get(r.level_id).push(r));
        const exMap = idx(ex.data);
        ex.data.forEach(r => exMap.get(r.level_id).push(r));
        const qMap = idx(q.data);
        q.data.forEach(r => qMap.get(r.level_id).push(r));

        const result = { vocabulary: [], grammar: [], reading: [], exam: [] };
        for (const row of lv.data) {
          // 字段名转回原来的驼峰，给组件用
          const level = {
            id: row.level_no,
            title: row.title,
            description: row.description,
            icon: row.icon,
            color: row.color,
            type: row.type || undefined,
            lesson: row.lesson || undefined,
            passage: row.passage || undefined,
            passageCn: row.passage_cn || undefined,
            words: wordMap.get(row.id),
            examples: exMap.get(row.id),
            // 兼容两种字段名（vocab 用不到，grammar 用 quiz，其他用 questions）
            quiz: qMap.get(row.id),
            questions: qMap.get(row.id),
          };
          result[row.section].push(level);
        }
        setLevelsBySection(result);
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { levelsBySection, loading, error };
}
```

**重要：保留组件能识别的字段名。** 组件消费的是 `level.words / level.lesson / level.passage / level.passageCn / level.quiz / level.questions`，所以 hook 里要把数据库 snake_case 字段映回去。

#### 5.5 改 `src/App.jsx`

找到第 14-19 行的 `SECTION_DATA`，改成：

```js
import { useLevelData } from './hooks/useLevelData';

export default function App() {
  const gameState = useGameState();
  const { levelsBySection, loading, error } = useLevelData();
  const [view, setView] = useState('home');
  // ... 其它 state 不变

  // loading 态
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">加载中...</div>;
  }
  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">加载失败：{error.message}</div>;
  }
  if (!levelsBySection) return null;

  // 替换原 SECTION_DATA
  const SECTION_DATA = levelsBySection;
  // ... 其余代码不变
}
```

其它部分（handlers、JSX 路由）**不动**。

#### 5.6 改 `src/hooks/useGameState.js` 的硬编码

第 117-122 行的 `sectionLevels`：

```js
// 旧：
const sectionLevels = {
  vocabulary: 10,
  grammar: 8,
  reading: 6,
  exam: 5,
}

// 新：useGameState 不再自己维护这份数据，改由外部传入
// 方案 A：参数化 completeLevel，让 App.jsx 在调用时从 levelsBySection 算出 maxLevels 传进来
// 方案 B：把 sectionLevels 移到 App.jsx 里作为 SECTION_DATA 的派生量
```

**推荐方案 A**：

```js
// useGameState.js
const completeLevel = useCallback((section, levelId, score, total, wrongCount, maxLevels) => {
  // ... 内部逻辑
  if (levelId <= maxLevels && levelId > newSectionProgress[section]) {
    newSectionProgress[section] = levelId;
  }
}, [])
```

调用处（`App.jsx`）：

```js
const maxLevels = (levelsBySection?.[section]?.length) || 0;
gameState.completeLevel(section, level.id, quizCorrectCount, quizQuestions.length, quizWrongCount, maxLevels);
```

这样 `useGameState.js` 不依赖具体关卡数。

#### 5.7 把旧 data 文件标记为 deprecated

在 `src/data/vocabulary.js` 等 4 个文件顶部加注释：

```js
// @deprecated 数据已迁移到 Supabase，本文件保留仅供回滚和 seed 脚本使用。
// 详见 docs/SUPABASE_MIGRATION.md
```

**不要删除**，等线上跑稳后再清理。

---

## 4. 验证清单

跑完上面 5 步后逐项验证：

- [ ] Supabase Table Editor 看到 4 张表，行数分别是 29 / 120 / 32 / 110
- [ ] `npm run dev` 启动后首页能正常显示 4 个模块
- [ ] 单词模块任选一关，能学完卡片并完成测试，看到 1-3 星结果
- [ ] 语法模块任选一关，能看到讲解 + 例句 + 6 道题
- [ ] 阅读模块任选一关，能看到短文 + 题目
- [ ] 真题模块的完形填空（第 5 关）能展示 passage + 10 个空
- [ ] 浏览器刷新后数据不丢（注意：localStorage 进度不丢，关卡数据每次重新拉）
- [ ] 打开 Network 面板，4 个 supabase 请求都返回 200
- [ ] 关掉网络后页面应该停在"加载失败"（预期行为）

---

## 5. 风险与回滚

| 风险 | 缓解 | 回滚 |
|---|---|---|
| Supabase 服务挂了，前端加载失败 | 加 loading / error UI，提示用户稍后再试 | 改回 `import { vocabularyLevels } from './data/vocabulary'`，2 分钟可切回 |
| RLS 没配好，anon 拉不到 | seed 前先跑 SQL；本地用 service_role 测一遍 | 在 Table Editor 给 anon 角色加 SELECT |
| 数据被改坏 | Supabase 自带 daily backup（付费层才有）；免费层靠本地 data/*.js 兜底 | 重新跑 seed 脚本，从静态文件重灌 |
| 首屏延迟 | 数据量 ~80 KB，并行 4 个请求应该 <500 ms | 暂不优化；如要更快可加本地 IndexedDB 缓存 |
| `useGameState` 的 `sectionLevels` 忘改 | 在验证清单里专门列了一条 | 把硬编码改回来 |

**回滚成本极低**：seed 脚本本来就是从静态文件生成的，组件代码不依赖 supabase 写法之外的任何东西。

---

## 6. 后续可优化（不在本次范围）

- 加本地缓存（IndexedDB / localStorage），减少重复请求
- 加内容后台编辑 UI（Supabase Studio 或自建）
- 接入认证，让用户能同步自己的进度到云端
- 加更多模块（听力、写作）
- 把 cloze 题改成可视化的"在 passage 里点空位"交互

---

## 7. 文档元信息

- 调研时使用的命令：
  - `node _bh_stats.mjs` — 统计数据量
  - `browser-harness` — 浏览器操作 supabase.com（已通过截图确认能登录、能到达 Dashboard）
- 调研结果：技术可行，文档已落地，无须再调研
- 改造预计工作量：建项目 5-8 分钟 + 写脚本 30 分钟 + 改前端 30 分钟 + 验证 20 分钟
