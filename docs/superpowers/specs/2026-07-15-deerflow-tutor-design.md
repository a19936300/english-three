# DeerFlow 个性化 AI 老师（Tutor Agent）设计

> 状态：已确认 | 日期：2026-07-15

## 背景

PETS-3 英语闯关应用当前流程：单词闪卡 / 语法讲解 / 阅读 / 选择题测验；答错后仅展示静态 `explanation`。用户在闯关中遇到「单词不会」「句子不理解」时缺少实时教学入口。

已有能力与缺口：

| 现状 | 缺口 |
|------|------|
| Python agent 为 CLI 批处理自适应（`adjust_section`） | 无在线对话能力 |
| `config.yaml` 中 DeerFlow `memory.enabled: false` | 无按用户持久化的教学记忆 |
| 前端进度在 localStorage，无稳定 `user_id` | 记忆与画像无法挂载 |
| 存在 `user_answers` 表，前端几乎不上报 | 老师读不到真实学情 |

**产品目标**：用户闯关过程中随时可问 AI 老师；老师了解当前学习场景与历史学情，做针对性讲解；具备跨会话记忆；长期与 DeerFlow Adaptive 引擎数据同源。

## 目标与非目标

### 目标

- AI 虚拟老师，对话式交互（文字 MVP）
- 随时可问：答题前 / 答题中 / 答错后 / 通关后
- 自动感知「在学什么、卡在哪」
- **答题中只提示、不直接给答案**；答完后可完整讲解
- DeerFlow agent 驱动；长期记忆按用户持久化
- Tutor（在线答疑）与 Adaptive（离线调难度）职责分离、数据同源

### 非目标（MVP / 本 spec 范围外）

- 真人老师 / 音视频直播
- MVP 语音输入输出
- 对话内直接修改关卡题池
- 完整 IM（已读、推送、多设备实时同步）

## 方案选择

采用 **方案 C：DeerFlow Tutor Agent 作为在线对话服务**（最终形态）。

| 方案 | 结论 |
|------|------|
| A. 独立轻量 Chat API | 可作过渡，但最终仍要迁到 DeerFlow + 记忆 |
| B. 纯静态增强（无 LLM） | 无法满足开放提问与个性化 |
| **C. DeerFlow agent + 记忆** | **选定**：与长期「懂用户、针对性教学」一致 |

---

## §1 目标架构

### 1.1 总览

```
┌──────────────────────────────────────────────────────────┐
│  React 闯关（Vocab / Quiz / Result）                      │
│  • 「问老师」→ TutorChat 抽屉                             │
│  • 请求：user_id + session + discussion/presence          │
└────────────────────────┬─────────────────────────────────┘
                         │ POST /tutor/chat
                         ▼
┌──────────────────────────────────────────────────────────┐
│  Tutor API（agent 进程，基于 DeerFlow）                   │
│  • 会话按 user_id + session_id 绑定                       │
│  • 人设：PETS-3 耐心中文老师                              │
│  • 防泄题：以 discussion 锚点的 can_reveal_answer 为准    │
└────────────────────────┬─────────────────────────────────┘
                         │ tools
         ┌───────────────┼────────────────┐
         ▼               ▼                ▼
  get_learning_   get/update_      Adaptive（后期）
  profile         memory           adjust / suggest
         │               │
         └───────┬───────┘
                 ▼
            Supabase
   user_answers · tutor_sessions · tutor_memory
   levels / questions
```

### 1.2 双职责

| 角色 | 触发 | 能力 |
|------|------|------|
| **Tutor（在线）** | 用户对话 | 讲解、提示、复盘；读写记忆；读画像 |
| **Adaptive（离线/异步）** | 通关后 / 定时 / CLI | 现有 `adjust_section`：难度与题池 |

同进程、不同入口；Tutor MVP **不**在对话中调用 `adjust_section`。

### 1.3 记忆三层

1. **讨论锚点（session）**：本轮对话在讲什么 → `tutor_sessions.discussion_scene`
2. **学习画像（可计算）**：答题记录 → 正确率、薄弱点
3. **教学记忆（长期）**：偏好、弱项备注、里程碑 → `tutor_memory`

DeerFlow 文件型 `memory.json` 仅供本地调试；**产品级记忆一律按 `user_id` 存 Supabase**。

### 1.4 身份前提

- MVP：设备级匿名 `user_id`（localStorage UUID）
- 答题上报与 Tutor 共用同一 `user_id`
- 后期登录：匿名 ID 与账号 merge；表结构始终以 `user_id` 为键

---

