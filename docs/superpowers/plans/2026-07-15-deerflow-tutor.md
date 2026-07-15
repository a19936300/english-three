# DeerFlow 个性化 AI 老师 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在闯关流程中提供 DeerFlow 驱动的文字 AI 老师：随时可问、discussion 锚点多轮不跑偏、答题中防泄题；并为 Phase 2 记忆/画像预留表结构与接口。

**Architecture:** React 通过 `TutorProvider` 上报 presence，`TutorChat` 以 `discussion.bind=set|keep` 调用 `POST /tutor/chat`。Python 侧用 FastAPI 暴露 Tutor API，会话与锚点存 Supabase（Phase 1 可用内存 store 做本地开发，接口与 Supabase adapter 对齐）；DeerFlowClient 生成回复。Adaptive CLI 保持独立入口。

**Tech Stack:** React 19 + Vite；FastAPI + uvicorn；DeerFlow (`DeerFlowClient`)；Supabase；pytest。

**Spec:** [docs/superpowers/specs/2026-07-15-deerflow-tutor-design.md](../specs/2026-07-15-deerflow-tutor-design.md)

## Global Constraints

- 多轮对话使用 **discussion 锚点 + 轻量 presence**；禁止每条消息用最新 UI scene 覆盖讨论对象。
- 防泄题以 **discussion 的 `can_reveal_answer`** 为准；未作答测验不得直接给标准答案/选项字母。
- Tutor MVP（本计划 Task 1–9）**不**接 `get_learning_profile` / memory tools；Phase 2（Task 10–11）再接。
- Tutor 与 Adaptive **分入口**；对话中不调用 `adjust_section`。
- `user_id`：localStorage 匿名 UUID（键名 `pets3_user_id`）。
- 首个可合并里程碑 = Phase 0 + Phase 1（Task 1–9）；Phase 2 = Task 10–11。
- 开放项默认：HTTP = **FastAPI**；MVP **非 stream**；LLM = **`DeerFlowClient.chat`**。

---

## File Structure

| 路径 | 职责 |
|------|------|
| `agent/supabase_migration_tutor.sql` | `tutor_sessions` / `tutor_memory` DDL |
| `agent/agent_english/tutor/__init__.py` | 包标记 |
| `agent/agent_english/tutor/models.py` | 请求/响应 Pydantic 模型 |
| `agent/agent_english/tutor/session_store.py` | 会话 CRUD 抽象 + 内存实现 |
| `agent/agent_english/tutor/prompt.py` | system prompt + 防泄题文案 |
| `agent/agent_english/tutor/llm.py` | DeerFlow 调用封装 |
| `agent/agent_english/tutor/service.py` | 单轮 chat 业务编排 |
| `agent/agent_english/tutor/api.py` | FastAPI app 与路由 |
| `agent/agent_english/tutor/tools.py` | Phase 2：profile/memory tools |
| `agent/agent_english/adapters/supabase.py` | 扩展 session/memory/answers（Phase 0–2） |
| `agent/tests/test_tutor_session.py` | 会话 bind 逻辑测试 |
| `agent/tests/test_tutor_prompt.py` | 防泄题 prompt 测试 |
| `agent/tests/test_tutor_service.py` | 服务编排测试（mock LLM） |
| `agent/tests/test_tutor_api.py` | HTTP 集成测试（TestClient） |
| `src/hooks/useUserId.js` | 匿名 user_id |
| `src/lib/tutorScene.js` | `canRevealAnswer` 与 scene 构造纯函数 |
| `src/lib/reportAnswer.js` | 上报 `user_answers` |
| `src/lib/tutorApi.js` | `postTutorChat` |
| `src/context/TutorContext.jsx` | presence + userId Provider |
| `src/components/TutorChat.jsx` | 抽屉 UI |
| `src/App.jsx` | 挂载 Provider / TutorChat / 粗粒度 presence |
| `src/components/VocabLesson.jsx` | 细粒度 presence + 答题上报 |
| `src/components/QuizLesson.jsx` | 同上 |
| `src/components/ResultScreen.jsx` | result presence |
| `vite.config.js` | dev 代理 `/tutor` → backend |
| `.env.example`（前端若有）/ `agent/.env.example` | `VITE_TUTOR_API_URL` 等 |

---

### Task 1: Supabase migration（tutor 表）

**Files:**
- Create: `agent/supabase_migration_tutor.sql`
- Modify: `agent/supabase_migration.sql`（文件头注释指向新 migration，避免重复粘贴大段 DDL）

**Interfaces:**
- Produces: 表 `tutor_sessions`、`tutor_memory`（列与 spec §3.1 一致）

- [ ] **Step 1: 写入 migration 文件**

```sql
-- agent/supabase_migration_tutor.sql
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
```

- [ ] **Step 2: 在 `agent/supabase_migration.sql` 末尾加注释**

```sql
-- Tutor 扩展见 supabase_migration_tutor.sql
```

- [ ] **Step 3: Commit**

```bash
git add agent/supabase_migration_tutor.sql agent/supabase_migration.sql
git commit -m "chore(db): add tutor_sessions and tutor_memory migration"
```

---

### Task 2: 前端匿名 `user_id`

**Files:**
- Create: `src/hooks/useUserId.js`
- Modify: `src/App.jsx`（后续 Task 7 再挂 Provider；本任务仅加 hook 文件，可用临时验证）

**Interfaces:**
- Produces: `ensureUserId(): string`、`useUserId(): string`
- Storage key: `pets3_user_id`

- [ ] **Step 1: 实现 hook**

```js
// src/hooks/useUserId.js
import { useState } from 'react';

const STORAGE_KEY = 'pets3_user_id';

export function ensureUserId() {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    // private mode / blocked storage — ephemeral id for session
    if (!globalThis.__pets3EphemeralUserId) {
      globalThis.__pets3EphemeralUserId = crypto.randomUUID();
    }
    return globalThis.__pets3EphemeralUserId;
  }
}

export function useUserId() {
  const [userId] = useState(() => ensureUserId());
  return userId;
}
```

- [ ] **Step 2: 浏览器手动验证**

Run: `npm run dev`，控制台执行：
```js
// 在应用加载后
localStorage.getItem('pets3_user_id')
```
Expected: 非空 UUID；刷新后不变。

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useUserId.js
git commit -m "feat(frontend): add anonymous pets3_user_id hook"
```

---

### Task 3: `canRevealAnswer` 与 scene 纯函数

**Files:**
- Create: `src/lib/tutorScene.js`

**Interfaces:**
- Produces:
  - `canRevealAnswer({ surface, phase, answerState }): boolean`
  - `buildPresenceScene(partial): object`（补 `updatedAt`）

- [ ] **Step 1: 实现（规则与 spec §2.3 一致）**

```js
// src/lib/tutorScene.js

