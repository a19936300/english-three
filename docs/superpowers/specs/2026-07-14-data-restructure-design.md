# 数据重组设计：参考资料 → Supabase 结构化种子数据

> 状态：已确认 | 日期：2026-07-14

## 背景

当前 Supabase 数据为临时占位数据（29关，120词，32例句，110题）。需基于 `docs/参考资料/` 目录下 56 个 Markdown 文件（含 3500 大纲词汇、22 套真题、14 章语法、写作/听力/口试指导等）重新组织高质量种子数据。

## 方案选择

采用 **方案三：LLM 辅助结构化** — 用 LLM 批量处理 md 文件，输出结构化 JSON，人工抽查后导入。

## 目标架构

### 6 个 Section，每 Section 3 档难度

```
Section: vocabulary | grammar | reading | listening | writing | speaking
Difficulty: L1 (入门) | L2 (进阶) | L3 (冲刺)
```

- 共计 **60 关**
- 关卡 ID 格式：`{section}-{difficulty}-{level_no}`（如 `vocabulary-l1-1`）
- 6 个 section 之间独立并行解锁
- 每个 section 内线性格解锁（前一关通关解锁下一关）

## Section 详情

### 1. Vocabulary（词汇）— 15 关 / ~275 词

从 3500 大纲词汇中精选，按主题+频率+难度分级。

| 难度 | 关数 | 每关词数 | 主题 |
|------|------|---------|------|
| L1 基础 | 5 | 20 | 日常问候/家庭人物/数字时间/颜色身体/学校文具 |
| L2 核心 | 5 | 20 | 职业社会/饮食衣物/交通建筑/天气自然/情感品质 |
| L3 冲刺 | 5 | 15 | 教育学术/经济科技/环保健康/社会生活/综合高频 |

每词字段：`en / cn / phonetic / example_en / example_cn`

### 2. Grammar（语法）— 14 关

14 章语法教材 → 14 关，每关含 lesson 讲解 + 4-6 条例句 + 6 道习题。

| 难度 | 关数 | 内容 |
|------|------|------|
| L1 入门 | 5 | be动词、名词冠词、一般现在时、现在进行时、一般过去时 |
| L2 进阶 | 5 | 一般将来时、现在完成时、情态动词、被动语态、比较级最高级 |
| L3 冲刺 | 4 | 介词搭配、非谓语动词、名词性/状语从句、定语从句/主谓一致 |

### 3. Reading（阅读理解）— 8 关

从 31 套试卷精选 8 篇不同题材短文，每篇含 passage + passage_cn + 5 道理解题。

| 难度 | 关数 | 题材 |
|------|------|------|
| L1 入门 | 3 | 短对话/通知、日常生活、实用文 |
| L2 进阶 | 3 | 科普说明文、社会文化、人物故事 |
| L3 冲刺 | 2 | PETS-3 真题议论文、综合题材 |

### 4. Listening（听力）— 8 关

听力指导文档转为关卡，每关含听力策略讲解 + 场景关键词 + 文本理解题。MVP 阶段为文本理解（无音频播放）。

| 难度 | 关数 | 内容 |
|------|------|------|
| L1 入门 | 3 | 短对话：数字时间、人物身份、地点方向 |
| L2 进阶 | 3 | 长对话日常交流、故事叙述、通知播报 |
| L3 冲刺 | 2 | 综合：观点态度题、PETS-3 真题难度 |

### 5. Writing（写作）— 8 关

精选范文和模板，每关含写作技巧讲解 + 范文/模板 examples + 写作练习提示。

| 难度 | 关数 | 内容 |
|------|------|------|
| L1 入门 | 3 | 应用文格式、常用开头结尾句型、高级替换词表 |
| L2 进阶 | 3 | 邀请信/求职信、投诉信/道歉信、议论文模板 |
| L3 冲刺 | 2 | 10 篇黄金范文、100 句格言运用 |

### 6. Speaking（口试）— 7 关

口试话题模板，每关含话题简介 + 高频问答模板 examples。

| 难度 | 关数 | 内容 |
|------|------|------|
| L1 入门 | 3 | 自我介绍/家乡家庭、学习工作日常、兴趣爱好休闲 |
| L2 进阶 | 2 | 购物饮食旅行、天气健康节日 |
| L3 冲刺 | 2 | Part B 协作对话、Part C 图片描述 |

## LLM 处理流程

```
参考资料 md 文件
      │
      ▼
Step 1: 文件预处理 — 去重、按 section 分类、清洗广告
      │
      ▼
Step 2: LLM 批量提取 — 每批文件送入 LLM，输出结构化 JSON
      │
      ▼
Step 3: 人工抽查 — 抽查 20% 样本，修正错误
      │
      ▼
Step 4: 入库 — 生成 seed JSON → 运行 seed-supabase.mjs
```

### LLM 输出格式要求

严格匹配现有 Supabase 表结构：

```json
// levels 记录
{ "id": "grammar-l2-3", "section": "grammar", "level_no": 3, "title": "情态动词", ... }

// words 记录
{ "level_id": "vocabulary-l1-1", "en": "hello", "cn": "你好", "phonetic": "/həˈloʊ/", "example": "Hello, how are you?", "example_cn": "你好，你好吗？", "sort_order": 0 }

// examples 记录
{ "level_id": "grammar-l1-1", "en": "I am a student.", "cn": "我是一个学生。", "sort_order": 0 }

// questions 记录
{ "level_id": "grammar-l1-1", "question": "She ___ a nurse.", "options": ["am","is","are","be"], "answer": 1, "explanation": "第三人称单数用is", "sort_order": 0 }
```

### Prompt 核心要求

1. 输出字段必须严格匹配表结构
2. 题目难度逐步递增（L1 < L2 < L3）
3. 中文内容需翻译为自然中文
4. 严格基于参考资料，不虚构内容
5. 保留参考资料中已有的音标、例句等信息

## 表结构（不变更）

沿用现有 6 张 Supabase 表：`levels`、`words`、`examples`、`questions`、`user_answers`。

新增 section 枚举值：`listening`、`writing`、`speaking`（前端需适配）。

## 前端改动要点

| 改动项 | 说明 |
|--------|------|
| PathMap section 配置 | 新增 listening/writing/speaking 路由、颜色、图标 |
| `sectionProgress` 状态 | 扩展为 6 个 key |
| Listening lesson | MVP 复用 QuizLesson |
| Writing lesson | MVP 复用 QuizLesson，后续新增 WritingLesson |
| Speaking lesson | MVP 复用 QuizLesson，后续新增 SpeakingLesson |

## 排序与编号规则

各 section 按 difficulty asc, level_no asc 排序：

| Section | 关卡 ID 示例 | level_no 规则 |
|---------|-------------|--------------|
| vocabulary | vocabulary-l1-1 ~ vocabulary-l3-5 | 每难度独立编号从1起 |
| grammar | grammar-l1-1 ~ grammar-l3-4 | 同上 |
| reading | reading-l1-1 ~ reading-l3-2 | 同上 |
| listening | listening-l1-1 ~ listening-l3-2 | 同上 |
| writing | writing-l1-1 ~ writing-l3-2 | 同上 |
| speaking | speaking-l1-1 ~ speaking-l3-2 | 同上 |