## §2 前端交互与上下文协议

### 2.1 用户可见交互

| 元素 | 行为 |
|------|------|
| 悬浮入口 | 关卡 / 结果页「问老师」（首页/地图可选） |
| TutorChat 抽屉 | 底部面板：消息列表 + 输入 + 快捷问题 |
| 上下文条 | 展示当前讨论对象摘要（来自 discussion 锚点） |
| 快捷问题 | 随场景变化，如「怎么记？」「语法结构？」「给个提示」 |
| 不打断闯关 | 打开抽屉保留底层关卡状态 |

会话策略：同一用户可多 `session_id`；「新话题」开新 session；「讲当前这题」对当前 UI 做 `discussion.bind: set`。

### 2.2 `user_id`

```
首次打开 → crypto.randomUUID() → localStorage `pets3_user_id`
之后一律读取同一 ID
```

落地：`src/hooks/useUserId.js`（或并入 `useGameState`）；App 启动即确保就绪。

### 2.3 实时上下文：TutorScene Context

关卡内部状态（`phase` / `currentIdx` / `feedback`）通过 Context 上报，供 presence 与「绑定讨论」使用。

```
App
 └─ TutorProvider (userId + presenceScene + setPresenceScene)
      ├─ App 按 view 写粗粒度 presence
      ├─ VocabLesson / QuizLesson / Result 写细粒度 presence
      └─ TutorChat 读取 userId + presence；发送时处理 discussion
```

**presence scene 字段**

| 字段 | 含义 |
|------|------|
| `surface` | `home` / `path` / `lesson` / `result` |
| `section` | `vocabulary` / `grammar` / … |
| `level_id` / `level_title` | 关卡 |
| `phase` | `learn` / `quiz` / `lesson` / `passage` 等 |
| `item_index` / `item_total` | 进度 |
| `content` | 当前内容最小集（见下） |
| `answer_state` | `unanswered` / `answered_correct` / `answered_wrong` |
| `can_reveal_answer` | 是否允许完整答案/解析 |
| `updated_at` | 时间戳 |

**`can_reveal_answer` 规则**

```
true  当：surface === 'result'
        或 phase 为 learn / lesson / passage（学习/讲解/读文）
        或 phase === 'quiz' 且 answer_state !== 'unanswered'
false 当：测验已展示选项但尚未提交答案
```

**content 约定**

- 单词学习：`{ type: 'word', en, cn?, phonetic, example?, example_cn? }`
- 单词测验未作答：`{ type: 'vocab_quiz', word, options }` — **不含**正确答案
- 测验已作答：可附带 `answer` / `explanation`
- 语法/阅读题：`{ type: 'quiz', question, options, … }` — 同样按作答状态控制答案字段
- 阅读文：`{ type: 'passage', passage_excerpt, … }`；全文可按 `level_id` 服务端补拉

presence **不**持久化到 localStorage（避免脏缓存与剧透）。

### 2.4 Discussion 锚点 + Presence（多轮协议）

**问题**：每条消息都带「最新完整 scene」会导致 UI 滑走后答非所问，且浪费 token。

**原则**

| 概念 | 含义 | 多轮行为 |
|------|------|----------|
| **discussion** | 本轮对话讨论对象 | 绑定后保持稳定 |
| **presence** | 用户界面当前所在 | 可每轮轻量更新，**不覆盖** discussion |

**何时 `discussion.bind: "set"`**

- 打开抽屉后第一条消息（若无 session 锚点）
- 用户点「新话题」
- 用户点「讲当前这题/这个词」
- 新 `session_id`
- 可选：关闭抽屉超过 N 分钟再打开 → 新 session

**不要**在用户只是滑到下一词/下一题、但仍在聊上一题时自动 rebind。

**请求体：首条或 rebind**

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "session_id": "sess-abc",
  "message": "这个单词有什么记忆技巧？",
  "discussion": {
    "bind": "set",
    "scene": {
      "surface": "lesson",
      "section": "vocabulary",
      "level_id": "vocabulary-3",
      "level_title": "核心词汇 · 第三关",
      "phase": "learn",
      "item_index": 1,
      "item_total": 10,
      "answer_state": "unanswered",
      "can_reveal_answer": true,
      "content": {
        "type": "word",
        "en": "achieve",
        "phonetic": "/əˈtʃiːv/",
        "cn": "实现",
        "example": "You can achieve your goals.",
        "example_cn": "你可以实现你的目标。"
      }
    }
  },
  "presence": {
    "surface": "lesson",
    "section": "vocabulary",
    "level_id": "vocabulary-3",
    "phase": "learn",
    "item_index": 1
  }
}
```

**请求体：同会话后续轮次**

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "session_id": "sess-abc",
  "message": "再举一个例句",
  "discussion": { "bind": "keep" },
  "presence": {
    "surface": "lesson",
    "level_id": "vocabulary-3",
    "phase": "learn",
    "item_index": 2
  }
}
```