/**
 * @param {{ surface?: string, phase?: string, answerState?: string }} s
 */
export function canRevealAnswer(s = {}) {
  const { surface, phase, answerState } = s;
  if (surface === 'result') return true;
  if (phase === 'learn' || phase === 'lesson' || phase === 'passage') return true;
  if (phase === 'quiz' && answerState && answerState !== 'unanswered') return true;
  return false;
}

/**
 * @param {Record<string, unknown>} partial
 */
export function buildPresenceScene(partial = {}) {
  const scene = {
    surface: partial.surface ?? 'home',
    section: partial.section ?? null,
    level_id: partial.levelId ?? partial.level_id ?? null,
    level_title: partial.levelTitle ?? partial.level_title ?? null,
    phase: partial.phase ?? null,
    item_index: partial.itemIndex ?? partial.item_index ?? null,
    item_total: partial.itemTotal ?? partial.item_total ?? null,
    content: partial.content ?? null,
    answer_state: partial.answerState ?? partial.answer_state ?? 'unanswered',
    updated_at: Date.now(),
  };
  scene.can_reveal_answer = canRevealAnswer({
    surface: scene.surface,
    phase: scene.phase,
    answerState: scene.answer_state,
  });
  return scene;
}

/** Snapshot for discussion.bind=set — deep-ish copy of presence fields. */
export function snapshotDiscussionScene(presenceScene) {
  return JSON.parse(JSON.stringify(presenceScene));
}
```

- [ ] **Step 2: 用 Node 快速断言（无 vitest 时）**

Run from repo root (PowerShell):

```powershell
node --input-type=module -e "
import { canRevealAnswer } from './src/lib/tutorScene.js';
const assert = (c,m)=>{ if(!c) throw new Error(m); };
assert(canRevealAnswer({surface:'result'})===true, 'result');
assert(canRevealAnswer({phase:'learn'})===true, 'learn');
assert(canRevealAnswer({phase:'quiz', answerState:'unanswered'})===false, 'quiz open');
assert(canRevealAnswer({phase:'quiz', answerState:'answered_wrong'})===true, 'quiz done');
console.log('ok');
"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add src/lib/tutorScene.js
git commit -m "feat(frontend): add tutor scene helpers and canRevealAnswer"
```

---

### Task 4: 答题上报 `user_answers`

**Files:**
- Create: `src/lib/reportAnswer.js`
- Modify: `src/components/VocabLesson.jsx`（在 `handleAnswer` 成功判定后调用）
- Modify: `src/components/QuizLesson.jsx`（同上）
- Modify: `src/hooks/useUserId.js` 已存在 — 上报时用 `ensureUserId()`

**Interfaces:**
- Produces: `reportAnswer({ questionId, levelId, section, isCorrect, timeSpent? }): Promise<void>`
- Consumes: `supabase` from `src/lib/supabase.js`；表 `user_answers`（已有 migration）

- [ ] **Step 1: 实现上报（失败只 log，不阻断闯关）**

```js
// src/lib/reportAnswer.js
import { supabase } from './supabase.js';
import { ensureUserId } from '../hooks/useUserId.js';

/**
 * @param {{
 *  questionId: string,
 *  levelId: string|number,
 *  section: string,
 *  isCorrect: boolean,
 *  timeSpent?: number|null
 * }} p
 */
export async function reportAnswer(p) {
  const user_id = ensureUserId();
  const row = {
    user_id,
    question_id: String(p.questionId),
    level_id: String(p.levelId),
    section: p.section,
    is_correct: !!p.isCorrect,
    time_spent: p.timeSpent ?? null,
  };
  try {
    const { error } = await supabase.from('user_answers').insert(row);
    if (error) console.warn('[reportAnswer]', error.message);
  } catch (e) {
    console.warn('[reportAnswer]', e);
  }
}
```

- [ ] **Step 2: 在 QuizLesson `handleAnswer` 末尾上报**

在 `setFeedback` / 计分之后增加（注意：词汇 quiz 的 question id 可用 `${level.id}-q-${quizIdx}` 或题库真实 id；若题目无 `id` 字段，使用稳定合成 id）：

```js
import { reportAnswer } from '../lib/reportAnswer';

// inside handleAnswer, after knowing `correct`:
void reportAnswer({
  questionId: q.id || `${level.id}-q-${currentIdx}`,
  levelId: level.id,
  section,
  isCorrect: correct,
});
```

`VocabLesson` 的 quiz 阶段同理：`section: 'vocabulary'`，`questionId: \`${level.id}-vocab-${quizIdx}\``。

- [ ] **Step 3: 手动验证**

通关答 1 题后在 Supabase Table Editor 看 `user_answers` 是否新增行。若 RLS 拦截：为 `user_answers` 增加 anon insert 策略，或临时用 service 调试；计划默认：

```sql
-- 若 insert 失败，在 Supabase SQL 执行（按项目安全策略收紧）
ALTER TABLE user_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon insert answers" ON user_answers FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon select own" ON user_answers FOR SELECT TO anon USING (true);
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/reportAnswer.js src/components/QuizLesson.jsx src/components/VocabLesson.jsx
git commit -m "feat(frontend): report quiz answers to user_answers"
```

---

### Task 5: Tutor session store + 协议状态机（后端）

**Files:**
- Create: `agent/agent_english/tutor/__init__.py`
- Create: `agent/agent_english/tutor/models.py`
- Create: `agent/agent_english/tutor/session_store.py`
- Create: `agent/tests/test_tutor_session.py`

**Interfaces:**
- Produces:
  - `InMemorySessionStore.get/create/update`
  - `apply_discussion(store, user_id, session_id, discussion) -> (session, error_code|None)`
  - error codes: `missing_user`, `missing_scene`, `session_not_found`, `forbidden`, `missing_anchor`

- [ ] **Step 1: 写失败测试**

