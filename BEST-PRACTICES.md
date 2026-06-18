# 最佳实践 — 用这套配置快速做出成熟软件

> 这份文档教你**怎么用**这套 AI 开发团队配置，从零到上线做出质量过关的软件。
>
> 读法：先读「主线」掌握一条龙流程，再按「分叉」处理你遇到的具体情况，最后看「实战剧本」把两者串起来。

---

## 0. 30 秒理解它

**一句话**：你负责想清楚"要什么"，AI 团队负责"怎么做"。

**心智模型 —— 命令就是颗粒度旋钮**：

```
粗 ───────────────────────────────────────────► 细
/dev          /review-all      /check          /fix
整个功能       合并前全面审查    写完快检         定点修一处
走完整流程     跨文件分析        自动修           不走流程
```

你说话的颗粒度，决定 AI 走多重的流程。想做功能就 `/dev`，想修一行就 `/fix`，不用每次都走全套。

**两个隐形帮手**（你不用管，AI 自动用）：
- **安全 hooks**：每次写代码前自动扫注入/XSS/硬编码密钥，危险 Bash 命令直接拦
- **会话记忆**：`workspace/journal.md` 记录做过什么，新会话自动续上下文

---

## 1. 主线：从零到上线的一条龙

这是骨架。一个功能从想法到上线，标准路径就这 7 步：

```
 ① 装配置 → ② 定方向 → ③ /dev 开发 → ④ /check → ⑤ /review-all → ⑥ /ship → ⑦ /standup
    │           │            │            │            │              │           │
  选预设     CLAUDE.md     Phase 0-4    写完快检     合并前审查      发布门禁    效能复盘
  /语言      preview/     需求→代码     自动修       跨文件一致性    回滚检查    越用越准
```

> 注意：③ 的 `/dev` 内部其实**已经自动包含**了 ④`/check` 和 ⑤`/review-all`（见下方 Phase 2）。
> 所以日常你大多数时候只需要 **`/dev` → `/ship`** 两步。④⑤ 是你想手动补查时单独用的。

### ① 装配置

```bash
cd 你的项目

# Web 全栈（React + Node + TS）
npx create-claude-team init

# AI 应用 — Python 路线（RAG/Agent，数据后端）
npx create-claude-team init --preset ai-app

# AI 应用 — TypeScript 路线（Vercel AI SDK，你已有 web 栈时选这个）
npx create-claude-team init --preset ai-app --lang typescript
```

装完在 Claude Code 里输入 `/mcp` 确认 MCP 已加载。以后升级配置用 `npx create-claude-team update`（保留你的 settings 和 workspace）。

### ② 定方向（只做一次，但很关键）

AI 不是读心术。开工前把"项目级约定"写进 `.claude/CLAUDE.md` 末尾或一个 `spec.md`：

- **技术栈**：框架、数据库、部署目标（不写默认按预设走）
- **设计方向**（有 UI 时必填）：风格、主色、目标用户。例：`Apple 风格白底简约，黑白灰主色，面向 18-35 岁`
- **业务约束**：合规、性能阈值、第三方依赖

> **有设计稿就放 `preview/` 目录**（HTML 原型 / 截图 / Figma 链接）。它是设计的**最高权威**，AI 写 UI 前必读，优先级高于一切文字描述。

### ③ `/dev` —— 主力命令，一句需求进，可运行代码出

```
/dev 做一个用户注册登录功能，支持邮箱+密码，登录后发 JWT
```

AI 会自动走 5 个阶段（你只在关键点确认）：

