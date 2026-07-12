# PETS-3 闯关学英语 — 开发文档

## 项目概述

一个仿多邻国（Duolingo）风格的英语闯关学习网站，专为 PETS-3（公共英语三级）笔试备考设计。用户通过逐关解锁的方式学习单词、语法、阅读理解和真题模拟，内置完整的游戏化机制（体力、经验、星级、连胜）。

- 考试日期：2026年9月20日
- 目标用户：英语接近零基础，每天约1小时学习时间
- 技术栈：React 19 + Vite 8 + Tailwind CSS 4 + lucide-react

## 快速启动

```bash
cd /Users/binbin/workspace/english-three
npm install          # 安装依赖
npx vite --port 5180 # 启动开发服务器，访问 http://localhost:5180
npm run build        # 生产构建，输出到 dist/
```

## 项目结构

```
english-three/
├── docs/
│   └── DEVELOPMENT.md        # 本文档
├── index.html                 # HTML 入口
├── package.json
├── vite.config.js            # Vite 配置（含 Tailwind 插件）
├── src/
│   ├── main.jsx               # React 入口
│   ├── App.jsx                # 主应用，管理视图路由
│   ├── index.css             # 全局样式 + Tailwind 导入 + 动画
│   ├── data/                  # 学习内容数据
│   │   ├── vocabulary.js      # 单词数据（10关 × 12词 = 120词）
│   │   ├── grammar.js         # 语法数据（8关 × 6题 = 48题）
│   │   ├── reading.js         # 阅读数据（6关 × 3-5题 = 22题）
│   │   └── exam.js            # 真题数据（5关 × 5-10题 = 40题）
│   ├── hooks/
│   │   └── useGameState.js   # 游戏状态管理（localStorage 持久化）
│   └── components/            # UI 组件
│       ├── Header.jsx         # 顶部状态栏（体力/等级/连胜/宝石）
│       ├── Home.jsx           # 首页（4个模块入口）
│       ├── PathMap.jsx        # 闯关路径地图（Z字型布局）
│       ├── VocabLesson.jsx    # 单词学习（卡片+测试）
│       ├── QuizLesson.jsx     # 通用答题（语法/阅读/真题）
│       ├── ResultScreen.jsx   # 通关结果页（星级+经验）
│       └── ProgressBar.jsx   # 可复用进度条
```

## 架构设计

### 视图路由

App.jsx 通过 `view` 状态管理四个视图，不使用 React Router：

| view 值 | 组件 | 说明 |
|---------|------|------|
| `home` | Home | 首页，4个模块卡片 |
| `path` | PathMap | 路径地图，显示某模块的所有关卡 |
| `lesson` | VocabLesson / QuizLesson | 答题界面 |
| `result` | ResultScreen | 通关结果 |

切换视图时使用简单的条件渲染，不使用 framer-motion AnimatePresence（曾导致页面空白 bug）。

### 数据流

```
useGameState (localStorage)
    ↓ gameState 对象
App.jsx
    ↓ props 传递
各组件（Header / Home / PathMap / Lesson / Result）
    ↓ 回调函数
gameState.loseHeart() / completeLevel() / refillHearts()
    ↓ setState + localStorage 持久化
```

### 游戏机制

| 机制 | 说明 |
|------|------|
| 体力（Hearts） | 初始5颗，答错扣1颗，30分钟恢复1颗，可用30宝石补满 |
| 经验（XP） | 答对1题约2 XP + 全对额外10 XP，每100 XP升1级 |
| 星级（Stars） | 全对3星，错1-2题2星，错3+题1星（错>2题不通关） |
| 连胜（Streak） | 每天学习累加连胜天数，断天清零 |
| 宝石（Gems） | 首次通关+5，可用于恢复体力 |
| 解锁（Unlock） | 第1关默认解锁，完成当前关解锁下一关 |
| 日目标 | 每日20 XP，显示在顶部状态栏 |

### localStorage 存储

键名：`pets3_game_state_v1`

```json
{
  "hearts": 5,
  "lastHeartTime": 1720000000000,
  "xp": 0,
  "gems": 50,
  "streak": 0,
  "lastStudyDate": "Sat Jul 12 2026",
  "completedLevels": {
    "vocabulary-1": { "stars": 3, "bestScore": 12 },
    "grammar-1": { "stars": 2, "bestScore": 5 }
  },
  "sectionProgress": {
    "vocabulary": 1,
    "grammar": 1,
    "reading": 0,
    "exam": 0
  },
  "dailyGoal": 20,
  "dailyXp": 0,
  "dailyXpDate": "Sat Jul 12 2026"
}
```

## 数据格式

### 单词数据（vocabulary.js）