```python
# agent/tests/test_tutor_session.py
import pytest
from agent_english.tutor.session_store import InMemorySessionStore, apply_discussion


def test_bind_set_creates_session():
    store = InMemorySessionStore()
    scene = {"level_id": "vocabulary-1", "can_reveal_answer": True, "content": {"type": "word", "en": "hi"}}
    sess, err = apply_discussion(
        store,
        user_id="u1",
        session_id="s1",
        discussion={"bind": "set", "scene": scene},
    )
    assert err is None
    assert sess["id"] == "s1"
    assert sess["user_id"] == "u1"
    assert sess["discussion_scene"]["content"]["en"] == "hi"


def test_bind_keep_without_session_fails():
    store = InMemorySessionStore()
    sess, err = apply_discussion(
        store, user_id="u1", session_id="s-missing", discussion={"bind": "keep"}
    )
    assert sess is None
    assert err == "session_not_found"


def test_bind_keep_reuses_anchor():
    store = InMemorySessionStore()
    scene = {"level_id": "vocabulary-1", "can_reveal_answer": False}
    apply_discussion(store, "u1", "s1", {"bind": "set", "scene": scene})
    sess, err = apply_discussion(store, "u1", "s1", {"bind": "keep"})
    assert err is None
    assert sess["discussion_scene"]["can_reveal_answer"] is False


def test_bind_keep_wrong_user_forbidden():
    store = InMemorySessionStore()
    apply_discussion(store, "u1", "s1", {"bind": "set", "scene": {"x": 1}})
    sess, err = apply_discussion(store, "u2", "s1", {"bind": "keep"})
    assert err == "forbidden"


def test_bind_set_requires_scene():
    store = InMemorySessionStore()
    sess, err = apply_discussion(store, "u1", "s1", {"bind": "set"})
    assert err == "missing_scene"
```

- [ ] **Step 2: Run 确认失败**

```bash
cd agent
pytest tests/test_tutor_session.py -v
```

Expected: FAIL（import / 未定义）

- [ ] **Step 3: 最小实现**

```python
# agent/agent_english/tutor/__init__.py
"""DeerFlow Tutor Agent — online teaching chat."""

# agent/agent_english/tutor/models.py
from __future__ import annotations
from typing import Any, Literal
from pydantic import BaseModel, Field


class Discussion(BaseModel):
    bind: Literal["set", "keep"]
    scene: dict[str, Any] | None = None


class TutorChatRequest(BaseModel):
    user_id: str
    message: str
    session_id: str | None = None
    discussion: Discussion
    presence: dict[str, Any] | None = None


class TutorChatResponse(BaseModel):
    reply: str
    session_id: str
    memory_updated: bool = False


# agent/agent_english/tutor/session_store.py
from __future__ import annotations
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class InMemorySessionStore:
    def __init__(self) -> None:
        self._sessions: dict[str, dict[str, Any]] = {}

    def get(self, session_id: str) -> dict[str, Any] | None:
        s = self._sessions.get(session_id)
        return deepcopy(s) if s else None

    def save(self, session: dict[str, Any]) -> dict[str, Any]:
        session = deepcopy(session)
        session["updated_at"] = _now()
        self._sessions[session["id"]] = session
        return deepcopy(session)

    def create(
        self,
        *,
        session_id: str | None,
        user_id: str,
        discussion_scene: dict[str, Any],
    ) -> dict[str, Any]:
        sid = session_id or str(uuid4())
        sess = {
            "id": sid,
            "user_id": user_id,
            "discussion_scene": deepcopy(discussion_scene),
            "messages": [],
            "presence_last": None,
            "created_at": _now(),
            "updated_at": _now(),
        }
        return self.save(sess)


def apply_discussion(
    store: InMemorySessionStore,
    user_id: str,
    session_id: str | None,
    discussion: dict[str, Any] | None,
) -> tuple[dict[str, Any] | None, str | None]:
    if not user_id:
        return None, "missing_user"
    if not discussion or "bind" not in discussion:
        return None, "missing_scene"

    bind = discussion.get("bind")
    if bind == "set":
        scene = discussion.get("scene")
        if not scene:
            return None, "missing_scene"
        if session_id:
            existing = store.get(session_id)
            if existing and existing["user_id"] != user_id:
                return None, "forbidden"
            if existing:
                existing["discussion_scene"] = deepcopy(scene)
                return store.save(existing), None
        return store.create(
            session_id=session_id, user_id=user_id, discussion_scene=scene
        ), None

    if bind == "keep":
        if not session_id:
            return None, "session_not_found"
        existing = store.get(session_id)
        if not existing:
            return None, "session_not_found"
        if existing["user_id"] != user_id:
            return None, "forbidden"
        if not existing.get("discussion_scene"):
            return None, "missing_anchor"
        return existing, None

    return None, "missing_scene"
```

- [ ] **Step 4: Run 测试通过**

```bash
cd agent
pytest tests/test_tutor_session.py -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add agent/agent_english/tutor agent/tests/test_tutor_session.py
git commit -m "feat(tutor): session store with discussion bind set/keep"
```

---

### Task 6: Prompt 组装与防泄题

**Files:**
- Create: `agent/agent_english/tutor/prompt.py`
- Create: `agent/tests/test_tutor_prompt.py`

**Interfaces:**
- Produces: `build_system_prompt(discussion_scene, presence) -> str`
- Produces: `build_user_payload(message, discussion_scene, presence) -> str`

- [ ] **Step 1: 失败测试**

```python
# agent/tests/test_tutor_prompt.py
from agent_english.tutor.prompt import build_system_prompt


def test_prompt_forbids_answer_when_cannot_reveal():
    scene = {
        "phase": "quiz",
        "can_reveal_answer": False,
        "content": {"type": "quiz", "question": "What is X?", "options": ["A", "B"]},
    }
    text = build_system_prompt(scene, presence=None)
    assert "禁止" in text or "不要" in text
    assert "can_reveal_answer=false" in text.lower() or "不可泄露答案" in text


def test_prompt_allows_full_explain_when_can_reveal():
    scene = {"phase": "learn", "can_reveal_answer": True, "content": {"type": "word", "en": "cat"}}
    text = build_system_prompt(scene, None)
    assert "可以完整讲解" in text or "允许完整" in text
```

- [ ] **Step 2: Run 确认失败**

```bash
cd agent
pytest tests/test_tutor_prompt.py -v
```

- [ ] **Step 3: 实现**