| 阶段 | AI 做什么 | 你做什么 |
|------|-----------|----------|
| **Phase 0 需求确认** | 问你 3 个问题（解决什么问题/技术约束/验收标准），输出一句话摘要 | 答问题，说"确认" |
| **Phase 1 复杂度判断** | 判定 S/M/L/XL，输出 checklist（M）或 spec+tasks（L/XL） | 确认方案 |
| **Phase 2 迭代开发** | TDD 写代码 → 自动 `/check` → 每个逻辑单元 commit → 全部完成后自动 `/review-all` | 看进度 |
| **Phase 3 验收** | 跑测试 + 类型检查 + lint + git 状态 | —— |
| **Phase 4 记录指标** | 把本次效能写入 metrics.md，触发警告时提醒 | —— |

**关键**：质量检查（`/check`、`/review-all`）和安全扫描**内嵌在 Phase 2 里持续进行**，不是等最后才查。这就是"快速但成熟"的核心——边写边把关。

### ④ `/check` —— 写完一段想立刻查（可选，1 分钟）

`/dev` 内部已自动跑。你手写了代码、或想单独快检某文件时用：

```
/check                      # 查当前 git diff 的变更
/check src/auth/login.ts    # 查指定文件
```

查 3 个维度（逻辑/类型/边界），能自动修的直接修，最多 2 轮。

### ⑤ `/review-all` —— 合并前全面审查（可选，3-5 分钟）

`/dev` 在 L/XL 任务结束时自动跑。你在合并 PR 前想手动全查时用：

```
/review-all                     # 审查当前分支 vs main 的所有变更
/review-all src/features/auth/  # 审查指定目录
```

它专做单文件检查做不了的事：**跨文件一致性、变更完整性（改了接口所有调用方同步没）、历史回归、依赖关系**。

### ⑥ `/ship` —— 发布门禁

```
/ship              # 发布前全面检查
/ship --dry-run    # 只检查不部署
```

8 道关卡：集成验证 → 安全审计 → 性能 → 无障碍 → 配置 → Git 规范 → 发布决策 → 部署。**还会强制确认回滚方案**（数据库迁移可逆、旧版本可用）。M 级以上必须过 `/ship` 才发布。

### ⑦ `/standup` —— 效能复盘

```
/standup
```

读 metrics.md 和 journal.md，告诉你做到哪了 + 团队效能趋势（spec 否决轮数、check 问题数、审查打回率……）。**这是让 AI 越用越准的反馈闭环**——它会自己诊断瓶颈并建议改进。

---

## 2. 分叉：按你的情况选路径

主线是默认路径。遇到下面这些情况，从主线上"分叉"出去：

### 分叉 A：任务多大？（决定走多重的流程）

`/dev` 会自动判级，但你心里有数能配合得更好：

| 级别 | 什么样 | 流程 | 例子 |
|------|--------|------|------|
| **S** | 1-10 行，单文件 | 跳过提问直接改 → 测 → 提交 | 改 typo、调样式、改配置值 |
| **M** | 单模块，1-2 文件 | 简短 checklist → 写 → 自动 check | 加个 API 端点、加个表单字段 |
| **L** | 跨模块，3-10 文件 | spec + tasks → 逐任务迭代 → review-all | 用户认证、文件上传 |
| **XL** | 新系统，10+ 文件 | 先 Spike 调研 → spec + architecture → 全员迭代 | 支付系统、架构重构 |

> **安全敏感度升级**：碰认证/授权/加密/密钥/支付/权限的改动，哪怕只有 3 行，也至少按 M 级走（强制 Reviewer 审）。

**实操**：小事别上 `/dev` 全套。S 级直接 `/fix`，M 级才值得 `/dev`。

### 分叉 B：做哪种项目？（决定装哪个预设）

```
做 Web 产品（有界面、给人用）────────► init（web-fullstack）
做 AI 数据后端（知识库/RAG/文档处理）──► init --preset ai-app
做 AI 产品（已有 web 栈/带界面）──────► init --preset ai-app --lang typescript
```