```js
export const vocabularyLevels = [
  {
    id: 1,
    title: "基础入门 · 第一关",
    description: "日常打招呼用语",
    icon: "🌱",
    color: "#58cc02",
    words: [
      {
        en: "hello",           // 英文单词
        cn: "你好",             // 中文释义
        phonetic: "/həˈloʊ/",  // IPA音标
        example: "Hello! How are you today?",  // 英文例句
        exampleCn: "你好！你今天好吗？"         // 中文翻译
      }
    ]
  }
];
```

### 语法数据（grammar.js）

```js
export const grammarLevels = [
  {
    id: 1,
    title: "be动词与人称代词",
    description: "英语最基础的动词和人称",
    icon: "📖",
    color: "#1cb0f6",
    lesson: "语法讲解文本，用\\n换行",  // 讲解内容
    examples: [
      { en: "I am a student.", cn: "我是一个学生。" }
    ],
    quiz: [
      {
        question: "选择正确的be动词：She ___ a nurse.",
        options: ["am", "is", "are", "be"],  // 4个选项
        answer: 1,                            // 正确答案索引（0-3）
        explanation: "She是第三人称单数，用is。"  // 中文解析
      }
    ]
  }
];
```

### 阅读数据（reading.js）

```js
export const readingLevels = [
  {
    id: 1,
    title: "阅读入门 · 对话理解",
    description: "简短日常对话理解练习",
    icon: "📚",
    color: "#ff9600",
    passage: "英文短文，用\\n换行",
    passageCn: "中文翻译",
    questions: [
      {
        question: "How is B feeling today?",  // 英文题干
        options: ["Great", "Fine", "Bad", "Tired"],
        answer: 1,
        explanation: "B说"I'm fine"，所以选Fine。"
      }
    ]
  }
];
```

### 真题数据（exam.js）

支持三种题型：

```js
export const examLevels = [
  // 类型1：语法选择题（无 passage）
  {
    id: 1,
    title: "语法选择 · 基础篇",
    type: "grammar",
    icon: "📝",
    color: "#ce82ff",
    questions: [
      { question: "She ___ to school every day.",
        options: ["walk","walks","walking","walked"],
        answer: 1, explanation: "第三人称单数加s" }
    ]
  },
  // 类型2：阅读理解（有 passage + passageCn）
  {
    id: 3,
    title: "阅读理解 · 基础篇",
    type: "reading",
    passage: "短文...",
    passageCn: "翻译...",
    questions: [ { question, options, answer, explanation } ]
  },
  // 类型3：完形填空（passage 中用数字标记空位）
  {
    id: 5,
    title: "完形填空",
    type: "cloze",
    passage: "Tom is a 1 boy. He 2 in a small town.",
    passageCn: "翻译...",
    questions: [
      { blank: 1,  // 对应 passage 中的数字 1
        question: "选择填入第1空",
        options: ["twelve year old","twelve years old","twelve-years-old","twelve-year-old"],
        answer: 3, explanation: "复合形容词用连字符，year用单数" }
    ]
  }
];
```

## 组件文档

### Header.jsx

顶部固定状态栏，显示体力、等级、XP进度条、连胜、宝石。点击体力或宝石可打开商店弹窗。

**Props：**
- `gameState` — 游戏状态对象
- `onReset` — 重置进度回调

### Home.jsx

首页，展示4个学习模块卡片（单词/语法/阅读/真题），每个卡片显示图标、标题、进度条和完成数。

**Props：**
- `gameState` — 游戏状态对象
- `onSelectSection(section)` — 点击模块回调，section 为 `{ id, title, ... }`

### PathMap.jsx

闯关路径地图，Z字型布局展示某模块的所有关卡。已通关显示绿色对勾+星星，当前关有脉冲动画，未解锁显示锁图标。

**Props：**
- `section` — 模块ID（`vocabulary` / `grammar` / `reading` / `exam`）
- `levels` — 关卡数据数组
- `gameState` — 游戏状态对象
- `onSelectLevel(level)` — 点击关卡回调
- `onBack` — 返回首页回调

### VocabLesson.jsx

单词学习界面，分两个阶段：
1. **学习阶段**：逐张展示单词卡片（英文+音标+发音按钮），点击查看释义后进入下一张
2. **测试阶段**：每词一道选择题，"这个单词是什么意思？"，4选1

**Props：**
- `level` — 关卡数据（含 `words` 数组）
- `gameState` — 游戏状态对象
- `onComplete(stars, score, total, wrongCount)` — 通关回调
- `onExit` — 退出回调

### QuizLesson.jsx

通用答题界面，支持三个阶段：
1. **讲解阶段**（仅语法）：显示 `lesson` 文本和 `examples` 例句
2. **阅读阶段**（仅阅读/真题）：显示 `passage` 和 `passageCn`
3. **答题阶段**：显示题目和4个选项，答对绿色反馈，答错红色反馈+正确答案+解析