```python
# agent/agent_english/tutor/prompt.py
from __future__ import annotations
import json
from typing import Any


PERSONA = """你是 PETS-3（全国英语等级考试三级）学习应用中的耐心中文老师。
用简洁、鼓励的中文回答；需要时给出英文例句。
教学针对「当前讨论对象」（discussion），不要被用户界面当前位置（presence）带跑；
若 presence 与 discussion 不一致，可一句带过「你界面已换到别处，我们先继续刚才的内容」，默认仍讲 discussion。
"""


def build_system_prompt(
    discussion_scene: dict[str, Any],
    presence: dict[str, Any] | None,
) -> str:
    can_reveal = bool(discussion_scene.get("can_reveal_answer"))
    if can_reveal:
        leak_rules = (
            "防泄题：can_reveal_answer=true。可以完整讲解含义、解析与正确答案。"
        )
    else:
        leak_rules = (
            "防泄题：can_reveal_answer=false（测验未提交）。"
            "禁止直接给出标准答案、正确选项字母（A/B/C/D）或「选 X」。"
            "只给思路、词汇提示、排除干扰项的方法。用户强要答案时仍只提示。不可泄露答案。"
        )

    disc = json.dumps(discussion_scene, ensure_ascii=False, indent=2)
    pres = json.dumps(presence or {}, ensure_ascii=False)
    return (
        f"{PERSONA}\n{leak_rules}\n\n"
        f"## discussion（本轮讨论锚点，必遵从）\n{disc}\n\n"
        f"## presence（界面位置，仅供参考）\n{pres}\n"
    )


def build_user_payload(message: str) -> str:
    return message.strip()
```

- [ ] **Step 4: 测试通过 + Commit**

```bash
cd agent
pytest tests/test_tutor_prompt.py -v
git add agent/agent_english/tutor/prompt.py agent/tests/test_tutor_prompt.py
git commit -m "feat(tutor): system prompt with anti-leak rules"
```

---

### Task 7: Tutor service + LLM 封装 + FastAPI

**Files:**
- Create: `agent/agent_english/tutor/llm.py`
- Create: `agent/agent_english/tutor/service.py`
- Create: `agent/agent_english/tutor/api.py`
- Create: `agent/tests/test_tutor_service.py`
- Create: `agent/tests/test_tutor_api.py`
- Modify: `agent/pyproject.toml`（加 `fastapi`、`uvicorn`、`pydantic` 依赖）
- Modify: `agent/.env.example`（`TUTOR_HOST` / `TUTOR_PORT` 可选）

**Interfaces:**
- Produces: `handle_chat(req, store, llm) -> TutorChatResponse`
- Produces: FastAPI `POST /tutor/chat`
- LLM protocol: `def complete(system: str, messages: list[dict]) -> str`

- [ ] **Step 1: 更新依赖**

在 `agent/pyproject.toml` 的 `dependencies` 中追加：

```toml
"fastapi",
"uvicorn[standard]",
"pydantic>=2",
```

然后：

```bash
cd agent
uv sync
```

- [ ] **Step 2: 服务层测试（mock LLM）**

```python
# agent/tests/test_tutor_service.py
from agent_english.tutor.session_store import InMemorySessionStore
from agent_english.tutor.service import handle_chat
from agent_english.tutor.models import TutorChatRequest, Discussion


class FakeLLM:
    def complete(self, system: str, messages: list[dict]) -> str:
        assert "discussion" in system.lower() or "锚点" in system or "PETS" in system
        return "这是提示：先抓关键词，不要猜选项字母。"


def test_first_message_bind_set():
    store = InMemorySessionStore()
    req = TutorChatRequest(
        user_id="u1",
        message="给我提示",
        session_id="s1",
        discussion=Discussion(
            bind="set",
            scene={"phase": "quiz", "can_reveal_answer": False, "content": {"question": "Q?"}},
        ),
        presence={"item_index": 0},
    )
    resp = handle_chat(req, store=store, llm=FakeLLM())
    assert resp.session_id == "s1"
    assert "提示" in resp.reply
    sess = store.get("s1")
    assert len(sess["messages"]) == 2
    assert sess["messages"][0]["role"] == "user"


def test_keep_requires_existing():
    store = InMemorySessionStore()
    req = TutorChatRequest(
        user_id="u1",
        message="hi",
        session_id="nope",
        discussion=Discussion(bind="keep"),
    )
    try:
        handle_chat(req, store=store, llm=FakeLLM())
        assert False, "should raise"
    except ValueError as e:
        assert "session" in str(e).lower() or "not_found" in str(e)
```

- [ ] **Step 3: 实现 llm / service / api**

```python
# agent/agent_english/tutor/llm.py
from __future__ import annotations


class DeerFlowLLM:
    """Thin wrapper; DeerFlowClient created lazily."""

    def __init__(self) -> None:
        self._client = None

    def _get(self):
        if self._client is None:
            from deerflow.client import DeerFlowClient
            self._client = DeerFlowClient()
        return self._client

    def complete(self, system: str, messages: list[dict]) -> str:
        # Flatten to a single prompt for DeerFlowClient.chat compatibility
        parts = [f"[SYSTEM]\n{system}"]
        for m in messages:
            role = m.get("role", "user").upper()
            parts.append(f"[{role}]\n{m.get('content', '')}")
        parts.append("[ASSISTANT]\n")
        prompt = "\n\n".join(parts)
        result = self._get().chat(prompt)
        if isinstance(result, str):
            return result.strip()
        # if client returns object with text/content
        text = getattr(result, "content", None) or getattr(result, "text", None) or str(result)
        return str(text).strip()


# agent/agent_english/tutor/service.py
from __future__ import annotations
from copy import deepcopy
from typing import Any, Protocol

from agent_english.tutor.models import TutorChatRequest, TutorChatResponse
from agent_english.tutor.prompt import build_system_prompt, build_user_payload
from agent_english.tutor.session_store import InMemorySessionStore, apply_discussion


class LLM(Protocol):
    def complete(self, system: str, messages: list[dict]) -> str: ...


_ERROR_HTTP = {
    "missing_user": (400, "user_id required"),
    "missing_scene": (400, "discussion.scene required for bind=set"),
    "session_not_found": (400, "session not found; use bind=set or 讲当前"),
    "missing_anchor": (400, "session has no discussion anchor"),
    "forbidden": (403, "session does not belong to user"),
}


class TutorError(Exception):
    def __init__(self, code: str):
        self.code = code
        self.status, self.message = _ERROR_HTTP.get(code, (400, code))
        super().__init__(self.message)


def handle_chat(
    req: TutorChatRequest,
    *,
    store: InMemorySessionStore,
    llm: LLM,
) -> TutorChatResponse:
    disc = req.discussion.model_dump()
    sess, err = apply_discussion(store, req.user_id, req.session_id, disc)
    if err:
        raise TutorError(err)

    assert sess is not None
    if req.presence is not None:
        sess["presence_last"] = deepcopy(req.presence)

    user_text = build_user_payload(req.message)
    if not user_text:
        raise TutorError("empty_message")

    history = list(sess.get("messages") or [])
    history_for_llm = history[-40:]
    system = build_system_prompt(sess["discussion_scene"], req.presence)
    llm_messages = history_for_llm + [{"role": "user", "content": user_text}]

    try:
        reply = llm.complete(system, llm_messages)
    except Exception as e:
        raise RuntimeError(f"llm_failed: {e}") from e

    if not reply:
        reply = "老师暂时没想好怎么说，请再试一次～"

    history.append({"role": "user", "content": user_text})
    history.append({"role": "assistant", "content": reply})
    sess["messages"] = history
    store.save(sess)

    return TutorChatResponse(
        reply=reply,
        session_id=sess["id"],
        memory_updated=False,
    )
```