> **AI 项目的语言怎么选**：
> - 文档解析重（乱版 PDF、表格、扫描件）→ **Python**（解析库强太多）
> - 已经会 web、想快出产品 → **TypeScript**（Vercel AI SDK，零新语言成本）
> - 混合策略：TS 为主体，单独用 Python 写文档解析服务
> - 两条路线都**默认裸 SDK，不上 LangChain**（可控、可调试优先）

### 分叉 C：只想修一个具体问题 → `/fix`

不走流程，直接修：

```
/fix src/auth/login.ts 密码验证逻辑不对
/fix 首页标题太小，改成 24px
/fix 用户列表最后一页分页报错
```

AI 会找根因（不只治表面）、修完写回归测试、发现同类问题一并指出。**不知道问题在哪？** 先 `/check` 找出来再 `/fix`。

### 分叉 D：需求自己也没想清楚

别硬写 `/dev`。直接说模糊需求，让 Phase 0 帮你理：

```
/dev 做一个管理后台
# AI 会反问：包含哪些页面？什么角色权限？数据从哪来？
```

或者先用对话探索（不带斜杠命令）：

```
帮我调研一下做实时协作编辑有哪些技术方案，各自的坑
```

想清楚了再 `/dev`。**需求否决超过 3 轮**，AI 会喊停建议先讨论——这是好事，说明该回去想清楚。

### 分叉 E：涉及 UI

1. 有设计稿 → 丢进 `preview/`（最高权威）
2. 没设计稿 → 在 spec 里声明设计方向，否则 AI 默认白底简约
3. L/XL 级 UI → Designer Agent 会做视觉审查
4. 全程遵守 `.claude/rules/design.md`（留白、60-30-10 配色、圆角一致、禁 AI 廉价感）

### 分叉 F：出问题了（异常路径）

AI 不会卡死，每种情况都有预案：

| 情况 | AI 怎么处理 | 你怎么配合 |
|------|-------------|-----------|
| 测试一直失败 | 自动修 2 轮，仍失败就列原因 | 看原因，决定方向 |
| 审查打回 | 自动修 2 轮，仍不过列问题 | 决定继续修/标 TODO 先合 |
| Spike 发现做不了 | 给原因 + 替代方案 | 换方案或放弃 |
| 需求中途变了 | 停下，重评影响范围，调 tasks | 确认新范围 |
| 发现方向错了 | 停下，给当前状态 + 建议回退点 | 决定是否回退 |

**核心原则**：AI 会自动重试有限轮数，到顶就停下来交给你决定，绝不无脑硬刚或装作没事。

---

## 3. 实战剧本（线性 + 分叉串起来）

### 剧本一：从零做一个 Web SaaS 功能

```
1. cd my-saas && npx create-claude-team init           # 分叉B：web 预设
2. 在 CLAUDE.md 写技术栈 + 设计方向，截图丢 preview/   # ② 定方向 + 分叉E
3. git checkout -b feature/task-board
4. /dev 做一个看板视图，支持拖拽任务卡片在列之间移动     # ③ 主力
   → Phase 0：AI 问"卡片数据结构？拖拽要持久化吗？"
   → 你确认 → AI 判为 L 级 → 出 spec+tasks → 你确认
   → AI 逐任务 TDD，每个任务自动 /check，逐个 commit
   → 全部完成自动 /review-all
5. /ship --dry-run                                      # ⑥ 发布门禁（先 dry-run）
   → 过了再正式 /ship
6. /standup                                             # ⑦ 复盘
```

### 剧本二：从零做一个 AI 知识库（TypeScript 路线）

```
1. npx create-claude-team init --preset ai-app --lang typescript   # 分叉B
2. docker compose up -d postgres                        # 起 pgvector
3. 配 DATABASE_URL + ANTHROPIC_API_KEY
4. /dev 做一个文档上传 + 向量检索问答的接口
   → AI 用 Vercel AI SDK + Hono + pgvector（不上 LangChain）
   → 触发 rag-pipeline / ai-agents 等技能，按 TS 示例实现
5. 文档解析遇到复杂 PDF 解析不好？                       # 分叉B 混合策略
   → /dev 单独加一个 Python 解析微服务，主体保持 TS
6. /ship
```