**服务端**

- `bind: set` → 写入 `session.discussion_scene`
- `bind: keep` → 使用已存锚点；无锚点则 400，提示客户端 rebind
- 回答内容 **以 discussion_scene 为准**
- presence 与锚点位置不一致时，可轻提示「界面已换」，**默认仍讲锚点**
- 防泄题看 **discussion 绑定场景的 `can_reveal_answer`**

**响应（MVP 可非 stream）**

```json
{
  "reply": "……",
  "session_id": "sess-abc",
  "memory_updated": false
}
```

### 2.5 前端改动面

| 位置 | 改动 |
|------|------|
| `App.jsx` | `TutorProvider`；挂载 `TutorChat`；粗粒度 presence |
| `VocabLesson.jsx` / `QuizLesson.jsx` | 同步细粒度 presence |
| `ResultScreen.jsx` | result 摘要 presence |
| 新 `hooks/useUserId.js` | 匿名 ID |
| 新 `context/TutorContext.jsx` | Provider |
| 新 `components/TutorChat.jsx` | 抽屉 UI + 发送逻辑 |
| 新 `lib/tutorApi.js` | `postTutorChat` |

---

## §3 记忆模型与 Agent 工具

### 3.1 数据表

**`tutor_sessions`**

```sql
CREATE TABLE tutor_sessions (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL,
  discussion_scene JSONB NOT NULL,
  messages         JSONB NOT NULL DEFAULT '[]',
  presence_last    JSONB,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_tutor_sessions_user ON tutor_sessions(user_id);
```

**`tutor_memory`**

```sql
CREATE TABLE tutor_memory (
  id          BIGSERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL,
  kind        TEXT NOT NULL,       -- preference | weak_point | note | milestone
  content     TEXT NOT NULL,
  meta        JSONB,
  importance  SMALLINT DEFAULT 1, -- 1-5
  source      TEXT,               -- agent | system
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  expired_at  TIMESTAMPTZ
);
CREATE INDEX idx_tutor_memory_user ON tutor_memory(user_id, kind);
```

**记忆 kind 示例**

| kind | 示例 |
|------|------|
| `preference` | 喜欢先中文后英文 |
| `weak_point` | 被动语态经常错 |
| `note` | achieve 易与 receive 混淆 |
| `milestone` | 词汇已到第 5 关 |

不写：整段聊天、完整题干、敏感信息。聊天在 `tutor_sessions.messages`；统计靠 `user_answers`。

沿用现有 **`user_answers`**；前端需补上报。

### 3.2 Agent 工具

| 工具 | 阶段 | 作用 |
|------|------|------|
| `get_learning_profile` | Phase 2 | 正确率、近 N 错题、薄弱 level |
| `get_memory` | Phase 2 | 按 importance + 新近取长期记忆 |
| `update_memory` | Phase 2 | 写入/合并教学记忆 |
| `get_level_content` | Phase 3 | 按 level/question 补全内容 |
| `search_weak_items` | Phase 3+ | 错题聚焦 |
| Adaptive 类 tool | Phase 4 | 如 suggest_practice；默认不改题池 |

Phase 1 仅依赖 **discussion_scene + 对话历史** 作答，不强制 tool。

### 3.3 单轮处理流程

```
POST /tutor/chat
  1. 校验 user_id
  2. 加载或创建 session
  3. discussion bind set/keep
  4. 更新 presence_last（可选）
  5. append user message
  6. DeerFlow：system（人设+防泄题+discussion+presence 提示）+ tools
  7. append assistant reply
  8. 返回 reply / session_id / memory_updated
```

**防泄题**：`discussion_scene.can_reveal_answer === false` 时 system 禁止给出选项字母/标准答案；输出侧规则检测为二期加强。

**记忆写入**：非每轮必写；适合偏好、反复弱项、掌握备注；同标签 weak_point 去重；可设每日写入上限。

### 3.4 Prompt 注入优先级（控 token）

1. 人设 + 防泄题（短）
2. discussion_scene（必给）
3. presence 一行（不一致时注明）
4. memory 最多约 10 条
5. profile 摘要 + 最多 5 条近错题
6. 最近 K 轮 messages（如 10–20）