```python
# agent/agent_english/tutor/api.py
from __future__ import annotations
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from agent_english.tutor.models import TutorChatRequest, TutorChatResponse
from agent_english.tutor.session_store import InMemorySessionStore
from agent_english.tutor.service import handle_chat, TutorError
from agent_english.tutor.llm import DeerFlowLLM

app = FastAPI(title="PETS-3 Tutor API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_store = InMemorySessionStore()
_llm = DeerFlowLLM()


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/tutor/chat", response_model=TutorChatResponse)
def tutor_chat(req: TutorChatRequest):
    if not req.user_id or not req.user_id.strip():
        raise HTTPException(400, "user_id required")
    try:
        return handle_chat(req, store=_store, llm=_llm)
    except TutorError as e:
        raise HTTPException(e.status, e.message) from e
    except RuntimeError as e:
        if str(e).startswith("llm_failed"):
            raise HTTPException(502, "LLM unavailable") from e
        raise


def main():
    import uvicorn
    uvicorn.run(
        "agent_english.tutor.api:app",
        host="0.0.0.0",
        port=8765,
        reload=False,
    )


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: API 测试**

```python
# agent/tests/test_tutor_api.py
from fastapi.testclient import TestClient
from agent_english.tutor import api as api_mod
from agent_english.tutor.session_store import InMemorySessionStore


class FakeLLM:
    def complete(self, system: str, messages: list[dict]) -> str:
        return "模拟老师回复"


def test_chat_endpoint(monkeypatch):
    api_mod._store = InMemorySessionStore()
    api_mod._llm = FakeLLM()
    client = TestClient(api_mod.app)
    r = client.post("/tutor/chat", json={
        "user_id": "u1",
        "message": "这个词什么意思？",
        "session_id": "s1",
        "discussion": {
            "bind": "set",
            "scene": {
                "phase": "learn",
                "can_reveal_answer": True,
                "content": {"type": "word", "en": "achieve", "cn": "实现"},
            },
        },
        "presence": {"phase": "learn", "item_index": 0},
    })
    assert r.status_code == 200
    data = r.json()
    assert data["session_id"] == "s1"
    assert data["reply"]

    r2 = client.post("/tutor/chat", json={
        "user_id": "u1",
        "message": "再举个例子",
        "session_id": "s1",
        "discussion": {"bind": "keep"},
        "presence": {"item_index": 1},
    })
    assert r2.status_code == 200
```

- [ ] **Step 5: Run all tutor tests**

```bash
cd agent
pytest tests/test_tutor_session.py tests/test_tutor_prompt.py tests/test_tutor_service.py tests/test_tutor_api.py -v
```

Expected: PASS

- [ ] **Step 6: 手动起服务（可选）**

```bash
cd agent
uv run python -m agent_english.tutor.api
# 另开终端
curl http://127.0.0.1:8765/health
```

Expected: `{"ok":true}`

- [ ] **Step 7: Commit**

```bash
git add agent/pyproject.toml agent/agent_english/tutor agent/tests/test_tutor_service.py agent/tests/test_tutor_api.py agent/.env.example
git commit -m "feat(tutor): FastAPI chat endpoint with DeerFlow LLM"
```

---

### Task 8: 前端 `tutorApi` + Vite 代理

**Files:**
- Create: `src/lib/tutorApi.js`
- Modify: `vite.config.js`
- Create or modify: 项目根 `.env.example`（若无则创建）写入 `VITE_TUTOR_API_URL`

**Interfaces:**
- Produces: `postTutorChat({ userId, sessionId, message, discussion, presence }) -> { reply, session_id, memory_updated }`

- [ ] **Step 1: API 客户端**

```js
// src/lib/tutorApi.js

const base = () => import.meta.env.VITE_TUTOR_API_URL || '';

/**
 * @param {{
 *  userId: string,
 *  sessionId?: string|null,
 *  message: string,
 *  discussion: { bind: 'set'|'keep', scene?: object },
 *  presence?: object|null
 * }} p
 */
export async function postTutorChat(p) {
  const url = `${base()}/tutor/chat`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: p.userId,
      session_id: p.sessionId || null,
      message: p.message,
      discussion: p.discussion,
      presence: p.presence || null,
    }),
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || JSON.stringify(body);
    } catch { /* ignore */ }
    const err = new Error(detail);
    err.status = res.status;
    throw err;
  }
  return res.json();
}
```

- [ ] **Step 2: Vite 代理（dev 免 CORS 配置纠结）**

```js
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5180,
    proxy: {
      '/tutor': {
        target: 'http://127.0.0.1:8765',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://127.0.0.1:8765',
        changeOrigin: true,
      },
    },
  },
})
```

说明：`VITE_TUTOR_API_URL` 留空时请求同源 `/tutor/chat`，由代理转发。

- [ ] **Step 3: Commit**

```bash
git add src/lib/tutorApi.js vite.config.js .env.example
git commit -m "feat(frontend): tutor API client and vite proxy"
```

---

### Task 9: TutorContext + TutorChat + 接入闯关

**Files:**
- Create: `src/context/TutorContext.jsx`
- Create: `src/components/TutorChat.jsx`
- Modify: `src/App.jsx`
- Modify: `src/components/VocabLesson.jsx`
- Modify: `src/components/QuizLesson.jsx`
- Modify: `src/components/ResultScreen.jsx`
- Modify: `src/styles/` 下全局 CSS（若项目用 `index.css` / `components.css`，加最少抽屉样式；可用 Tailwind 工具类）

**Interfaces:**
- `TutorProvider` value: `{ userId, presence, setPresence, open, setOpen }`
- `useTutor()` hook
- Lesson 内：`useEffect` 调用 `setPresence(buildPresenceScene(...))`

- [ ] **Step 1: Context**

```jsx
// src/context/TutorContext.jsx
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useUserId } from '../hooks/useUserId';
import { buildPresenceScene } from '../lib/tutorScene';