### 剧本三：接手已有项目改 bug

```
1. （项目已有 .claude/）直接干活
2. /standup                          # 先看 AI 记得做到哪了
3. /fix 订单详情页刷新后金额显示错误   # 分叉C：定点修
   → AI 找根因 + 修 + 写回归测试
4. /check                            # 确认没引入新问题
5. git commit
```

---

## 4. 让 AI 越用越准（飞轮）

这套配置最值钱的地方：它有记忆和反馈，用得越久越懂你的项目。

```
/dev 完成 → 写 metrics.md ─┐
                           ├─► /standup 读取分析 → 诊断瓶颈 → 你调整 → 下次更准
会话结束 → 写 journal.md ───┘
```

**你要做的**：
- 定期 `/standup` 看趋势，别让瓶颈累积
- 项目约定固化到 `CLAUDE.md`（一次定，全程守）
- 设计稿更新及时同步 `preview/`
- 升级配置用 `update`，别手动覆盖（会丢自定义）

---

## 5. 反模式（这样用会翻车）

| ❌ 别这样 | ✅ 应该这样 |
|----------|------------|
| 所有事都 `/dev` 全套 | 小修用 `/fix`，快检用 `/check`，分清颗粒度 |
| 需求没想清就 `/dev` 硬写 | 先让 Phase 0 反问，或先对话调研 |
| 攒一大堆改动最后一次提交 | 每个逻辑单元一次 commit（AI 会自动这么做） |
| 跳过 `/ship` 直接发 | M 级以上必过 `/ship`，含回滚检查 |
| UI 全凭文字描述 | 有稿放 `preview/`，无稿先定设计方向 |
| 手动改 `.claude/` 后被 `update` 覆盖 | 项目定制写 CLAUDE.md/spec；配置升级走 `update` |
| AI 报告"做完了"就盲信 | 看 Phase 3 验收结果（测试/类型/lint 是否真过） |
| 让 AI 上 LangChain 图省事 | 默认裸 SDK，框架是例外不是默认（见 rules/llm.md） |
| 安全敏感改动当 S 级随手改 | 认证/支付/密钥类强制按 M 级走，要审查 |

---

## 6. 速查卡

### 命令一页纸

| 命令 | 何时用 | 走流程 | 自动修 |
|------|--------|--------|--------|
| `/dev <需求>` | 做功能（任意大小） | ✅ 完整 | ✅ |
| `/fix <文件/问题>` | 修已知的具体问题 | ❌ | ✅ |
| `/check [路径]` | 写完快检 | ❌ 轻量 | ✅ |
| `/review-all [路径]` | 合并前跨文件审查 | ❌ | ✅ |
| `/ship [--dry-run]` | 发布门禁 | ✅ | 部分 |
| `/standup` | 看进度 + 效能 | ❌ | —— |

### 决策树

```
我要做什么？
├─ 做新功能 ─────────────► /dev（不确定需求就让它先问）
├─ 修个具体 bug ────────► /fix（不知道在哪先 /check）
├─ 写完想查一下 ────────► /check
├─ 准备合并 PR ─────────► /review-all → /ship
├─ 准备上线 ────────────► /ship
└─ 想知道做到哪了 ──────► /standup
```

### 安装速查

```bash
npx create-claude-team init                                       # Web 全栈
npx create-claude-team init --preset ai-app            # AI / Python
npx create-claude-team init --preset ai-app --lang typescript  # AI / TS
npx create-claude-team update                                     # 升级配置
```

---

> 更多：[README.md](README.md) 总览 · [USAGE.md](USAGE.md) 完整功能 · [CHANGELOG.md](CHANGELOG.md) 版本历史 · `.claude/CLAUDE.md` 工作流定义