**Props：**
- `level` — 关卡数据
- `section` — 模块ID
- `gameState` — 游戏状态对象
- `onComplete(stars, score, total, wrongCount)` — 通关回调
- `onExit` — 退出回调

### ResultScreen.jsx

通关结果页，动画展示1-3颗星，统计正确率、答对/答错数、获得经验。

**Props：**
- `stars` — 星级（1-3）
- `correctCount` — 答对题数
- `total` — 总题数
- `wrongCount` — 答错题数
- `xpGained` — 获得经验值
- `onContinue` — 继续下一关
- `onRetry` — 再来一次
- `onHome` — 返回首页

### useGameState.js

核心游戏状态 Hook，返回：

| 属性/方法 | 类型 | 说明 |
|-----------|------|------|
| `hearts` | number | 当前体力 |
| `maxHearts` | number | 最大体力（5） |
| `xp` | number | 总经验值 |
| `gems` | number | 宝石数 |
| `streak` | number | 连胜天数 |
| `userLevel` | number | 用户等级 |
| `xpProgress` | number | 当前等级XP进度（0-100） |
| `dailyXp` | number | 今日获得XP |
| `dailyGoal` | number | 每日目标XP（20） |
| `completedLevels` | object | 已通关记录 |
| `sectionProgress` | object | 各模块解锁进度 |
| `loseHeart()` | function | 扣1颗体力 |
| `completeLevel(section, levelId, score, total, wrongCount)` | function | 通关记录 |
| `refillHearts()` | function | 花30宝石补满体力 |
| `isLevelUnlocked(section, levelId)` | function | 检查关卡是否解锁 |
| `getLevelStars(section, levelId)` | function | 获取关卡星级 |

## 扩展指南

### 添加新单词关卡

在 `src/data/vocabulary.js` 的 `vocabularyLevels` 数组末尾添加：

```js
{
  id: 11,                              // 递增ID
  title: "PETS-3核心 · 第十一关",
  description: "高级词汇",
  icon: "🎓",
  color: "#58cc02",
  words: [
    { en: "achieve", cn: "实现", phonetic: "/əˈtʃiːv/",
      example: "She achieved her goal.", exampleCn: "她实现了目标。" }
  ]
}
```

同时更新 `useGameState.js` 中的 `sectionLevels` 映射的 `vocabulary` 数量。

### 添加新语法关卡

在 `src/data/grammar.js` 添加，包含 `lesson`（讲解）、`examples`（例句）、`quiz`（选择题）。

### 添加新阅读关卡

在 `src/data/reading.js` 添加，包含 `passage`（英文）、`passageCn`（翻译）、`questions`（题目）。

### 添加新真题关卡

在 `src/data/exam.js` 添加，支持 `type: "grammar"` / `"reading"` / `"cloze"` 三种题型。

### 添加新模块

1. 在 `src/data/` 创建新数据文件
2. 在 `App.jsx` 的 `SECTION_DATA` 中注册
3. 在 `Home.jsx` 的 `SECTIONS` 数组中添加卡片配置
4. 在 `PathMap.jsx` 的 `sectionConfig` 中添加颜色和图标
5. 在 `useGameState.js` 的 `sectionProgress` 和 `sectionLevels` 中添加新模块
6. 如需专用答题界面，在 `components/` 创建新组件并在 `App.jsx` 中条件渲染

## 已知问题与修复记录

### v1.0 修复（2026-07-12）

| 问题 | 原因 | 修复 |
|------|------|------|
| 页面导航后空白 | framer-motion AnimatePresence mode="wait" 退出动画未完成 | 移除 AnimatePresence，改用条件渲染 |
| VocabLesson 星级计算错误 | 学习阶段"还不熟"按钮误增 wrongCount | 分离 quizWrongCount / quizCorrectCount |
| ResultScreen 参数不匹配 | App.jsx 传 score，组件期望 correctCount + xpGained | 修正 props 名称 |
| Header 遮挡内容 | pt-16 不足覆盖 fixed header 高度 | 改为 pt-20 |
| 包体积过大 | framer-motion 未使用但仍打包 | 移除所有 framer-motion 导入，413KB→286KB |

### 可优化项

- framer-motion 仍在 package.json 中，可 `npm uninstall framer-motion` 清理
- App.css 为 Vite 模板残留，未使用可删除
- assets/ 目录为 Vite 模板残留，未使用可删除
- 可添加听力模块（PETS-3听力占30%）
- 可添加写作模块（PETS-3写作占25%）
- 路径地图可改用 CSS Grid 实现更精确的 Z 字型布局