const TutorContext = createContext(null);

export function TutorProvider({ children }) {
  const userId = useUserId();
  const [presence, setPresenceState] = useState(() => buildPresenceScene({ surface: 'home' }));
  const [open, setOpen] = useState(false);

  const setPresence = useCallback((partialOrScene) => {
    setPresenceState((prev) => {
      if (partialOrScene && partialOrScene.updated_at && partialOrScene.surface) {
        return partialOrScene;
      }
      return buildPresenceScene({ ...prev, ...partialOrScene });
    });
  }, []);

  const value = useMemo(
    () => ({ userId, presence, setPresence, open, setOpen }),
    [userId, presence, setPresence, open],
  );

  return <TutorContext.Provider value={value}>{children}</TutorContext.Provider>;
}

export function useTutor() {
  const ctx = useContext(TutorContext);
  if (!ctx) throw new Error('useTutor must be used within TutorProvider');
  return ctx;
}
```

- [ ] **Step 2: TutorChat 组件（核心逻辑）**

```jsx
// src/components/TutorChat.jsx
import { useCallback, useRef, useState } from 'react';
import { MessageCircle, X, Send, RotateCcw, Crosshair } from 'lucide-react';
import { useTutor } from '../context/TutorContext';
import { postTutorChat } from '../lib/tutorApi';
import { snapshotDiscussionScene } from '../lib/tutorScene';

function newSessionId() {
  return crypto.randomUUID();
}

export default function TutorChat() {
  const { userId, presence, open, setOpen } = useTutor();
  const [sessionId, setSessionId] = useState(() => newSessionId());
  const [hasAnchor, setHasAnchor] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const listRef = useRef(null);

  const contextLabel = [
    presence.section,
    presence.level_title || presence.level_id,
    presence.phase,
    presence.item_index != null ? `${presence.item_index + 1}/${presence.item_total || '?'}` : null,
  ]
    .filter(Boolean)
    .join(' · ') || 'PETS-3 助教';

  const send = useCallback(
    async (text, { forceSet = false } = {}) => {
      const message = (text ?? input).trim();
      if (!message || sending) return;
      setError(null);
      setSending(true);
      const tempId = `local-${Date.now()}`;
      setMessages((m) => [...m, { id: tempId, role: 'user', content: message, status: 'pending' }]);
      setInput('');

      const needSet = forceSet || !hasAnchor;
      const discussion = needSet
        ? { bind: 'set', scene: snapshotDiscussionScene(presence) }
        : { bind: 'keep' };

      try {
        const data = await postTutorChat({
          userId,
          sessionId,
          message,
          discussion,
          presence,
        });
        setHasAnchor(true);
        if (data.session_id) setSessionId(data.session_id);
        setMessages((m) =>
          m
            .map((x) => (x.id === tempId ? { ...x, status: 'sent' } : x))
            .concat([{ id: `a-${Date.now()}`, role: 'assistant', content: data.reply, status: 'sent' }]),
        );
      } catch (e) {
        setMessages((m) => m.map((x) => (x.id === tempId ? { ...x, status: 'failed' } : x)));
        if (e.status === 400 && String(e.message).includes('session')) {
          setError('会话已失效，请点「讲当前」重新绑定');
          setHasAnchor(false);
        } else {
          setError(e.message || '发送失败');
        }
      } finally {
        setSending(false);
      }
    },
    [input, sending, hasAnchor, presence, userId, sessionId],
  );

  const newTopic = () => {
    setSessionId(newSessionId());
    setHasAnchor(false);
    setMessages([]);
    setError(null);
  };

  const teachCurrent = () => {
    setHasAnchor(false); // next send will bind=set with latest presence
    setError(null);
    void send('请根据我当前屏幕上的内容讲解', { forceSet: true });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="问老师"
        className="fixed bottom-6 right-6 z-50 rounded-full shadow-lg px-4 py-3 flex items-center gap-2"
        style={{ background: 'var(--skill-vocab, #58cc02)', color: '#fff', fontWeight: 700 }}
      >
        <MessageCircle width={20} height={20} />
        问老师
      </button>
    );
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 flex flex-col"
      style={{
        maxHeight: '70vh',
        background: 'var(--color-surface, #fff)',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        boxShadow: '0 -8px 32px rgba(0,0,0,.12)',
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <div style={{ fontWeight: 800 }}>AI 老师</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{contextLabel}</div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={teachCurrent} title="讲当前" aria-label="讲当前">
            <Crosshair width={18} height={18} />
          </button>
          <button type="button" onClick={newTopic} title="新话题" aria-label="新话题">
            <RotateCcw width={18} height={18} />
          </button>
          <button type="button" onClick={() => setOpen(false)} aria-label="关闭">
            <X width={18} height={18} />
          </button>
        </div>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {messages.length === 0 && (
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
            随时问我单词、句子或语法。答题中我只会给提示，不会直接说答案。
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              textAlign: m.role === 'user' ? 'right' : 'left',
              opacity: m.status === 'failed' ? 0.6 : 1,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                maxWidth: '85%',
                padding: '8px 12px',
                borderRadius: 12,
                background: m.role === 'user' ? 'var(--skill-vocab, #58cc02)' : 'var(--color-bg-secondary, #f3f4f6)',
                color: m.role === 'user' ? '#fff' : 'var(--color-text)',
                fontSize: 14,
                whiteSpace: 'pre-wrap',
              }}
            >
              {m.content}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <div className="px-4 py-2 text-sm" style={{ color: 'var(--color-danger, #e11)' }}>
          {error}
          <button type="button" className="ml-2 underline" onClick={() => setError(null)}>
            关闭
          </button>
        </div>
      )}

      <div className="flex gap-2 px-3 pb-2">
        {['怎么记？', '给个提示', '语法结构？'].map((q) => (
          <button
            key={q}
            type="button"
            disabled={sending}
            onClick={() => send(q)}
            style={{ fontSize: 12, padding: '4px 8px', borderRadius: 999, border: '1px solid var(--color-border)' }}
          >
            {q}
          </button>
        ))}
      </div>

      <form
        className="flex gap-2 p-3 border-t"
        style={{ borderColor: 'var(--color-border)' }}
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入你的问题…"
          disabled={sending}
          className="flex-1 rounded-xl px-3 py-2"
          style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)' }}
        />
        <button type="submit" disabled={sending || !input.trim()} aria-label="发送">
          <Send width={20} height={20} />
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: App 接入**