禁止把全量 `user_answers` 塞进 prompt。

### 3.5 代码落点

| 模块 | 职责 |
|------|------|
| `agent_english/adapters/supabase.py` | session / memory / profile |
| `agent_english/tutor/`（新） | API、session 状态机、prompt、防泄题 |
| `agent_english/tutor/tools.py` | DeerFlow tools |
| `agent_english/analyzers/progress.py` | 复用为 profile |
| `agent_english/main.py` | 保留 adjust CLI；Tutor 另入口（HTTP serve） |

---

## §4 分阶段交付与错误处理

### 4.1 阶段

#### Phase 0 — 地基

- 匿名 `user_id`
- `user_answers` 上报
- TutorScene presence Context
- `tutor_sessions` / `tutor_memory` migration

**完成标准**：无 LLM 时协议与表结构可独立验收。

#### Phase 1 — MVP 在线老师

- `POST /tutor/chat`（bind set/keep + presence）
- DeerFlow Tutor 人设 + 防泄题（**可不接 profile/memory 工具**，凭 discussion 讲解）
- TutorChat 抽屉（多轮、快捷问题、新话题、讲当前）
- 入口：lesson + result

**完成标准**：随时对话；多轮不因 UI 滑动跑题；未作答不泄题。

**不做**：语音、流式、改题池、跨设备完整历史、长期记忆工具。

#### Phase 2 — 记忆与画像

- 三工具落地与注入策略
- 记忆治理（去重、上限、importance）
- 冷启动不编造历史

**完成标准**：有答题数据后会提到薄弱点；隔天新会话仍记得偏好/弱项。

#### Phase 3 — 体验加固

- 流式输出
- `get_level_content`
- 可选会话恢复
- 防泄题输出检测
- 限流配额

#### Phase 4 — Adaptive 协同

- 通关后异步 `adjust_section`
- 可选 `suggest_practice`
- 登录账号 merge

**默认首个可合并里程碑：Phase 0 + 1；Phase 2 紧随。**

### 4.2 错误处理

#### 前端

| 情况 | 处理 |
|------|------|
| 网络/5xx | 错误条 + 重试；不关抽屉、不丢已展示消息 |
| 缺锚点 400 | 引导「讲当前这题」rebind |
| 超时 | 可取消；友好提示 |
| 发送中 | 禁用连点；`pending` / `sent` / `failed` |
| 空回复 | 兜底文案 + 重试 |

#### 后端

| 情况 | 处理 |
|------|------|
| 无 user_id | 400 |
| keep 无 session/锚点 | 400 |
| set 无 scene | 400 |
| session 与 user 不匹配 | 403 |
| Supabase 读失败 | 降级：仅 discussion 仍可答 |
| Supabase 写 session 失败 | 重试/500，避免 silent 丢会话 |
| update_memory 失败 | 仍返回 reply，`memory_updated: false` |
| LLM 异常 | 502，不暴露 stack |
| 限流 | 429 + Retry-After |

#### 防泄题

- 强要答案且 `can_reveal=false`：正常生成提示型回复（非 4xx）
- 二期：输出检测泄露则替换为安全提示

### 4.3 测试要点

| 层 | 关注 |
|----|------|
| 协议 | set/keep；presence 与 discussion 不一致不自动换题 |
| 防泄题 | 未作答要答案 → 不给标准答案/选项字母 |
| 记忆 | update 后新 session 可读 |
| 画像 | 有 answers 时 profile 合理 |
| UI | 开抽屉不重置关卡；失败可重试 |
| 回归 | 闯关/体力/通关不受影响 |

### 4.4 实施顺序

```
Phase 0 地基 → Phase 1 MVP 对话 → Phase 2 记忆画像 → Phase 3 体验 → Phase 4 Adaptive
```

---

## 成功标准（整体）

1. 用户在任意关卡阶段可打开老师并获得与**讨论锚点**相关的讲解
2. 多轮追问连贯，不因界面滑到下一题而答非所问（除非显式「讲当前」）
3. 测验未提交时老师不直接给出答案
4. 有学习数据与记忆后，教学体现个性化（弱项/偏好）
5. Adaptive 与 Tutor 数据同源、入口分离，互不拖垮

## 开放项（实现计划阶段再定细节）

- Tutor HTTP 具体框架（FastAPI / 其他）与部署形态
- Stream 协议细节（SSE vs 其他）
- 匿名用户与正式账号 merge 的精确流程
- 日调用配额与商业策略

以上不影响 Phase 0–1 启动；在 writing-plans 中选定默认即可。