```jsx
// App.jsx — wrap return tree:
import { TutorProvider } from './context/TutorContext';
import TutorChat from './components/TutorChat';
import { useTutor } from './context/TutorContext';
import { buildPresenceScene } from './lib/tutorScene';
import { useEffect } from 'react';

// Inner component that can call useTutor for coarse presence:
function AppPresenceSync({ view, section, currentLevel, result }) {
  const { setPresence } = useTutor();
  useEffect(() => {
    if (view === 'home') setPresence(buildPresenceScene({ surface: 'home' }));
    else if (view === 'path') setPresence(buildPresenceScene({ surface: 'path', section }));
    else if (view === 'lesson' && currentLevel)
      setPresence(
        buildPresenceScene({
          surface: 'lesson',
          section,
          levelId: currentLevel.id,
          levelTitle: currentLevel.title,
        }),
      );
    else if (view === 'result' && result)
      setPresence(
        buildPresenceScene({
          surface: 'result',
          section,
          levelId: currentLevel?.id,
          content: {
            type: 'result',
            correct: result.correctCount,
            total: result.total,
            wrong: result.wrongCount,
          },
        }),
      );
  }, [view, section, currentLevel, result, setPresence]);
  return null;
}

// in export default function App():
return (
  <TutorProvider>
    <div className="min-h-screen" ...>
      <AppPresenceSync view={view} section={section} currentLevel={currentLevel} result={result} />
      {/* existing views */}
      {(view === 'lesson' || view === 'result') && <TutorChat />}
    </div>
  </TutorProvider>
);
```

- [ ] **Step 4: VocabLesson 细粒度 presence**

在组件内：

```js
import { useTutor } from '../context/TutorContext';
import { buildPresenceScene } from '../lib/tutorScene';

// inside component:
const { setPresence } = useTutor();

useEffect(() => {
  if (phase === 'learn') {
    const word = words[currentIdx];
    setPresence(
      buildPresenceScene({
        surface: 'lesson',
        section: 'vocabulary',
        levelId: level.id,
        levelTitle: level.title,
        phase: 'learn',
        itemIndex: currentIdx,
        itemTotal: words.length,
        answerState: 'unanswered',
        content: {
          type: 'word',
          en: word.en,
          cn: word.cn,
          phonetic: word.phonetic,
          example: word.example,
          example_cn: word.exampleCn,
        },
      }),
    );
  } else if (phase === 'quiz' && quizQuestions[quizIdx]) {
    const q = quizQuestions[quizIdx];
    setPresence(
      buildPresenceScene({
        surface: 'lesson',
        section: 'vocabulary',
        levelId: level.id,
        levelTitle: level.title,
        phase: 'quiz',
        itemIndex: quizIdx,
        itemTotal: quizQuestions.length,
        answerState: feedback === 'correct' ? 'answered_correct' : feedback === 'wrong' ? 'answered_wrong' : 'unanswered',
        content: {
          type: 'vocab_quiz',
          word: q.word,
          options: q.options,
          ...(feedback
            ? { answer: q.correctAnswer, explanation: null }
            : {}),
        },
      }),
    );
  }
}, [phase, currentIdx, quizIdx, feedback, words, quizQuestions, level, setPresence]);
```

`QuizLesson` 同理：`section` prop、`phase`、`currentIdx`、`feedback`、题目 `content`（未作答不传 answer）。

- [ ] **Step 5: 端到端手动验收清单**

1. `cd agent && uv run python -m agent_english.tutor.api`
2. `npm run dev` → 打开关卡
3. 点「问老师」→ 发「怎么记？」→ 有回复
4. 滑到下一词，再发「再举个例子」→ 仍讲**上一讨论词**（锚点）
5. 点「讲当前」→ 绑定新词
6. 测验未作答问「答案是什么」→ 不应直接给出选项字母/标准答案
7. 答完再问 → 可完整讲
8. 关掉抽屉，关卡进度不变

- [ ] **Step 6: Commit**

```bash
git add src/context/TutorContext.jsx src/components/TutorChat.jsx src/App.jsx src/components/VocabLesson.jsx src/components/QuizLesson.jsx src/components/ResultScreen.jsx
git commit -m "feat(frontend): TutorChat drawer with discussion bind protocol"
```

---

### Task 10: Phase 2 — profile / memory tools + Supabase adapter

**Files:**
- Modify: `agent/agent_english/adapters/supabase.py`
- Create: `agent/agent_english/tutor/tools.py`
- Modify: `agent/agent_english/tutor/service.py` / `llm.py`（在 complete 前注入 tool 结果，或使用 DeerFlow tools 若 API 支持）
- Create: `agent/tests/test_tutor_tools.py`

**Interfaces:**
- `get_learning_profile(user_id, section=None) -> dict`
- `get_memory(user_id, limit=10) -> list`
- `update_memory(user_id, kind, content, importance=1, meta=None) -> dict`

**Phase 2 简化策略（避免阻塞）：**  
若 `DeerFlowClient` 不便注册 tools，则在 `handle_chat` 内**确定性预取**：

```python
profile = safe_get_profile(user_id)
memories = safe_get_memory(user_id)
system = build_system_prompt(...) + format_profile(profile) + format_memories(memories)
```

`update_memory`：在 reply 后用启发式（可选）或第二轮 LLM JSON；MVP 可用 API 扩展字段 `remember: {kind, content}` 由模型在约定格式输出——**本任务采用预取注入 + 可选 `update_memory` 工具函数供 service 显式调用**。

- [ ] **Step 1: Adapter 方法**

```python
# supabase.py additions

def fetch_learning_profile(self, user_id: str, section: str | None = None) -> dict:
    answers = self.fetch_user_answers(user_id)
    if section:
        answers = [a for a in answers if a.get("section") == section]
    total = len(answers)
    correct = sum(1 for a in answers if a.get("is_correct"))
    weak = [a.get("question_id") for a in answers if not a.get("is_correct")][-10:]
    by_section: dict[str, list] = {}
    for a in answers:
        by_section.setdefault(a.get("section") or "unknown", []).append(a)
    section_rates = {
        s: (sum(1 for x in rows if x.get("is_correct")) / len(rows) if rows else 0.0)
        for s, rows in by_section.items()
    }
    return {
        "user_id": user_id,
        "total_answers": total,
        "correct_rate": (correct / total) if total else 0.0,
        "section_rates": section_rates,
        "recent_weak_question_ids": weak,
    }

def fetch_memories(self, user_id: str, limit: int = 10) -> list[dict]:
    resp = (
        self.client.table("tutor_memory")
        .select("*")
        .eq("user_id", user_id)
        .is_("expired_at", "null")
        .order("importance", desc=True)
        .order("updated_at", desc=True)
        .limit(limit)
        .execute()
    )
    return resp.data or []

def upsert_memory(
    self,
    *,
    user_id: str,
    kind: str,
    content: str,
    importance: int = 1,
    meta: dict | None = None,
    source: str = "agent",
) -> dict | None:
    # simple insert (dedupe weak_point by content prefix later)
    resp = (
        self.client.table("tutor_memory")
        .insert({
            "user_id": user_id,
            "kind": kind,
            "content": content,
            "importance": importance,
            "meta": meta,
            "source": source,
        })
        .execute()
    )
    return resp.data[0] if resp.data else None
```

- [ ] **Step 2: tools 包装 + 单测（mock adapter）**

```python
# agent/agent_english/tutor/tools.py
def format_profile_for_prompt(profile: dict) -> str:
    if not profile or profile.get("total_answers", 0) == 0:
        return "学习画像：暂无答题记录（冷启动，不要编造历史）。"
    return (
        f"学习画像：答题{profile['total_answers']}次，"
        f"正确率{profile['correct_rate']:.0%}，"
        f"分模块{profile.get('section_rates')}，"
        f"近错题{profile.get('recent_weak_question_ids')}"
    )

def format_memories_for_prompt(rows: list[dict]) -> str:
    if not rows:
        return "教学记忆：无。"
    lines = [f"- ({r.get('kind')}) {r.get('content')}" for r in rows]
    return "教学记忆：\n" + "\n".join(lines)
```

```python
# agent/tests/test_tutor_tools.py
from agent_english.tutor.tools import format_profile_for_prompt, format_memories_for_prompt

def test_cold_start_profile():
    s = format_profile_for_prompt({"total_answers": 0})
    assert "冷启动" in s or "暂无" in s

def test_memory_format():
    s = format_memories_for_prompt([{"kind": "weak_point", "content": "被动语态"}])
    assert "被动语态" in s
```

- [ ] **Step 3: 注入 service**

在 `handle_chat` 中（构造 system 后）：

```python
profile_text = "学习画像：暂无（未配置 Supabase）。"
memory_text = "教学记忆：无。"
try:
    from agent_english.adapters.supabase import SupabaseAdapter
    db = SupabaseAdapter()
    profile = db.fetch_learning_profile(req.user_id)
    mems = db.fetch_memories(req.user_id, limit=10)
    from agent_english.tutor.tools import format_profile_for_prompt, format_memories_for_prompt
    profile_text = format_profile_for_prompt(profile)
    memory_text = format_memories_for_prompt(mems)
except Exception:
    pass  # degrade

system = build_system_prompt(...) + "\n" + profile_text + "\n" + memory_text
```

- [ ] **Step 4: 测试 + Commit**

```bash
cd agent
pytest tests/test_tutor_tools.py tests/test_tutor_service.py -v
git add agent/agent_english/adapters/supabase.py agent/agent_english/tutor/tools.py agent/agent_english/tutor/service.py agent/tests/test_tutor_tools.py
git commit -m "feat(tutor): inject learning profile and memory into prompts"
```

---

### Task 11: Phase 2 — 会话持久化到 Supabase（替换纯内存）

**Files:**
- Create: `agent/agent_english/tutor/supabase_session_store.py`
- Modify: `agent/agent_english/tutor/api.py`（按环境变量选择 store）
- Create: `agent/tests/test_supabase_session_store.py`（无凭证则 skip）

**Interfaces:**
- `SupabaseSessionStore` 与 `InMemorySessionStore` 同方法：`get/save/create`
- Env: `TUTOR_SESSION_BACKEND=memory|supabase`（默认 memory 便于本地测）

- [ ] **Step 1: 实现 SupabaseSessionStore**（字段映射 `tutor_sessions` 表）

```python
# 核心：get 用 table select eq id；save 用 upsert
# messages / discussion_scene 为 JSONB
```

- [ ] **Step 2: api.py**

```python
import os
def build_store():
    if os.getenv("TUTOR_SESSION_BACKEND", "memory") == "supabase":
        from agent_english.tutor.supabase_session_store import SupabaseSessionStore
        return SupabaseSessionStore()
    return InMemorySessionStore()
_store = build_store()
```

- [ ] **Step 3: Commit**

```bash
git add agent/agent_english/tutor/supabase_session_store.py agent/agent_english/tutor/api.py agent/tests/test_supabase_session_store.py
git commit -m "feat(tutor): optional Supabase-backed session store"
```

---

## Out of scope（本计划不实现）

- Phase 3：SSE 流式、输出侧泄题检测、限流配额、`get_level_content`
- Phase 4：通关触发 `adjust_section`、`suggest_practice`、登录 merge
- 语音、真人老师

---

## Self-Review（对照 spec）

| Spec 要求 | 任务 |
|-----------|------|
| 匿名 user_id | Task 2 |
| user_answers 上报 | Task 4 |
| presence Context | Task 3, 9 |
| tutor_sessions / tutor_memory DDL | Task 1 |
| discussion set/keep + presence | Task 5, 7, 9 |
| 防泄题 can_reveal | Task 3, 6, 9 验收 |
| POST /tutor/chat + DeerFlow | Task 7 |
| TutorChat 抽屉 | Task 9 |
| profile/memory | Task 10–11 |
| Adaptive 分入口 | 未改 `adjust` CLI；不在 chat 调 adjust |
| 错误处理 400/403/502 | Task 7 TutorError + API |

**Placeholder scan:** 无 TBD；Phase 3/4 明确 out of scope。  
**类型一致性:** `TutorChatRequest` / `discussion.bind` / `session_id` 前后端字段统一为 snake_case JSON。

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-15-deerflow-tutor.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — 每个 Task 新开子代理，任务间审查，迭代快  
2. **Inline Execution** — 本会话用 executing-plans 按批次执行并设检查点  

Which approach?
